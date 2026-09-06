import { prisma } from "../../lib/prisma"
import { AppError } from "../../utils/AppError"
import httpStatus from "http-status"
import { ICreateCategoryPayload } from "./categories.interface"

const createCategoryDB = async(payload:ICreateCategoryPayload
)=>{
    const {name,description} = payload
 
     const isCategoryExist = await prisma.category.findFirst({
         where:{
            name:{ equals: name, mode: "insensitive" }
         } 
     })

   if (isCategoryExist) {
    throw new AppError(httpStatus.BAD_REQUEST, "This category already exists");
}
   
     const result = await prisma.category.create({
          data:{
            name,
            description
          }
     })

      return result 
}


const getAllCategoriesDB = async()=>{
    const result = await prisma.category.findMany({
        orderBy:{createdAt:"desc"}
    })

    return result
}



export const CategoriesService = {
    createCategoryDB,
    getAllCategoriesDB
}