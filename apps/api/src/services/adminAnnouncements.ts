import type {
  AnnouncementAdminListResult,
  AnnouncementAdminRowDto,
  AnnouncementOverviewDto,
  AnnouncementRecentDto,
} from "@ctf/shared";
import { prisma } from "@ctf/database";

export interface AdminAnnouncementQuery {
  page?: number;
  limit?: number;
  search?: string;
  pinned?: boolean;
  recent?: boolean;
  sort?: "newest" | "oldest";
}

function num(value: bigint | number): number {
  return typeof value === "bigint" ? Number(value) : value;
}

export async function listAdminAnnouncements(
  input: AdminAnnouncementQuery,
): Promise<AnnouncementAdminListResult> {
  const page = input.page ?? 1;
  const limit = input.limit ?? 20;
  const search =
    typeof input.search === "string" && input.search.length > 0
      ? input.search.trim()
      : undefined;

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { body: { contains: search, mode: "insensitive" } },
    ];
  }
  if (input.pinned !== undefined) where.pinned = input.pinned;
  if (input.recent) {
    where.createdAt = { gte: new Date(Date.now() - 7 * 86_400_000) };
  }

  const orderBy =
    input.sort === "oldest"
      ? [{ pinned: "desc" as const }, { createdAt: "asc" as const }]
      : [{ pinned: "desc" as const }, { createdAt: "desc" as const }];

  const [total, rows] = await Promise.all([
    prisma.announcement.count({ where }),
    prisma.announcement.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      include: { createdBy: { select: { id: true, username: true } } },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const items: AnnouncementAdminRowDto[] = rows.map((r) => ({
    id: r.id,
    pinned: r.pinned,
    title: r.title,
    body: r.body,
    excerpt:
      r.body.length > 140 ? `${r.body.slice(0, 140).trimEnd()}…` : r.body,
    authorId: r.createdBy.id,
    authorUsername: r.createdBy.username,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));

  return {
    items,
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

export async function getAnnouncementOverview(): Promise<AnnouncementOverviewDto> {
  const [kpiRows, recent] = await Promise.all([
    prisma.$queryRaw<
      {
        total: bigint | number;
        pinned: bigint | number;
        last7: bigint | number;
        prev7: bigint | number;
        authors: bigint | number;
        pinned7: bigint | number;
        pinnedPrev7: bigint | number;
        authors7: bigint | number;
        authorsPrev7: bigint | number;
      }[]
    >`
      SELECT
        COUNT(*)::bigint AS total,
        COUNT(*) FILTER (WHERE pinned)::bigint AS pinned,
        COUNT(*) FILTER (WHERE "createdAt" >= now() - interval '7 days')::bigint AS last7,
        COUNT(*) FILTER (
          WHERE "createdAt" >= now() - interval '14 days'
            AND "createdAt" < now() - interval '7 days'
        )::bigint AS prev7,
        COUNT(DISTINCT "createdById")::bigint AS authors,
        COUNT(*) FILTER (
          WHERE pinned AND "createdAt" >= now() - interval '7 days'
        )::bigint AS pinned7,
        COUNT(*) FILTER (
          WHERE pinned AND "createdAt" >= now() - interval '14 days'
            AND "createdAt" < now() - interval '7 days'
        )::bigint AS pinnedPrev7,
        COUNT(DISTINCT "createdById") FILTER (
          WHERE "createdAt" >= now() - interval '7 days'
        )::bigint AS authors7,
        COUNT(DISTINCT "createdById") FILTER (
          WHERE "createdAt" >= now() - interval '14 days'
            AND "createdAt" < now() - interval '7 days'
        )::bigint AS authorsPrev7
      FROM "Announcement"
    `,
    prisma.announcement.findMany({
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      take: 5,
      include: { createdBy: { select: { username: true } } },
    }),
  ]);

  const changePct = (cur: number, prev: number): number => {
    if (prev <= 0) return cur > 0 ? 100 : 0;
    return Math.round(((cur - prev) / prev) * 100);
  };

  const k = kpiRows[0];
  const total = num(k?.total ?? 0);
  const pinned = num(k?.pinned ?? 0);
  const last7 = num(k?.last7 ?? 0);
  const prev7 = num(k?.prev7 ?? 0);
  const authors = num(k?.authors ?? 0);
  const authors7 = num(k?.authors7 ?? 0);
  const authorsPrev7 = num(k?.authorsPrev7 ?? 0);

  return {
    kpis: {
      total,
      pinned,
      last7,
      authors,
      totalChangePct: changePct(last7, prev7),
      pinnedChangePct: changePct(
        num(k?.pinned7 ?? 0),
        num(k?.pinnedPrev7 ?? 0),
      ),
      last7ChangePct: changePct(last7, prev7),
      authorsChangePct: changePct(authors7, authorsPrev7),
    },
    recent: recent.map(
      (r): AnnouncementRecentDto => ({
        id: r.id,
        title: r.title,
        pinned: r.pinned,
        username: r.createdBy.username,
        createdAt: r.createdAt.toISOString(),
      }),
    ),
  };
}