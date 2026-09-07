import { Router } from "express";
import { AdminController } from "./admin.controller";
import { auth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";
import { validateRequest } from "../../middleware/validateRequest";
import { AdminValidation } from "./admin.validation";

const router = Router()

router.post("/create-role-users",auth(Role.ADMIN),AdminController.createRoleUsers) 
router.get("/users",auth(Role.ADMIN),AdminController.getAllUsers) 
router.patch("/user/:id",auth(Role.ADMIN),validateRequest(AdminValidation.updateUserStatusZodSchema),AdminController.updateUserById) 


export const AdminRoutes = router