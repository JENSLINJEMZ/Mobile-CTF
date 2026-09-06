import type { AuditLogDto, AuditLogListResult } from "@ctf/shared";
import { prisma } from "@ctf/database";
import type { Prisma } from "@prisma/client";

export interface RecordAuditInput {
  actorId?: number;
  actorUsername?: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

export async function recordAudit(input: RecordAuditInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId,
      actorUsername: input.actorUsername,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      details: input.details ? (input.details as Prisma.InputJsonValue) : undefined,
      ipAddress: input.ipAddress,
    },
  });
}

export interface AuditLogListInput {
  page?: number;
  limit?: number;
  actorId?: number;
  entityType?: string;
  action?: string;
}

export async function listAuditLog(
  input: AuditLogListInput,
): Promise<AuditLogListResult> {
  const page = input.page ?? 1;
  const limit = input.limit ?? 50;

  const where: Prisma.AuditLogWhereInput = {
    ...(input.actorId !== undefined ? { actorId: input.actorId } : {}),
    ...(input.entityType ? { entityType: input.entityType } : {}),
    ...(input.action ? { action: input.action } : {}),
  };

  const [total, rows] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  const totalPages = Math.ceil(total / limit);
  return {
    items: rows.map(toDto),
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

function toDto(row: {
  id: number;
  actorId: number | null;
  actorUsername: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  details: Prisma.JsonValue | null;
  ipAddress: string | null;
  createdAt: Date;
}): AuditLogDto {
  return {
    id: row.id,
    actorId: row.actorId,
    actorUsername: row.actorUsername,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    details:
      row.details && typeof row.details === "object" && !Array.isArray(row.details)
        ? (row.details as Record<string, unknown>)
        : null,
    ipAddress: row.ipAddress,
    createdAt: row.createdAt.toISOString(),
  };
}