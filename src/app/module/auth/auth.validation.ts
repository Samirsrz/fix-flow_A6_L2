import { z } from "zod"

const registerResidentZodSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    communityId: z.string().uuid("Invalid community ID"),
    unitNumber: z.string().optional(),
  }),
})

const resendOtpZodSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email"),
  }),
})

const verifyOtpZodSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email"),
    otp: z.string().length(6, "OTP must be 6 digits"),
  }),
})

const loginZodSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email"),
    password: z.string().min(1, "Password is required"),
  }),
})

const forgotPasswordZodSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email"),
  }),
})

const resetPasswordZodSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email"),
    otp: z.string().length(6, "OTP must be 6 digits"),
    newPassword: z.string().min(6, "Password must be at least 6 characters"),
  }),
})

export const AuthValidation = {
  registerResidentZodSchema,
  resendOtpZodSchema,
  verifyOtpZodSchema,
  loginZodSchema,
  forgotPasswordZodSchema,
  resetPasswordZodSchema,
}