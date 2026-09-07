import z from "zod"

const createIssueZodSchema = z.object({
  body: z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().min(1, "Description is required"),
    location: z.string().optional(),
    categoryId: z.string().uuid("Invalid category ID"),
  }),
});


export const IssueValidation = {
    createIssueZodSchema
}