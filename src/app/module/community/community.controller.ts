import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";
import { CommunityService } from "./community.service";

const createCommunity = catchAsync(async (req: Request, res: Response) => {
  const result = await CommunityService.createCommunityDB(req.body);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Community created successfully",
    data: result,
  });
});

const getCommunity = catchAsync(async (req: Request, res: Response) => {
  const result = await CommunityService.getCommunityDB(
    req.query,
    req.user!.role,
    req.user!.userId,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Communities fetched successfully",
    data: result,
  });
});



const getCommunityById = catchAsync(async (req: Request, res: Response) => {

   const {id}  = req.params;
   const user = req.user!;

   const result = await CommunityService.getCommunityByIdDB(id as string, user)

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Community fetched successfully",
    data: result,
  });

})

export const CommunityController = {
  createCommunity,
  getCommunity,
  getCommunityById
};