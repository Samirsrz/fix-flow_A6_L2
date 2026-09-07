import { z } from "zod";
import { UserStatus } from "../../../generated/prisma/enums";


const updateUserStatusZodSchema = z.object({
  body: z.object({
    status: z.enum([UserStatus.ACTIVE, UserStatus.BANNED]),
  }),
});

export const AdminValidation = {
    updateUserStatusZodSchema
}