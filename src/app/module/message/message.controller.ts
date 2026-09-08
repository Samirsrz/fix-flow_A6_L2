import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { MessageService } from "./message.service";
import httpStatus from "http-status"

const createMessage = catchAsync(async (req, res) => {
  const { id } = req.params;

  const result = await MessageService.createMessageForIssueDB(id as string, req.body, req.user!);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Message sent successfully",
    data: result,
  });
});




const getMessagesForIssue = catchAsync(async (req, res) => {
  const { id } = req.params;

  const result = await MessageService.getMessageForIssueDB(id as string, req.user!);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Messages fetched successfully",
    data: result,
  });
});
export const MessageController = {
    createMessage,
    getMessagesForIssue
}