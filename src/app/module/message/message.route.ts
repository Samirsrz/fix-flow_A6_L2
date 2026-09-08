import { Router } from "express"
import { auth } from "../../middleware/checkAuth"
import { validateRequest } from "../../middleware/validateRequest"
import { createMessageZodSchema } from "./message.validation"
import { MessageController } from "./message.controller"
import { Role } from "../../../generated/prisma/enums"

const router = Router()


router.post(
  "/:id/send",
  auth(Role.RESIDENT, Role.WORKER),
  validateRequest(createMessageZodSchema),
  MessageController.createMessage,
)


router.get(
  "/:id/get",
  auth(Role.RESIDENT, Role.WORKER),
  MessageController.getMessagesForIssue,
)

export const MesssageRoutes = router