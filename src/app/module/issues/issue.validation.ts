import z from "zod"
import { IssueStatus, Priority } from "../../../generated/prisma/enums";

const createIssueZodSchema = z.object({
  body: z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().min(1, "Description is required"),
    location: z.string().optional(),
    categoryId: z.string().uuid("Invalid category ID"),
  }),
});

const updateIssueStatusZodSchema = z.object({
  body: z.object({
    status: z.enum([
      IssueStatus.UNDER_REVIEW,
      IssueStatus.ASSIGNED,
      IssueStatus.IN_PROGRESS,
      IssueStatus.PENDING_CONFIRMATION,
      IssueStatus.CLOSED,
      IssueStatus.REJECTED,
      IssueStatus.DISPUTED,
    ]),
    priority: z.enum([Priority.LOW, Priority.MEDIUM, Priority.HIGH, Priority.URGENT]).optional(),
    assignedWorkerId: z.string().uuid().optional(),
  }),
});



const createWorkerUpdateZodSchema = z.object({
  body: z.object({
    note: z.string().optional(),
    materials: z.string().optional(),
  }),
});



const issueResolutionZodSchema = z.object({
  body: z.object({
    action: z.enum(["CONFIRM", "DISPUTE"]),
    rating: z.number().int().min(1).max(5).optional(),
    comment: z.string().optional(),
  }),
});



export const IssueValidation = {
  createIssueZodSchema,
  updateIssueStatusZodSchema,
  createWorkerUpdateZodSchema,
  issueResolutionZodSchema
};