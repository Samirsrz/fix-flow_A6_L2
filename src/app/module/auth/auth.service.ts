import bcrypt from "bcryptjs"
import crypto from "crypto"
import path from "path"
import ejs from "ejs"
import { AuthProvider, Role, UserStatus } from "../../../generated/prisma/enums"

import { prisma } from "../../lib/prisma"
import { redisClient } from "../../lib/redis"
// import { transporter } from "../../lib/nodeMailer"
import { jwtUtils } from "../../utils/jwt"
import type {
  IForgotPasswordPayload,
  ILoginPayload,
  IRegisterResidentPayload,
  IResendOtpPayload,
  IResetPasswordPayload,
  IUpdateMePayload,
  IVerifyOtpPayload,
} from "./auth.interface"
import config from "../../config"
import { JwtPayload, SignOptions } from "jsonwebtoken"
import { transporter } from "../../lib/nodeMailer"
import { email } from "zod"


const registerResidentDB = async (payload: IRegisterResidentPayload) => {
  const { name, password, communityId, unitNumber } = payload
  const email = payload.email.trim().toLowerCase()

  const isUserExists = await prisma.user.findUnique({ where: { email } })
  if (isUserExists) {
    throw new Error("User with this email already exists")
  }

  const community = await prisma.community.findUnique({ where: { id: communityId } })
  if (!community) {
    throw new Error("Community not found")
  }

  const hashedPassword = await bcrypt.hash(password, Number(config.bcrypt_salt_rounds))

  const otpValue = crypto.randomInt(100000, 1000000).toString()
  const otpKey = `resident-registration-otp:${email}`
  await redisClient.set(otpKey, otpValue, {
    expiration: { type: "EX", value: 5 * 60 },
  })

  const pendingRegistrationKey = `pending-registration:${email}`
  await redisClient.set(
    pendingRegistrationKey,
    JSON.stringify({ name, email, password: hashedPassword, communityId, unitNumber }),
    { expiration: { type: "EX", value: 5 * 60 } },
  )

  const templatePath = path.join(process.cwd(), "src/app/templates/registrationOTP.ejs")
  const html = await ejs.renderFile(
    templatePath,
    { name, otp: otpValue, expirationMinutes: 5 },
    { cache: false },
  )
  await transporter.sendMail({
    from: config.smtp_user,
    to: email,
    subject: "Verify Your Email - FixFlow",
    html,
  })

  console.log("registerResidentDB: OTP sent to", email)
}


const verifyOtpDB = async (payload: IVerifyOtpPayload) => {
  const email = payload.email.trim().toLowerCase()
  const otp = payload.otp

  const isUserExists = await prisma.user.findUnique({ where: { email } })
  if (isUserExists) {
    throw new Error("User with this email already exists")
  }

  const otpKey = `resident-registration-otp:${email}`
  const redisOtp = await redisClient.get(otpKey)
  if (!redisOtp) {
    throw new Error("OTP expired or not found, please register again")
  }
  if (redisOtp !== otp) {
    throw new Error("OTP does not match")
  }
  await redisClient.del(otpKey)

  const pendingRegistrationKey = `pending-registration:${email}`
  const pendingData = await redisClient.get(pendingRegistrationKey)
  if (!pendingData) {
    throw new Error("Registration data expired, please register again")
  }

  const parsed = JSON.parse(pendingData) as {
    name: string
    email: string
    password: string
    communityId: string
    unitNumber?: string
  }

  const createdUser = await prisma.user.create({
    data: {
      name: parsed.name,
      email: parsed.email,
      password: parsed.password,
      role: Role.RESIDENT,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      resident: {
        create: {
          communityId: parsed.communityId,
          unitNumber: parsed.unitNumber,
        },
      },
    },
    omit: { password: true },
    include: { resident: true },
  })

  await redisClient.del(pendingRegistrationKey)

  const welcomeTemplatePath = path.join(process.cwd(), "src/app/templates/welcome.ejs")
  const welcomeHtml = await ejs.renderFile(
    welcomeTemplatePath,
    { name: createdUser.name },
    { cache: false },
  )

  await transporter.sendMail({
    from: config.smtp_user,
    to: email,
    subject: "Welcome to FixFlow",
    html: welcomeHtml,
  })

  const jwtPayload = {
    userId: createdUser.id,
    name: createdUser.name,
    email: createdUser.email,
    role: createdUser.role,
  }

  const accessToken = jwtUtils.createToken(jwtPayload, config.jwt_access_secret, config.jwt_access_expires_in as SignOptions)
  const refreshToken = jwtUtils.createToken(jwtPayload, config.jwt_refresh_secret, config.jwt_refresh_expires_in as SignOptions)

  console.log("verifyOtpDB: user created", createdUser.email)

  return { user: createdUser, accessToken, refreshToken }
}





