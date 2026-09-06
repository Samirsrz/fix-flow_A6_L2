import { Router } from "express"
import { validateRequest } from "../../middleware/validateRequest"
import { auth } from "../../middleware/checkAuth"
import { AuthController } from "./auth.controller"
import { AuthValidation } from "./auth.validation"

const router = Router()

router.post("/register", validateRequest(AuthValidation.registerResidentZodSchema), AuthController.registerResident)


router.post("/resend-otp", validateRequest(AuthValidation.resendOtpZodSchema), AuthController.resendOtp)


router.post("/verify-otp", validateRequest(AuthValidation.verifyOtpZodSchema), AuthController.verifyOtp)


router.post("/login", validateRequest(AuthValidation.loginZodSchema), AuthController.login)


router.post("/refresh-token", AuthController.refreshToken)


router.post("/logout", auth(), AuthController.logout)


router.post("/forgot-password", validateRequest(AuthValidation.forgotPasswordZodSchema), AuthController.forgotPassword)


router.post("/reset-password", validateRequest(AuthValidation.resetPasswordZodSchema), AuthController.resetPassword)


router.get("/me", auth(), AuthController.getMe);


router.patch("/me", auth(), validateRequest(AuthValidation.updateMeZodSchema), AuthController.updateMe);



export const AuthRoutes = router