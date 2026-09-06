 import type { Role } from "../../../generated/prisma/enums"

export interface IRegisterResidentPayload {
  name: string
  email: string
  password: string
  communityId: string
  unitNumber?: string
}

export interface IResendOtpPayload {
  email: string
}

export interface IVerifyOtpPayload {
  email: string
  otp: string
}

export interface ILoginPayload {
  email: string
  password: string
}

export interface IForgotPasswordPayload {
  email: string
}

export interface IResetPasswordPayload {
  email: string
  otp: string
  newPassword: string
}

export interface IRequestUser {
  userId: string
  name: string
  email: string
  role: Role
}



export interface IUpdateMePayload {
  name?: string;
  phone?: string;
  unitNumber?: string;
  specialization?: string;
}