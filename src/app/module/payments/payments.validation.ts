
import z from "zod"

const initiatePaymentZodSchema = z.object({
  body: z.object({
    invoiceId: z.string().uuid("Invalid invoice ID"),
  }),
});


export const PaymentValidation = {
    initiatePaymentZodSchema
}