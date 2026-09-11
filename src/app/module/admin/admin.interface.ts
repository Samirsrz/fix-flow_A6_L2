import { Role, UserStatus } from "../../../generated/prisma/enums";

export interface IGetAllUsersQuery {
  searchTerm?: string;
  role?: Role;
  status?: UserStatus;
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface IGetAuditLogsQuery {
  entityType?: string;
  actorId?: string;
  page?: string;
  limit?: string;
}

export interface IUpdateUserStatusPayload {
  status: UserStatus;
}