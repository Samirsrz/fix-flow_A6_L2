import type { Request, Response } from "express"
import httpStatus from "http-status"
import { catchAsync } from "../../utils/catchAsync"
import { sendResponse } from "../../utils/sendResponse"
import { AuthService } from "./auth.service"
import { AppError } from "../../utils/AppError"
import { clearAuthCookies, setAuthCookies, REFRESH_COOKIE } from "../../utils/authCookies"


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
  const { accessToken, refreshToken, user } = await AuthService.verifyOtpDB(req.body)
  setAuthCookies(res, accessToken, refreshToken)

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Email verified, registration complete",
    data: { user },
  })
})



const login = catchAsync(async (req: Request, res: Response) => {
  const { accessToken, refreshToken, user } = await AuthService.loginDB(req.body)
  setAuthCookies(res, accessToken, refreshToken)

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Logged in successfully",
    data: { user },
  })
})


const refreshToken = catchAsync(async (req: Request, res: Response) => {
  const token = req.cookies[REFRESH_COOKIE]
  if (!token) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Refresh token is missing")
  }

  const { accessToken, refreshToken: newRefreshToken } = await AuthService.refreshTokenDB(token)
  setAuthCookies(res, accessToken, newRefreshToken)

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "New tokens generated successfully",
    data: null,
  })
})

const logout = catchAsync(async (req: Request, res: Response) => {
  clearAuthCookies(res)

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



const getMe = catchAsync(async (req, res) => {
  const result = await AuthService.getMeDB(req.user!.userId);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Profile fetched successfully",
    data: result,
  });
});




const updateMe = catchAsync(async (req, res) => {
  const result = await AuthService.updateMeDB(req.user!.userId, req.user!.role, req.body);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Profile updated successfully",
    data: result,
  });
});


const googleLogin = catchAsync(async (req, res) => {
  const { accessToken, refreshToken, needsProfileCompletion } = await AuthService.googleLoginDB(req.body)
  setAuthCookies(res, accessToken, refreshToken)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Google login successful",
    data: { needsProfileCompletion },
  })
})

const completeProfile = catchAsync(async (req, res) => {
  const result = await AuthService.completeProfileDB(req.body, req.user!.userId);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Profile completed successfully",
    data: result,
  });
});








export const AuthController = {
  registerResident,
  resendOtp,
  verifyOtp,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  getMe,
  updateMe,
  googleLogin,
  completeProfile
}