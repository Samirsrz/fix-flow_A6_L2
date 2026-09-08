import { Result } from "pg"
import { Role } from "../../../generated/prisma/enums"
import { prisma } from "../../lib/prisma"
import { AppError } from "../../utils/AppError"
import httpStatus from "http-status"
import { ICreateMessagePayload } from "./message.interface"


const createMessageForIssueDB = async(issueId:string,paylaod:ICreateMessagePayload, user:{ userId: string; role: Role })=>{
   const issue = await prisma.issue.findUnique({
    where:{id:issueId}
   })   
   if(!issue){
    throw new AppError(httpStatus.NOT_FOUND,"Issue not Found")
   }

   if(user.role===Role.RESIDENT){
   const resident = await prisma.resident.findUnique({
    where:{
        userId: user.userId
    }
   })
    
   if(!resident || resident.id!==issue.residentId){
    throw new AppError(httpStatus.FORBIDDEN,"You dont have the permission")
   }
  }
   
  else if(user.role===Role.WORKER){
    const worker = await prisma.worker.findUnique({
        where:{userId:user.userId}
    })

   if(!worker || worker.id !== issue.assignedWorkerId){
     throw new AppError(httpStatus.FORBIDDEN,"You dont have the permission")
   }
  }
  else{
    throw new AppError(httpStatus.FORBIDDEN, "You don't have the permission");
  }

  const result = await prisma.message.create({
    data: { issueId, senderId: user.userId, content: paylaod.content },
  });

  return result;
} 


const getMessageForIssueDB = async(issueId:string, user:{ userId: string; role: Role })=>{
const issue = await prisma.issue.findUnique({
    where:{id:issueId}
   })   
   if(!issue){
    throw new AppError(httpStatus.NOT_FOUND,"Issue not Found")
   }

   if(user.role===Role.RESIDENT){
   const resident = await prisma.resident.findUnique({
    where:{
        userId: user.userId
    }
   })
    
   if(!resident || resident.id!==issue.residentId){
    throw new AppError(httpStatus.FORBIDDEN,"You dont have the permission")
   }
  }
   
  else if(user.role===Role.WORKER){
    const worker = await prisma.worker.findUnique({
        where:{userId:user.userId}
    })

   if(!worker || worker.id !== issue.assignedWorkerId){
     throw new AppError(httpStatus.FORBIDDEN,"You dont have the permission")
   }
  }
  else{
    throw new AppError(httpStatus.FORBIDDEN, "You don't have the permission");
  }

  const result = await prisma.message.findMany({
  where: { issueId }, orderBy: { createdAt: "asc" }, include: { sender: { select: { name: true, role: true } } }
  });

  return result;
}



export const MessageService = {
    createMessageForIssueDB,
    getMessageForIssueDB
}