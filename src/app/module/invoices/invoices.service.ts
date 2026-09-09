import { Prisma } from "../../../generated/prisma/client";
import { Role } from "../../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { ICreateInvoicePayload, IGetInvoicesQuery } from "./invoices.interface";
import httpStatus from "http-status"

const createInvoiceDB = async (
  payload: ICreateInvoicePayload,
  user: { userId: string; role: Role },
) => {
  const manager = await prisma.manager.findUnique({
    where: { userId: user.userId },
  });
  if (!manager) {
    throw new AppError(httpStatus.FORBIDDEN, "Manager profile not found");
  }

  const { period, dueDate, amount, residentId } = payload;

  // Single-resident invoice (catch-up / exception case)
  if (residentId) {
    const resident = await prisma.resident.findUnique({
      where: { id: residentId },
    });
    if (!resident || resident.communityId !== manager.communityId) {
      throw new AppError(httpStatus.BAD_REQUEST, "Resident not found in your community");
    }

    const existingInvoice = await prisma.invoice.findUnique({
      where: { residentId_period: { residentId, period } },
    });
    if (existingInvoice) {
      throw new AppError(httpStatus.BAD_REQUEST, "Invoice already exists for this resident and period");
    }

    const invoice = await prisma.invoice.create({
      data: {
        communityId: manager.communityId,
        residentId,
        amount,
        period,
        dueDate: new Date(dueDate),
      },
    });

    return invoice;
  }

  // Batch generation — the normal monthly case
  const allResidents = await prisma.resident.findMany({
    where: { communityId: manager.communityId },
  });

  const existingInvoices = await prisma.invoice.findMany({
    where: {
      communityId: manager.communityId,
      period,
    },
    select: { residentId: true },
  });
  const alreadyBilledIds = new Set(existingInvoices.map((inv) => inv.residentId));

  const residentsToBill = allResidents.filter((r) => !alreadyBilledIds.has(r.id));

  if (residentsToBill.length > 0) {
    await prisma.invoice.createMany({
      data: residentsToBill.map((resident) => ({
        communityId: manager.communityId,
        residentId: resident.id,
        amount,
        period,
        dueDate: new Date(dueDate),
      })),
    });
  }

  return {
    created: residentsToBill.length,
    skipped: alreadyBilledIds.size,
    period,
  };
};



const getInvoicesForManagerDB = async (
  query: IGetInvoicesQuery,
  user: { userId: string; role: Role },
) => {
  const limit = query.limit ? Number(query.limit) : 5;
  const page = query.page ? Number(query.page) : 1;
  const skip = (page - 1) * limit;
  const sortBy = query.sortBy ? query.sortBy : "createdAt";
  const sortOrder = query.sortOrder ? query.sortOrder : "desc";

  const andConditions: Prisma.InvoiceWhereInput[] = [];

  if (query.searchTerm) {
    andConditions.push({
      OR: [{ period: { contains: query.searchTerm, mode: "insensitive" } }],
    });
  }

  if (query.status) {
    andConditions.push({ status: query.status });
  }

  if (query.period) {
    andConditions.push({ period: query.period });
  }

  if (user.role === Role.RESIDENT) {
    const resident = await prisma.resident.findUnique({
      where: { userId: user.userId },
    });
    if (!resident) {
      throw new AppError(httpStatus.FORBIDDEN, "Resident profile not found");
    }
    andConditions.push({ residentId: resident.id });
  } else if (user.role === Role.MANAGER) {
    const manager = await prisma.manager.findUnique({
      where: { userId: user.userId },
    });
    if (!manager) {
      throw new AppError(httpStatus.FORBIDDEN, "Manager profile not found");
    }
    andConditions.push({ communityId: manager.communityId });
  }
  // ADMIN → no forced condition

  const whereClause: Prisma.InvoiceWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const invoices = await prisma.invoice.findMany({
    where: whereClause,
    take: limit,
    skip: skip,
    orderBy: { [sortBy]: sortOrder },
    include: {
      resident: { include: { user: { select: { name: true, email: true } } } },
    },
  });

  const totalInvoiceCount = await prisma.invoice.count({ where: whereClause });

  return {
    data: invoices,
    meta: {
      page,
      limit,
      total: totalInvoiceCount,
      totalPages: Math.ceil(totalInvoiceCount / limit),
    },
  };
};


const getInvoicesForManagerBy_Id_DB = async(invoiceId:string, user: { userId: string; role: Role })=>{
    const invoice = await prisma.invoice.findUnique({
        where:{id:invoiceId},
        include:{
            resident:{
                include:{
                    user:true
                }
            },
            payments:true
        }
    })

    if(!invoice){
        throw new AppError(httpStatus.NOT_FOUND,"No invoice with this ID")
    }

    if(user.role===Role.RESIDENT){
       
     const resident = await prisma.resident.findUnique({
        where:{userId: user.userId}
     })   
      if(!resident || resident.id!==invoice.residentId){
        throw new AppError(httpStatus.FORBIDDEN, "You don't have the permission");
      }  
    
    }
    else if(user.role===Role.MANAGER){
       const manager = await prisma.manager.findUnique({
      where: { userId: user.userId },
    });
    if (!manager || manager.communityId !== invoice.communityId) {
      throw new AppError(httpStatus.FORBIDDEN, "You don't have the permission");
    }
  }
  
    return invoice
}





export const InvoiceService = {
    createInvoiceDB,
    getInvoicesForManagerDB,
    getInvoicesForManagerBy_Id_DB
}


