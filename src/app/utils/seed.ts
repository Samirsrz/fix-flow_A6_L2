import bcrypt from "bcryptjs";
import { Role } from "../../generated/prisma/enums";
import config from "../config";
import { prisma } from "../lib/prisma";

export const seedSuperAdmin = async () => {
    try {
        const isSuperAdminExist = await prisma.user.findFirst({
            where: {
                role: Role.ADMIN,
            },
        });

        if (isSuperAdminExist) {
            console.log("Admin Already Exists!");
            return;
        }

        const name = config.super_admin_name;
        const email = config.super_admin_email;
        const password = config.super_admin_password;

        if (!name || !email || !password) {
            throw new Error("Admin Name, Email, Password Missing In Env File!!!");
        }

        const hashedPassword = await bcrypt.hash(
            password,
            Number(config.bcrypt_salt_rounds)
        );

        const superAdmin = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role: Role.ADMIN,
                authProvider: "CREDENTIAL",
                emailVerified: true,
            },
        });

        console.log("Super Admin Created: ", superAdmin);
    } catch (error) {
        console.log("Error Seeding Super Admin: ", error);
    }
};