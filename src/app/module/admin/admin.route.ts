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


router.delete("/user/:id", auth(Role.ADMIN), AdminController.deleteUserById)


router.get("/dashboard-stats", auth(Role.ADMIN), AdminController.getDashboardStats)
export const AdminRoutes = router