const resendOtpDB = async (payload: IResendOtpPayload) => {
  const email = payload.email.trim().toLowerCase()

  const isUserExists = await prisma.user.findUnique({ where: { email } })
  if (isUserExists) {
    throw new Error("User with this email already exists")
  }

  const pendingRegistrationKey = `pending-registration:${email}`
  const pendingData = await redisClient.get(pendingRegistrationKey)
  if (!pendingData) {
    throw new Error("No pending registration found for this email, please register again")
  }

  const cooldownKey = `otp-cooldown:${email}`
  const isCoolingDown = await redisClient.get(cooldownKey)
  if (isCoolingDown) {
    throw new Error("Please wait before requesting another OTP")
  }

  const parsed = JSON.parse(pendingData)

  const otpValue = crypto.randomInt(100000, 1000000).toString()
  const otpKey = `resident-registration-otp:${email}`
  await redisClient.set(otpKey, otpValue, {
    expiration: { type: "EX", value: 5 * 60 },
  })
  await redisClient.set(cooldownKey, "1", { expiration: { type: "EX", value: 60 } })

  const templatePath = path.join(process.cwd(), "src/app/templates/resendOtp.ejs")

  const html = await ejs.renderFile(
    templatePath,
    { name: parsed.name, otp: otpValue, expirationMinutes: 5 },
    { cache: false },
  )

  await transporter.sendMail({
    from: config.smtp_user,
    to: email,
    subject: "Verify Your Email - FixFlow",
    html,
  })

  console.log("resendOtpDB: OTP resent to", email)
}





const loginDB = async(payload:ILoginPayload)=>{
    const email = payload.email.trim().toLowerCase() 
  
    const isUserExist = await prisma.user.findUnique({
      where:{
         email:email
      }
    })
    if(!isUserExist){
      throw new Error("User not found, Please Register")
    }

    if(isUserExist.status===UserStatus.BANNED || isUserExist.isDeleted){
      throw new Error("You are banned from this application")
    }
if(isUserExist.authProvider===AuthProvider.GOOGLE){
     throw new Error("This account is already logged in with Google, Try Google login")
   }

   const isPasswordMatched = await bcrypt.compare(payload.password, isUserExist.password as string)
    if(!isPasswordMatched){
      throw new Error("Password did not matched")
    } 
   
    const jwtPayload = {
    userId: isUserExist.id,
    name: isUserExist.name,
    email: isUserExist.email,
    role: isUserExist.role,
  }

  const accessToken = jwtUtils.createToken(jwtPayload, config.jwt_access_secret, config.jwt_access_expires_in as SignOptions)
  const refreshToken = jwtUtils.createToken(jwtPayload, config.jwt_refresh_secret, config.jwt_refresh_expires_in as SignOptions)

  console.log("loginDB: login success for", isUserExist.email)

  return { accessToken, refreshToken }


}



const refreshTokenDB = async(token:string)=>{
   const verified = jwtUtils.verifyToken(token,config.jwt_refresh_secret)
  
   if(!verified.success || !verified.data){
    throw new Error("Invalid Refresh Token")
   }

  const data = verified.data as JwtPayload

  const user =  await prisma.user.findUnique({
    where:{
      id:data.userId as string
    }
  })
 
  if(!user || user.isDeleted || user.status!==UserStatus.ACTIVE){
    throw new Error("User is inactive or not found")
  }
  
 const jwtPayload = {
  userId : user.id,
  name: user.name,
  email: user.email,
  role: user.role
 }

   const accessToken = jwtUtils.createToken(jwtPayload,config.jwt_access_secret,config.jwt_access_expires_in as SignOptions)

   const newRefreshToken = jwtUtils.createToken(jwtPayload,config.jwt_refresh_secret,config.jwt_refresh_expires_in as SignOptions)

console.log("refreshTokenDB: tokens refreshed for", user.email)
 return {accessToken,refreshToken:newRefreshToken}

}




