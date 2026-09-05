import type { Request, Response } from "express"
import httpStatus from "http-status"
import { catchAsync } from "../../utils/catchAsync"
import { sendResponse } from "../../utils/sendResponse"
import { AuthService } from "./auth.service"

const registerResident = catchAsync(async (req: Request, res: Response) => {
  await AuthService.registerResidentDB(req.body)

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "OTP sent to your email, please verify to complete registration",
    data: null,
  })
})


const verifyOtp = catchAsync(async (req: Request, res: Response) => {
  const result = await AuthService.verifyOtpDB(req.body)
  const { accessToken, refreshToken, user } = result

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: false,
    sameSite: "none",
    maxAge: 1000 * 60 * 60 * 24,
  })
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: false,
    sameSite: "none",
    maxAge: 1000 * 60 * 60 * 24 * 7,
  })

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Email verified, registration complete",
    data: { accessToken, refreshToken, user },
  })
})



const login = catchAsync(async(req:Request, res:Response)=>{
    const result = await AuthService.loginDB(req.body)
 
    const {accessToken,refreshToken}  = result

       res.cookie("accessToken", accessToken, { httpOnly: true, secure: false, sameSite: "none", maxAge: 1000 * 60 * 60 * 24 })
  res.cookie("refreshToken", refreshToken, { httpOnly: true, secure: false, sameSite: "none", maxAge: 1000 * 60 * 60 * 24 * 7 })

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Logged in successfully",
    data: { accessToken, refreshToken },
  })

})


const refreshToken = catchAsync(async (req: Request, res: Response) => {
  if (!req.cookies.refreshToken) {
    throw new Error("Refresh token is missing")
  }

  const result = await AuthService.refreshTokenDB(req.cookies.refreshToken)
  const { accessToken, refreshToken: newRefreshToken } = result

  res.cookie("accessToken", accessToken, { httpOnly: true, secure: false, sameSite: "none", maxAge: 1000 * 60 * 60 * 24 })
  res.cookie("refreshToken", newRefreshToken, { httpOnly: true, secure: false, sameSite: "none", maxAge: 1000 * 60 * 60 * 24 * 7 })

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "New tokens generated successfully",
    data: { accessToken, refreshToken: newRefreshToken },
  })
})

const logout = catchAsync(async (req: Request, res: Response) => {
  res.clearCookie("accessToken")
  res.clearCookie("refreshToken")

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Logged out successfully",
    data: null,
  })
})

const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  await AuthService.forgotPasswordDB(req.body)

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "OTP sent to your email",
    data: null,
  })
})

const resetPassword = catchAsync(async (req: Request, res: Response) => {
  await AuthService.resetPasswordDB(req.body)

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Password reset successfully",
    data: null,
  })
})


const resendOtp = catchAsync(async (req: Request, res: Response) => {
  await AuthService.resendOtpDB(req.body)

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "OTP resent to your email",
    data: null,
  })
})



export const AuthController = {
    registerResident,
  resendOtp,
  verifyOtp,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
}