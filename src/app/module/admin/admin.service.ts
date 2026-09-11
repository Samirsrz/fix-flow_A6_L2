import bcrypt from "bcryptjs";
import { Prisma, Role } from "../../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { IGetAllUsersQuery, IGetAuditLogsQuery, IUpdateUserStatusPayload } from "./admin.interface";
import httpStatus from "http-status"
import config from "../../config";
import path  from "path"
import ejs from "ejs"
import { transporter } from "../../lib/nodeMailer";




const createRoleUsersDB = async (payload: any) => {
  const email = payload.email;
  const role = payload.role;
  const password = payload.password;

  const isUserExist = await prisma.user.findFirst({
    where: { email, isDeleted: false },
  });
  if (isUserExist) {
    throw new AppError(httpStatus.BAD_REQUEST, "User with this email already exists");
  }

  if (role === Role.MANAGER) {
    if (!payload.communityId) {
      throw new AppError(httpStatus.BAD_REQUEST, "You have to enter community ID");
    }

    const communityOfManager = await prisma.community.findUnique({
      where: { id: payload.communityId },
    });
    if (!communityOfManager) {
      throw new AppError(httpStatus.BAD_REQUEST, "This community does not exist");
    }

  const existingManager = await prisma.manager.findFirst({
  where: {
    communityId: payload.communityId,
    user: { isDeleted: false },
  },
})
if (existingManager) {
  throw new AppError(httpStatus.BAD_REQUEST, "This community already has a manager");
}

  }

  const hashedPassword = await bcrypt.hash(password, Number(config.bcrypt_salt_rounds));

  let profileRelationCreate = {};

  if (role === Role.MANAGER) {
    profileRelationCreate = {
      manager: { create: { communityId: payload.communityId, phone: payload.phone } },
    };
  } else if (role === Role.WORKER) {
    profileRelationCreate = {
      worker: { create: { phone: payload.phone, specialization: payload.specialization } },
    };
  }
  // ADMIN → no nested profile create

  const createdUser = await prisma.user.create({
    data: {
      name: payload.name,
      email,
      password: hashedPassword,
      role,
      emailVerified: true,
      ...profileRelationCreate,
    },
    include: { manager: true, worker: true },
    omit: { password: true },
  });

  const templatePath = path.join(process.cwd(), "src/app/templates/adminCreatedAccount.ejs");
  const html = await ejs.renderFile(
    templatePath,
    { name: createdUser.name, email, password, role },
    { cache: false },
  );

  await transporter.sendMail({
    from: config.smtp_user,
    to: email,
    subject: "Your FixFlow Account Has Been Created",
    html,
  });

  console.log("createRoleUsers: account created for", createdUser.email);

  return createdUser;
};



const getAllUsersDB = async (query: IGetAllUsersQuery) => {
  const limit = query.limit ? Number(query.limit) : 5;
  const page = query.page ? Number(query.page) : 1;
  const skip = (page - 1) * limit;
  const sortBy = query.sortBy ? query.sortBy : "createdAt";
  const sortOrder = query.sortOrder ? query.sortOrder : "desc";

  const andConditions: Prisma.UserWhereInput[] = [];

  if (query.searchTerm) {
    andConditions.push({
      OR: [
        { name: { contains: query.searchTerm, mode: "insensitive" } },
        { email: { contains: query.searchTerm, mode: "insensitive" } },
      ],
    });
  }

  if (query.role) {
    andConditions.push({ role: query.role });
  }

  if (query.status) {
    andConditions.push({ status: query.status });
  }

  // always exclude soft-deleted users from the default admin list
  andConditions.push({ isDeleted: false });

  const whereClause = andConditions.length > 0 ? { AND: andConditions } : {};

  const users = await prisma.user.findMany({
    where: whereClause,
    take: limit,
    skip: skip,
    orderBy: { [sortBy]: sortOrder },
    include: { resident: true, manager: true, worker: true },
    omit: { password: true },
  });

  const totalUserCount = await prisma.user.count({
    where: whereClause,
  });

  return {
    data: users,
    meta: {
      page,
      limit,
      total: totalUserCount,
      totalPages: Math.ceil(totalUserCount / limit),
    },
  };
};



const updateUserByIdDB = async( payload: IUpdateUserStatusPayload,
  userId: string,
  adminUser: any)=>{
   
   if (!payload.status) {
    throw new AppError(httpStatus.BAD_REQUEST, "Status is required");
   }

    const isUserExist = await prisma.user.findUnique({
      where:{
        id:userId
      }
    })
    if(!isUserExist || isUserExist.isDeleted){
      throw new AppError(httpStatus.NOT_FOUND,"User not found")
    } 
    
  if (userId === adminUser.userId) {
    throw new AppError(httpStatus.BAD_REQUEST, "You can't modify your own admin account");
  }
    const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { status: payload.status },
    omit: { password: true },
    })

    return updatedUser
}



