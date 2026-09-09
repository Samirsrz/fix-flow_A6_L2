import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import httpStatus from "http-status";

import { InvoiceService } from "./invoices.service";
import { IGetInvoicesQuery } from "./invoices.interface";

const createInvoice = catchAsync(async (req, res) => {
  const result = await InvoiceService.createInvoiceDB(req.body, req.user!);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.CREATED,
    message: "Invoice(s) created successfully",
    data: result,
  });
});

const getInvoices = catchAsync(async (req, res) => {
  const query = req.query as unknown as IGetInvoicesQuery;

  const result = await InvoiceService.getInvoicesForManagerDB(query, req.user!);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Invoices fetched successfully",
    data: result,
  });
});

const getInvoiceById = catchAsync(async (req, res) => {
  const { id } = req.params;

  const result = await InvoiceService.getInvoicesForManagerBy_Id_DB(id as string, req.user!);

  sendResponse(res, {
    success: true,
    statusCode: httpStatus.OK,
    message: "Invoice fetched successfully",
    data: result,
  });
});

export const InvoiceController = {
  createInvoice,
  getInvoices,
  getInvoiceById,
};