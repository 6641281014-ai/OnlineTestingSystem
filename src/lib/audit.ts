import { prisma } from "./prisma";

export type AuditAction =
  | "CREATE_USER"
  | "UPDATE_USER"
  | "CHANGE_ROLE"
  | "ACTIVATE_USER"
  | "DEACTIVATE_USER"
  | "RESET_PASSWORD";

export interface CreateAuditLogParams {
  actorId: string;
  actorName?: string | null;
  actorRole?: string | null;
  targetId?: string | null;
  targetName?: string | null;
  action: AuditAction;
  details?: string | null;
}

/**
 * Records system administrative and user management activity
 * Note: Never pass or record passwords/password hashes in details
 */
export async function createAuditLog(params: CreateAuditLogParams) {
  try {
    return await prisma.auditLog.create({
      data: {
        actorId: params.actorId,
        actorName: params.actorName || null,
        actorRole: params.actorRole || null,
        targetId: params.targetId || null,
        targetName: params.targetName || null,
        action: params.action,
        details: params.details || null,
      },
    });
  } catch (error) {
    console.error("Failed to record audit log:", error);
    return null;
  }
}