const deleteUserByIdDB = async (userId: string, adminUser: { userId: string; role: Role }) => {
  const isUserExist = await prisma.user.findUnique({
    where: { id: userId },
  });
  if (!isUserExist || isUserExist.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (userId === adminUser.userId) {
    throw new AppError(httpStatus.BAD_REQUEST, "You can't modify your own admin account");
  }

  // Manager has no dependent records (unlike Worker, referenced by Issue/WorkerUpdate),
  // so it's safe to hard-delete the profile row and free up the unique communityId slot
  if (isUserExist.role === Role.MANAGER) {
    await prisma.manager.deleteMany({ where: { userId } });
  }

  const deletedUser = await prisma.user.update({
    where: { id: userId },
    data: { isDeleted: true, deletedAt: new Date() },
    omit: { password: true },
  });

  return deletedUser;
};



const getDashboardStatsDB = async (user: { userId: string; role: Role }) => {
  if (user.role === Role.MANAGER) {
    const manager = await prisma.manager.findUnique({
      where: { userId: user.userId },
    });
    if (!manager) {
      throw new AppError(httpStatus.FORBIDDEN, "Manager profile not found");
    }

    const communityId = manager.communityId;

    const [issuesByStatusRaw, residentCount, revenueResult, closedIssues] =
      await Promise.all([
        prisma.issue.groupBy({
          by: ["status"],
          _count: true,
          where: { communityId },
        }),
        prisma.resident.count({ where: { communityId } }),
        prisma.payment.aggregate({
          _sum: { amount: true },
          where: { status: "COMPLETED", invoice: { communityId } },
        }),
        prisma.issue.findMany({
          where: { communityId, status: "CLOSED" },
          select: { createdAt: true, updatedAt: true },
        }),
      ]);

    const issuesByStatus: Record<string, number> = {};
    issuesByStatusRaw.forEach((row) => {
      issuesByStatus[row.status] = row._count;
    });

    let avgResolutionTimeHours = 0;
    if (closedIssues.length > 0) {
      const totalHours = closedIssues.reduce((sum, issue) => {
        const diffMs = issue.updatedAt.getTime() - issue.createdAt.getTime();
        return sum + diffMs / (1000 * 60 * 60);
      }, 0);
      avgResolutionTimeHours = totalHours / closedIssues.length;
    }

    return {
      issuesByStatus,
      residentCount,
      totalRevenue: revenueResult._sum.amount ?? 0,
      avgResolutionTimeHours: Math.round(avgResolutionTimeHours * 100) / 100,
    };
  }

  // ADMIN — global stats, full role breakdown
  const [issuesByStatusRaw, usersByRoleRaw, revenueResult, closedIssues] =
    await Promise.all([
      prisma.issue.groupBy({ by: ["status"], _count: true }),
      prisma.user.groupBy({ by: ["role"], _count: true, where: { isDeleted: false } }),
      prisma.payment.aggregate({ _sum: { amount: true }, where: { status: "COMPLETED" } }),
      prisma.issue.findMany({
        where: { status: "CLOSED" },
        select: { createdAt: true, updatedAt: true },
      }),
    ]);

  const issuesByStatus: Record<string, number> = {};
  issuesByStatusRaw.forEach((row) => {
    issuesByStatus[row.status] = row._count;
  });

  const usersByRole: Record<string, number> = {};
  usersByRoleRaw.forEach((row) => {
    usersByRole[row.role] = row._count;
  });

  let avgResolutionTimeHours = 0;
  if (closedIssues.length > 0) {
    const totalHours = closedIssues.reduce((sum, issue) => {
      const diffMs = issue.updatedAt.getTime() - issue.createdAt.getTime();
      return sum + diffMs / (1000 * 60 * 60);
    }, 0);
    avgResolutionTimeHours = totalHours / closedIssues.length;
  }

  return {
    issuesByStatus,
    usersByRole,
    totalRevenue: revenueResult._sum.amount ?? 0,
    avgResolutionTimeHours: Math.round(avgResolutionTimeHours * 100) / 100,
  };
};


const getAuditLogsDB = async (query: IGetAuditLogsQuery) => {
  const limit = query.limit ? Number(query.limit) : 10;
  const page = query.page ? Number(query.page) : 1;
  const skip = (page - 1) * limit;

  const andConditions: Prisma.AuditLogWhereInput[] = [];

  if (query.entityType) {
    andConditions.push({ entityType: query.entityType });
  }

  if (query.actorId) {
    andConditions.push({ actorId: query.actorId });
  }

  const whereClause: Prisma.AuditLogWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const auditLogs = await prisma.auditLog.findMany({
    where: whereClause,
    take: limit,
    skip: skip,
    orderBy: { createdAt: "desc" },
    include: {
      actor: { select: { name: true, email: true, role: true } },
    },
  });

  const totalCount = await prisma.auditLog.count({ where: whereClause });

  return {
    data: auditLogs,
    meta: {
      page,
      limit,
      total: totalCount,
      totalPages: Math.ceil(totalCount / limit),
    },
  };
};



 export const AdminService = {
   getAllUsersDB,
   createRoleUsersDB,
   updateUserByIdDB,
   deleteUserByIdDB,
   getDashboardStatsDB,
   getAuditLogsDB
}