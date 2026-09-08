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



export interface IUpdateIssueStatusPayload {
  status: IssueStatus;
  priority?: Priority;
  assignedWorkerId?: string;
}


export interface ICreateWorkerUpdatePayload {
  note?: string;
  materials?: string;
}