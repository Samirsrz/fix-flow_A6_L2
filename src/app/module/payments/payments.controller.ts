import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { PaymentService } from "./payments.service";
import httpStatus from "http-status"



const createPaymentInitiate = catchAsync(async (req, res) => {
  const result = await PaymentService.createPaymentInitiateDB(req.body, req.user!);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Payment session created successfully",
    data: result,
  });
});


const handleStripeWebhook = catchAsync(async (req, res) => {
  const signature = req.headers["stripe-signature"] as string;

  const result = await PaymentService.handleStripeWebhookDB(req.body, signature);

  res.status(httpStatus.OK).json(result);
});



const getPaymentById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const result = await PaymentService.getPaymentByIdDB(id as string, req.user!);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Payment fetched successfully",
    data: result,
  });
});

export const PaymentController = {
    createPaymentInitiate,
    handleStripeWebhook,
    getPaymentById
}