import { prisma } from "../../lib/prisma"
import { AppError } from "../../utils/AppError"
import httpStatus from "http-status"
import { uploadToCloudinary } from "../../utils/uploadToCloudinary"
import { ICreateIssuePayload, IIssueQuery, IUpdateIssueStatusPayload } from "./issue.interface"
import { IssueStatus, Prisma, Role } from "../../../generated/prisma/client"
import { createAuditLog } from "../../utils/createAuditLog"

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



const updateIssueStatusDB = async (
  issueId: string,
  payload: IUpdateIssueStatusPayload,
  user: { userId: string; role: Role },
) => {
  const issue = await prisma.issue.findUnique({ where: { id: issueId } });
  if (!issue) {
    throw new AppError(httpStatus.NOT_FOUND, "Issue not found");
  }

  const { status: newStatus, priority, assignedWorkerId } = payload;
  const currentStatus = issue.status;

  let updateData: Prisma.IssueUpdateInput = {};

  if (user.role === Role.MANAGER) {
    const manager = await prisma.manager.findUnique({ where: { userId: user.userId } });
    if (!manager || manager.communityId !== issue.communityId) {
      throw new AppError(httpStatus.FORBIDDEN, "You don't have permission over this issue");
    }

    const managerAllowedFrom: IssueStatus[] = ["REPORTED", "UNDER_REVIEW", "DISPUTED"];
    if (!managerAllowedFrom.includes(currentStatus)) {
      throw new AppError(httpStatus.BAD_REQUEST, `Cannot transition from ${currentStatus} as a Manager`);
    }

    if (newStatus === "ASSIGNED") {
      if (!priority || !assignedWorkerId) {
        throw new AppError(httpStatus.BAD_REQUEST, "priority and assignedWorkerId are required to assign an issue");
      }

      const worker = await prisma.worker.findUnique({ where: { id: assignedWorkerId } });
      if (!worker) {
        throw new AppError(httpStatus.BAD_REQUEST, "Worker not found");
      }

      updateData = { status: "ASSIGNED", priority, assignedWorker: { connect: { id: assignedWorkerId } } };
    } else if (newStatus === "REJECTED" && currentStatus === "REPORTED") {
      updateData = { status: "REJECTED" };
    } else {
      throw new AppError(httpStatus.BAD_REQUEST, `Manager cannot move from ${currentStatus} to ${newStatus}`);
    }
  } 
  
  else if (user.role === Role.WORKER) {
    const worker = await prisma.worker.findUnique({ where: { userId: user.userId } });
    if (!worker || worker.id !== issue.assignedWorkerId) {
      throw new AppError(httpStatus.FORBIDDEN, "This issue is not assigned to you");
    }

    if (currentStatus === "ASSIGNED" && newStatus === "IN_PROGRESS") {
      updateData = { status: "IN_PROGRESS" };
    } else if (currentStatus === "IN_PROGRESS" && newStatus === "PENDING_CONFIRMATION") {
      updateData = { status: "PENDING_CONFIRMATION" };
    } else {
      throw new AppError(httpStatus.BAD_REQUEST, `Worker cannot move from ${currentStatus} to ${newStatus}`);
    }
  } 
  
  else if (user.role === Role.ADMIN) {
    if (currentStatus !== "DISPUTED") {
      throw new AppError(httpStatus.BAD_REQUEST, "Admin can only resolve DISPUTED issues here");
    }

    if (newStatus === "ASSIGNED") {
      if (!priority || !assignedWorkerId) {
        throw new AppError(httpStatus.BAD_REQUEST, "priority and assignedWorkerId are required to reassign a disputed issue");
      }
      updateData = { status: "ASSIGNED", priority, assignedWorker: { connect: { id: assignedWorkerId } } };
    } else if (newStatus === "CLOSED") {
      updateData = { status: "CLOSED" };
    } else {
      throw new AppError(httpStatus.BAD_REQUEST, "Admin can only resolve a dispute to ASSIGNED or CLOSED");
    }
  }
  
  else {
    throw new AppError(httpStatus.FORBIDDEN, "You don't have permission to change issue status");
  }

  const updatedIssue = await prisma.issue.update({
    where: { id: issueId },
    data: updateData,
  });

  await createAuditLog(
    user.userId,
    "ISSUE_STATUS_CHANGE",
    "Issue",
    issue.id,
    { from: currentStatus, to: updatedIssue.status },
  );

  return updatedIssue;
};










export const IssueService = {
    createIssueDB,
    getAllIssuesDB,
    getIssueByIdDB,
    updateIssueStatusDB

}