const forgotPasswordDB = async(payload:IForgotPasswordPayload)=>{
   
  const email = payload.email.trim().toString()
  const user= await prisma.user.findUnique({where:{email}})

  if(!user){
    throw new Error("User not found")
  }
  if(user.isDeleted || user.status===UserStatus.BANNED){
    throw new Error("User is Deleted or Banned")
  }
  if(!user.emailVerified){
    throw new Error("Email is not verified, Please erify your email first")
  }
  
  if(user.googleId || user.authProvider==="GOOGLE"){
    throw new Error("This Account is alredy logged in with Google")
  }

  const otp = crypto.randomInt(100000,1000000).toString()
 
  const key = `forgot-password-otp:${email}`
 await redisClient.set(key, otp,{expiration:{
  type:"EX",
  value:5*60
 }})

 const templatePath = path.join(process.cwd(),"src/app/templates/forgot-password-otp.ejs")
  
  const html = await ejs.renderFile(templatePath, { name: user.name, otp, expirationMinutes: 5 }, { cache: false })

   await transporter.sendMail({
    from:config.smtp_user,
    to:email,
    subject:"Reset Your Password- FixFlow",
    html
   })
  console.log("forgot-passwordDB: OTP sent to", email)
}





const resetPasswordDB = async (payload: IResetPasswordPayload) => {
  const email = payload.email.trim().toLowerCase()
  const user = await prisma.user.findUnique({ where: { email } })

  if (!user) {
    throw new Error("User does not exist")
  }
  if (user.status === UserStatus.BANNED) {
    throw new Error("User is banned")
  }
  if (!user.emailVerified) {
    throw new Error("Verify your email first")
  }
  if (user.isDeleted) {
    throw new Error("User is deleted")
  }
  if (user.googleId || user.authProvider === "GOOGLE") {
    throw new Error("This account uses Google login, no password to reset")
  }

  const key = `forgot-password-otp:${email}`
  const redisOtp = await redisClient.get(key)

  if (!redisOtp) {
    throw new Error("OTP expired or not found")
  }
  if (redisOtp !== payload.otp) {
    throw new Error("OTP does not match")
  }

  const hashedPassword = await bcrypt.hash(payload.newPassword, Number(config.bcrypt_salt_rounds))

  await prisma.user.update({
    where: { email },
    data: { password: hashedPassword },
  })

  await redisClient.del(key)

  const templatePath = path.join(process.cwd(), "src/app/templates/password-changed.ejs")
  const html = await ejs.renderFile(templatePath, { name: user.name }, { cache: false })

  await transporter.sendMail({
    from: config.smtp_user,
    to: email,
    subject: "Your Password Was Changed - FixFlow",
    html,
  })

  console.log("resetPasswordDB: password reset for", email)
}

  


const getMeDB = async(userId:string) =>{
  const user = await prisma.user.findUnique({
    where:{
         id:userId
    },
    include:{
      resident:true,
      manager:true,
      worker:true
    },
    omit:{
      password:true
    }
  })
 
   if(!user){
    throw new Error("User not found");
   }
 
   return user

}

const updateMeDB = async (userId: string, role: Role, payload: IUpdateMePayload) => {
  const { name, phone, unitNumber, specialization } = payload;

  // build the profile-table nested update based on the caller's role
  let profileRelationUpdate = {};

  if (role === Role.RESIDENT) {
    profileRelationUpdate = {
      resident: { update: { phone, unitNumber } },
    };
  } else if (role === Role.MANAGER) {
    profileRelationUpdate = {
      manager: { update: { phone } },
    };
  } else if (role === Role.WORKER) {
    profileRelationUpdate = {
      worker: { update: { phone, specialization } },
    };
  }
  // ADMIN has no profile table — profileRelationUpdate stays {}

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      name,
      ...profileRelationUpdate,
    },
    include: { resident: true, manager: true, worker: true },
    omit: { password: true },
  });

  console.log("updateMeDB: profile updated for", updatedUser.email);

  return updatedUser;
};



export const AuthService = {
  registerResidentDB,
  resendOtpDB,
  verifyOtpDB,
  loginDB,
  refreshTokenDB,
  forgotPasswordDB,
  resetPasswordDB,
  getMeDB,
  updateMeDB
}