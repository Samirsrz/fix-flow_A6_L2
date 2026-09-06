import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status"
import { CategoriesService } from "./categories.service";

const createCategory = catchAsync(async (req, res) => {
 
    const payload = req.body;
    const result = await CategoriesService.createCategoryDB(payload)

   sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Category created successfully",
    data: result,
  });
});

const getAllCategories= catchAsync(async (req, res) => {
 
   
    const result = await CategoriesService.getAllCategoriesDB()

   sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Categories fetched successfully",
    data: result,
  });
});


export const CategoriesController ={
    createCategory,
    getAllCategories
}