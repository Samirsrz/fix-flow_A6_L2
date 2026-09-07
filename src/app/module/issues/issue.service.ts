import { prisma } from "../../lib/prisma"
import { AppError } from "../../utils/AppError"
import httpStatus from "http-status"
import { uploadToCloudinary } from "../../utils/uploadToCloudinary"
import { ICreateIssuePayload, IIssueQuery } from "./issue.interface"
import { Prisma, Role } from "../../../generated/prisma/client"

const createIssueDB = async(payload:ICreateIssuePayload, files:Express.Multer.File[]|undefined, callerUserId:string)=>{
      
    // console.log("callerUserId received:", callerUserId);
  const resident = await prisma.resident.findUnique({
     where:{userId: callerUserId}
  })
  if(!resident){
    throw new AppError(httpStatus.FORBIDDEN,"Resident profile not found")
  }
  
  const category = await prisma.category.findUnique({
    where:{id: payload.categoryId}
  })
  if(!category){
    throw new AppError(httpStatus.BAD_REQUEST,"Category not found")
  }

  let imageUrls: string[] = []
  
  if(files && files.length>0){
    imageUrls = await Promise.all(
        files.map((file)=> uploadToCloudinary(file.buffer,"fixflow/issues"))
    )
  }
    const result = await prisma.issue.create({
    data: {
      residentId: resident.id,
      communityId: resident.communityId,
      categoryId: payload.categoryId,
      title: payload.title,
      description: payload.description,
      location: payload.location,
      images: imageUrls,
      status: "REPORTED",
    },
  });

  return result;

 
}

const getAllIssuesDB = async (
  query: IIssueQuery,
  role: Role,
  callerUserId: string,
) => {
  const limit = query.limit ? Number(query.limit) : 5;
  const page = query.page ? Number(query.page) : 1;
  const skip = (page - 1) * limit;
  const sortBy = query.sortBy ? query.sortBy : "createdAt";
  const sortOrder = query.sortOrder ? query.sortOrder : "desc";

  const andConditions: Prisma.IssueWhereInput[] = [];

  if (query.searchTerm) {
    andConditions.push({
      OR: [
        { title: { contains: query.searchTerm, mode: "insensitive" } },
        { description: { contains: query.searchTerm, mode: "insensitive" } },
        { location: { contains: query.searchTerm, mode: "insensitive" } },
      ],
    });
  }

  if (query.status) {
    andConditions.push({ status: query.status });
  }

  if (query.priority) {
    andConditions.push({ priority: query.priority });
  }

  if (query.categoryId) {
    andConditions.push({ categoryId: query.categoryId });
  }

  // forced role scoping — never trust query params for this part
  if (role === Role.RESIDENT) {
    const resident = await prisma.resident.findUnique({ where: { userId: callerUserId } });
    if (!resident) {
      throw new AppError(httpStatus.FORBIDDEN, "Resident profile not found");
    }
    andConditions.push({ residentId: resident.id });

  } else if (role === Role.WORKER) {
    const worker = await prisma.worker.findUnique({ where: { userId: callerUserId } });
    if (!worker) {
      throw new AppError(httpStatus.FORBIDDEN, "Worker profile not found");
    }
    andConditions.push({ assignedWorkerId: worker.id });
  } 
  
  else if (role === Role.MANAGER) {
    const manager = await prisma.manager.findUnique({ where: { userId: callerUserId } });
    if (!manager) {
      throw new AppError(httpStatus.FORBIDDEN, "Manager profile not found");
    }
    andConditions.push({ communityId: manager.communityId });
  }
  // ADMIN → no forced condition

  const whereClause: Prisma.IssueWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const issues = await prisma.issue.findMany({
    where: whereClause,
    take: limit,
    skip: skip,
    orderBy: { [sortBy]: sortOrder },
    include: {
      resident: 
      { 
        include: 
        { user: 
            { select: 
                { name: true, email: true } 
            }
         } 
        },
      assignedWorker: { include: { user: { select: { name: true, email: true } } } },
      category: true,
    },
  });

  const totalIssueCount = await prisma.issue.count({ where: whereClause });

  return {
    data: issues,
    meta: {
      page,
      limit,
      total: totalIssueCount,
      totalPages: Math.ceil(totalIssueCount / limit),
    },
  };
};



const getIssueByIdDB = async (issueId: string, user: { userId: string; role: Role }) => {
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    include: {
      resident: { include: { user: { select: { name: true, email: true } } } },
      assignedWorker: { include: { user: { select: { name: true, email: true } } } },
      category: true,
    },
  });

  if (!issue) {
    throw new AppError(httpStatus.NOT_FOUND, "Issue Not Found");
  }

  if (user.role === "MANAGER") {
    const manager = await prisma.manager.findUnique({
      where: { userId: user.userId },
    });
    if (!manager || manager.communityId !== issue.communityId) {
      throw new AppError(httpStatus.FORBIDDEN, "You don't have the permission");
    }
  }

  if (user.role === "RESIDENT") {
    const resident = await prisma.resident.findUnique({
      where: { userId: user.userId },
    });
    if (!resident || resident.id !== issue.residentId) {
      throw new AppError(httpStatus.FORBIDDEN, "You don't have the permission");
    }
  }

  if (user.role === "WORKER") {
    const worker = await prisma.worker.findUnique({
      where: { userId: user.userId },
    });
    if (!worker || worker.id !== issue.assignedWorkerId) {
      throw new AppError(httpStatus.FORBIDDEN, "You don't have the permission");
    }
  }

  return issue;
};





export const IssueService = {
    createIssueDB,
    getAllIssuesDB,
    getIssueByIdDB

}