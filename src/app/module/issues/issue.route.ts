import { Router } from "express";
import { auth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";
import { upload } from "../../lib/multer";
import { validateRequest } from "../../middleware/validateRequest";
import { IssueValidation } from "./issue.validation";
import { IssueController } from "./issue.controller";


const router = Router()

router.post("/",auth(Role.RESIDENT),upload.array("images", 5),validateRequest(IssueValidation.createIssueZodSchema),IssueController.createIssue,
)

router.get("/", auth(Role.RESIDENT, Role.MANAGER, Role.WORKER, Role.ADMIN), IssueController.getAllIssues)
export const IssueRoutes = router