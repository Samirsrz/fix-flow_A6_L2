import { Prisma } from "../../generated/prisma/client"; // adjust import path to match your other Prisma type imports
import { prisma } from "../lib/prisma";

export const createAuditLog = async (
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, unknown>,
) => {
  try {
    await prisma.auditLog.create({
      data: {
        actorId,
        action,
        entityType,
        entityId,
        metadata: metadata as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (error) {
    console.log("createAuditLog failed:", error);
  }
};