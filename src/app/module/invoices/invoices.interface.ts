import { InvoiceStatus } from "../../../generated/prisma/enums";

export interface ICreateInvoicePayload {
  period: string;
  dueDate: string;
  amount: number;
  residentId?: string;
}



export interface IGetInvoicesQuery {
  searchTerm?: string;
  status?: InvoiceStatus;
  period?: string;
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}