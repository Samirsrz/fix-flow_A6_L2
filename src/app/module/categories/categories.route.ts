import { Router } from "express";
import { auth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";
import { CategoriesController } from "./categories.controller";


const router = Router()

router.post("/",auth(Role.ADMIN),CategoriesController.createCategory)

router.get("/",auth(),CategoriesController.getAllCategories)

export const CategoryRoutes=router