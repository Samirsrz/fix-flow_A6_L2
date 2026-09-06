import { Router } from "express";
import { CommunityController } from "./community.controller";
import { auth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";

const router = Router()

router.post("/",auth(Role.ADMIN),CommunityController.createCommunity)

router.get("/", auth(Role.ADMIN, Role.MANAGER), CommunityController.getCommunity)

router.get("/:id", auth(Role.ADMIN, Role.MANAGER), CommunityController.getCommunityById)


export const CommunityRoutes = router