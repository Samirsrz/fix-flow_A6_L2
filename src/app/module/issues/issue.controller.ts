import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { IIssueQuery } from "./issue.interface";
import { IssueService } from "./issue.service";
import httpStatus from "http-status"

const createIssue = catchAsync(async (req, res) => {
  const result = await IssueService.createIssueDB(
    req.body,
    req.files as Express.Multer.File[] | undefined,
    req.user!.userId,
  );

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Issue reported successfully",
    data: result,
  });
});




const getAllIssues = catchAsync(async (req, res) => {
  const query = req.query as unknown as IIssueQuery;
  const role = req.user!.role;
  const userId = req.user!.userId;

  const result = await IssueService.getAllIssuesDB(query, role, userId);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Issues fetched successfully",
    data: result,
  });
});



const getIssueById = catchAsync(async (req, res) => {
  
  const {id} = req.params;
  const result = await IssueService.getIssueByIdDB(id as string , req.user!);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Issue fetched successfully",
    data: result,
  });
}); 


const updateIssueStatus = catchAsync(async (req, res) => {
  
  const {id} = req.params;
  
  const result = await IssueService.updateIssueStatusDB(id as string ,req.body, req.user!);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Updated this issue successfully",
    data: result,
  });
}); 





export const IssueController = {
    createIssue,
    getAllIssues,
    getIssueById,
    updateIssueStatus
}