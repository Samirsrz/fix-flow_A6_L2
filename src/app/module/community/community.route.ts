import { Router } from "express";
import { auth } from "../../middleware/checkAuth";
import { Role } from "../../../generated/prisma/enums";
import { CommunityController } from "./community.controller";

const router = Router();

router.post("/", auth(Role.ADMIN), CommunityController.createCommunity);

router.get("/", auth(Role.ADMIN, Role.MANAGER), CommunityController.getCommunity);

router.get("/public", CommunityController.getPublicCommunities);

router.get("/:id", auth(Role.ADMIN, Role.MANAGER), CommunityController.getCommunityById);

export const CommunityRoutes = router;