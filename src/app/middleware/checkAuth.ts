import type { NextFunction, Request, Response } from "express";
import type { JwtPayload } from "jsonwebtoken";
import type { Role } from "../../generated/prisma/enums";
import config from "../config";
import { prisma } from "../lib/prisma";
import { catchAsync } from "../utils/catchAsync";
import { jwtUtils } from "../utils/jwt";
import { AppError } from "../utils/AppError";
import { ACCESS_COOKIE } from "../utils/authCookies";
import httpStatus from "http-status";
declare global {
	namespace Express {
		interface Request {
			user?: {
				email: string;
				name: string;
				userId: string;
				role: Role;
			};
		}
	}
}

// auth(Role.ADMIN, Role.USER, Role.Author)
// auth() => ...requiredRoles => [Role.ADMIN, Role.USER, Role.AUTHOR]


export const auth = (...requiredRoles: Role[]) => {
	
	return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
		const bearer = req.headers.authorization?.startsWith("Bearer ")
			? req.headers.authorization.split(" ")[1]
			: undefined;
		const token = bearer ?? req.cookies[ACCESS_COOKIE] ?? req.headers.authorization;

		if (!token) {
			throw new AppError(httpStatus.UNAUTHORIZED, "You are not logged in. Please log in to access this resource.");
		}

		const verifiedToken = jwtUtils.verifyToken(token, config.jwt_access_secret);
		if (!verifiedToken.success) {
			throw new AppError(httpStatus.UNAUTHORIZED, "Invalid or expired token. Please log in again.");
		}

		const { userId } = verifiedToken.data as JwtPayload;

		const user = await prisma.user.findUnique({ where: { id: userId } });
		if (!user || user.isDeleted) {
			throw new AppError(httpStatus.UNAUTHORIZED, "User not found. Please log in again.");
		}
		if (user.status === "BANNED") {
			throw new AppError(httpStatus.FORBIDDEN, "Your account has been blocked. Please contact support.");
		}
		if (requiredRoles.length && !requiredRoles.includes(user.role)) {
			throw new AppError(httpStatus.FORBIDDEN, "Forbidden. You don't have permission to access this resource.");
		}

		req.user = { email: user.email, name: user.name, userId: user.id, role: user.role };
		next();
	});
};