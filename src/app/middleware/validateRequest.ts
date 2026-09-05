import { NextFunction, Request, Response } from "express";
import { catchAsync } from "../utils/catchAsync";
import { AppError } from "../utils/AppError";
import z from "zod"
import httpStatus from "http-status"
export const validateRequest = (zodSchema: z.ZodObject) => {
	return catchAsync((req: Request, res: Response, next: NextFunction) => {
		const result = zodSchema.safeParse({
			body: req.body,
			params: req.params,
			query: req.query,
		});

		if (!result.success) {
			console.log(result.error);
			console.log(result.error.issues);

			throw new AppError(httpStatus.BAD_REQUEST, result.error.issues[0].message);
		}

		req.body = result.data.body;

		next();
	});
};