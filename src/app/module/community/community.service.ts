import { meta } from "zod/v4/core";
import { CommunityWhereInput } from "../../../generated/prisma/models";
import { IQuery } from "../../interfaces";
import { prisma } from "../../lib/prisma";
import { ICreateCommunityPayload } from "./community.interface";
import { Role } from "../../../generated/prisma/enums";
import { Prisma } from "../../../generated/prisma/client";
import { AppError } from "../../utils/AppError";
import httpStatus from "http-status"



const createCommunityDB = async(payload:ICreateCommunityPayload) =>{
     
    const {name,address,city} = payload
    
    const result = await prisma.community.create({
         data:{
            name:name,
            address:address,
            city:city
         }
     })
 
   return result     
}


const getCommunityDB = async (
  query: IQuery,
  role: Role,
  callerUserId: string,
) => {
  const limit = query.limit ? Number(query.limit) : 5;
  const page = query.page ? Number(query.page) : 1;
  const skip = (page - 1) * limit;
  const sortBy = query.sortBy ? query.sortBy : "createdAt";
  const sortOrder = query.sortOrder ? query.sortOrder : "desc";

  const andConditions: Prisma.CommunityWhereInput[] = [];

  if (query.searchTerm) {
    andConditions.push({
      OR: [
        { name: { contains: query.searchTerm, mode: "insensitive" } },
        { address: { contains: query.searchTerm, mode: "insensitive" } },
        { city: { contains: query.searchTerm, mode: "insensitive" } },
      ],
    });
  }

  if (query.name) {
    andConditions.push({ name: { contains: query.name, mode: "insensitive" } });
  }

  if (query.address) {
    andConditions.push({ address: { contains: query.address, mode: "insensitive" } });
  }

  if (query.city) {
    andConditions.push({ city: { contains: query.city, mode: "insensitive" } });
  }

  // ADMIN may optionally filter by a specific community id via query param
  if (role === Role.ADMIN && query.communityId) {
    andConditions.push({ id: query.communityId });
  }

  // MANAGER never gets to choose — scope is forced to their own community,
  // regardless of anything the client sent in communityId/name/address/city
  if (role === Role.MANAGER) {
    const manager = await prisma.manager.findUnique({
      where: { userId: callerUserId },
    });

    if (!manager) {
      throw new AppError(httpStatus.FORBIDDEN, "Manager profile not found");
    }

    andConditions.push({ id: manager.communityId });
  }

  const whereClause: Prisma.CommunityWhereInput =
    andConditions.length > 0 ? { AND: andConditions } : {};

  const allCommunities = await prisma.community.findMany({
    where: whereClause,
    take: limit,
    skip: skip,
    orderBy: { [sortBy]: sortOrder },
  });

  const totalCommunityCount = await prisma.community.count({
    where: whereClause,
  });

  return {
    data: allCommunities,
    meta: {
      page,
      limit,
      total: totalCommunityCount,
      totalPages: Math.ceil(totalCommunityCount / limit),
    },
  };
};



// const getCommunityD = async(query:IQuery)=>{
//     const limit = query.limit ? Number(query.limit) : 5;
//     const page = query.page ? Number(query.page) : 1;
//     const skip = (page - 1) * limit;
//     const sortBy = query.sortBy ? query.sortBy : "createdAt";
//     const sortOrder = query.sortOrder ? query.sortOrder : "desc";

//    const andConditions:CommunityWhereInput[] = []

//      if(query.searchTerm){
//         andConditions.push({
//             OR:[
//                 {name:{contains:query.doctor, mode:"insensitive"}},
//             {address:{contains:query.doctor, mode:"insensitive"}},
//             {city:{contains:query.doctor,mode:"insensitive"}},
//             ]
//         })
//      }
//     if(query.communityId){
//         andConditions.push({id: query.communityId})
//     }

//     if(query.name){
//         andConditions.push({name:query.name})
//     }

//     if(query.address){
//         andConditions.push({address:query.address})
//     }
//     if(query.city){
//         andConditions.push({city:query.city})
//     }
  
//     const allCommunities = await prisma.community.findMany({
//         where:{
//             AND:andConditions.length>0 ? andConditions : undefined
//         },
//         take:limit,
//         skip:skip,
//          orderBy:{
//         [sortBy]:sortOrder
//       },
//     })
      
//     const totalCommunityCount = await prisma.community.count({
//         where:{
//             AND:andConditions
//         }
//     })

//     return {
//         data: allCommunities,
//         meta:{
//         page:page,
//         limit:limit,
//         totalPages:Math.ceil(totalCommunityCount/limit)
//         }
//     }

// }


const getCommunityByIdDB = async(communityId:string,user:{ userId: string; role: Role })=>{
    const community = await prisma.community.findUnique({
        where:{
            id:communityId
        }
    })
    
    if(!community){
        throw new AppError(httpStatus.NOT_FOUND, "Community Not Found")
    }

if (user.role === "MANAGER") {
    const manager = await prisma.manager.findUnique({
        where: { userId: user.userId },
    });

    if (!manager || manager.communityId !== community.id) {
        throw new AppError(httpStatus.FORBIDDEN, "You don't have the permission");
    }
}

 if(user.role==="WORKER" || user.role==="RESIDENT"){
        throw new AppError(httpStatus.FORBIDDEN,"You dont have the permission")
       
 }
     
  return community



}


export const CommunityService ={
    createCommunityDB,
    getCommunityDB,
    getCommunityByIdDB
}