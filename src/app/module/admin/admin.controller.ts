import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status"
import { AdminService } from "./admin.service";

const createRoleUsers = catchAsync(async (req, res) => {

    const payload = req.body;
    const result = await AdminService.createRoleUsersDB(payload)
    
  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Profile created successfully",
    data: result,
  });
});


const getAllUsers = catchAsync(async (req, res) => {

    const query = req.query
    const result = await AdminService.getAllUsersDB(query)


    sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Users fetched successfully",
    data: result,
  });

})


const updateUserById = catchAsync(async (req, res) => {
   
    const {id} = req.params;
    const payload =req.body;
    const adminUser  = req.user;

    const result = await AdminService.updateUserByIdDB(payload,id as string, adminUser)

    sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "User status updated successfully",
    data: result,
  });

})

const deleteUserById = catchAsync(async (req, res) => {
   
    const {id} = req.params;
    const payload =req.body;
    const adminUser  = req.user;

    const result = await AdminService.deleteUserByIdDB(id as string,adminUser)

    sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "User deleted successfully",
    data: result,
  });

})

export const AdminController = {
    createRoleUsers,
    getAllUsers,
    updateUserById,
    deleteUserById
}
