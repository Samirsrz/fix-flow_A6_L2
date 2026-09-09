import { z } from "zod";

const createInvoiceZodSchema = z.object({
  body: z.object({
    period: z.string().min(1, "Period is required"),
    dueDate: z.string(), // or z.string().datetime() if you want strict ISO validation
    amount: z.number().positive("Amount must be positive"),
    residentId: z.string().uuid().optional(),
  }),
});

export const InvoiceValidation = {
  createInvoiceZodSchema,
};