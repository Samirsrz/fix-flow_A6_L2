import { IssueStatus, Priority } from "../../../generated/prisma/enums";

export interface ICreateIssuePayload {
  title: string;
  description: string;
  location?: string;
  categoryId: string;
}




export interface IIssueQuery {
  searchTerm?: string;
  status?: IssueStatus;
  priority?: Priority;
  categoryId?: string;
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}