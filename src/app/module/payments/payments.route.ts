import { Router } from "express";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { PaymentValidation } from "./payments.validation";
import { PaymentController } from "./payments.controller";
import { Role } from "../../../generated/prisma/enums";


const router = Router()

router.post(
  "/initiate",
  auth(Role.RESIDENT),
  validateRequest(PaymentValidation.initiatePaymentZodSchema),
  PaymentController.createPaymentInitiate,
)

router.post("/webhook", PaymentController.handleStripeWebhook)


router.get("/:id", auth(Role.RESIDENT, Role.MANAGER, Role.ADMIN), PaymentController.getPaymentById)
export const PaymentRoutes = router