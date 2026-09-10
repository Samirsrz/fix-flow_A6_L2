import Stripe from "stripe";
import { Role } from "../../../generated/prisma/enums";
import config from "../../config";
import { prisma } from "../../lib/prisma";
import { stripe } from "../../lib/stripe";
import { AppError } from "../../utils/AppError";
import httpStatus from "http-status"



const createPaymentInitiateDB = async(payload: {invoiceId:string}, user:{userId:string, role:Role})=>{
const invoice = await prisma.invoice.findUnique({
    where: { id: payload.invoiceId },
  });
  if (!invoice) {
    throw new AppError(httpStatus.NOT_FOUND, "Invoice not found");
  }

  const resident = await prisma.resident.findUnique({
    where: { userId: user.userId },
  });
  if (!resident || resident.id !== invoice.residentId) {
    throw new AppError(httpStatus.FORBIDDEN, "You don't have the permission");
  }

  if (invoice.status === "PAID") {
    throw new AppError(httpStatus.BAD_REQUEST, "This invoice is already paid");
  }

  const session = await stripe.checkout.sessions.create({
    mode:"payment",
    payment_method_types:["card"],
    line_items:[
        {
            price_data:{
                currency:"bdt",
                product_data:{name: `Maintenance Fee - ${invoice.period}`},
                unit_amount: Math.round(Number(invoice.amount)*100)
            },
            quantity:1
        }
    ],
     
    success_url: `${config.frontend_url}/payments/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${config.frontend_url}/payments/cancel`,
    metadata: { invoiceId: invoice.id },

  })    

    await prisma.payment.create({
    data: {
      invoiceId: invoice.id,
      transactionId: session.id,
      amount: invoice.amount,
      status: "PENDING",
    },
  });

   return { checkoutUrl: session.url };

}


const handleStripeWebhookDB = async (rawBody: Buffer, signature: string) => {
//   console.log("Webhook hit! rawBody type:", typeof rawBody, "isBuffer:", Buffer.isBuffer(rawBody));
//   console.log("Signature header present:", !!signature);


  let event: Stripe.Event;

 try {
    event = stripe.webhooks.constructEvent(rawBody, signature, config.stripe_webhook_secret);
} catch (error) {
    console.log("Webhook verification error:", error);
    throw new AppError(httpStatus.BAD_REQUEST, "Webhook signature verification failed");
}

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const invoiceId = session.metadata?.invoiceId;

    if (!invoiceId) {
      console.log("Webhook received with no invoiceId in metadata");
      return;
    }

    await prisma.$transaction([
      prisma.payment.updateMany({
        where: { transactionId: session.id },
        data: { status: "COMPLETED", paidAt: new Date() },
      }),
      prisma.invoice.update({
        where: { id: invoiceId },
        data: { status: "PAID" },
      }),
    ]);

    console.log("Payment completed for invoice:", invoiceId);
  }

  return { received: true };
};




const getPaymentByIdDB = async( paymentId: string,
  user: { userId: string; role: Role })=>{
  

const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      invoice: {
        include: {
          resident: {
            include: {
              user: { select: { name: true, email: true } },
            },
          },
          community: {
            include: {
              manager: {
                include: {
                  user: { select: { name: true, email: true } },
                },
              },
            },
          },
        },
      },
    },
  });
     if (!payment) {
    throw new AppError(httpStatus.NOT_FOUND, "Payment not found");
    }

  if (user.role === Role.RESIDENT) {
    const resident = await prisma.resident.findUnique({
      where: { userId: user.userId },
    });
    if (!resident || resident.id !== payment.invoice.residentId) {
      throw new AppError(httpStatus.FORBIDDEN, "You don't have the permission");
    }
     } else if (user.role === Role.MANAGER) {
    const manager = await prisma.manager.findUnique({
      where: { userId: user.userId },
    });
    if (!manager || manager.communityId !== payment.invoice.communityId) {
      throw new AppError(httpStatus.FORBIDDEN, "You don't have the permission");
    }
  }
  

    return payment;

}



export const PaymentService = {
    createPaymentInitiateDB,
    handleStripeWebhookDB,
    getPaymentByIdDB
}