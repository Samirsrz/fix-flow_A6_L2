
import z from "zod"

export const createMessageZodSchema = z.object({
  body: z.object({
    content: z.string().min(1, "Message content is required"),
  }),
});

