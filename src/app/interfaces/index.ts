export interface IQuery {
  searchTerm?: string;
  communityId?: string;
  name?: string;
  address?: string;
  city?: string;
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}