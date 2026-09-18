import type {
  SubmissionAdminListResult,
  SubmissionAdminRowDto,
  SubmissionByDayPoint,
  SubmissionFilterOptionsDto,
  SubmissionOverviewDto,
  SubmissionRecentDto,
  SubmissionResultKey,
  SubmissionTopChallengeDto,
  SubmissionTopTeamDto,
  SubmissionTopUserDto,
} from "@ctf/shared";
import { prisma } from "@ctf/database";
import { Prisma } from "@prisma/client";

type DayRow = {
  date: string;
  total: bigint | number;
  correct: bigint | number;
  users: bigint | number;
};

type NamedCountRow = {
  id: number;
  name: string;
  count: bigint | number;
};

type RowRow = {
  id: number;
  userId: number;
  username: string;
  challenge: string;
  challengeId: number;
  teamId: number | null;
  teamName: string | null;
  flagHash: string;
  time: Date;
  correct: boolean;
};

type RecentRow = {
  id: number;
  userId: number;
  username: string;
  challengeId: number;
  challenge: string;
  time: Date;
};

function num(value: bigint | number): number {
  return typeof value === "bigint" ? Number(value) : value;
}

export async function listAdminSubmissions(input: {
  page?: number;
  limit?: number;
  search?: string;
  result?: SubmissionResultKey;
  challengeId?: number;
  userId?: number;
  teamId?: number;
}): Promise<SubmissionAdminListResult> {
  const page = input.page ?? 1;
  const limit = input.limit ?? 20;
  const search =
    typeof input.search === "string" && input.search.length > 0
      ? input.search.trim()
      : undefined;

  const where: Prisma.Sql[] = [];
  if (search) {
    where.push(
      Prisma.sql`(
        u.username ILIKE ${`%${search}%`}
        OR c.title ILIKE ${`%${search}%`}
        OR a."flagAttemptHash" ILIKE ${`${search}%`}
      )`,
    );
  }
  if (input.result === "correct") where.push(Prisma.sql`a.correct = true`);
  if (input.result === "incorrect") where.push(Prisma.sql`a.correct = false`);
  if (input.challengeId != null) {
    where.push(Prisma.sql`a."challengeId" = ${input.challengeId}`);
  }
  if (input.userId != null) where.push(Prisma.sql`a."userId" = ${input.userId}`);
  if (input.teamId != null) {
    where.push(
      Prisma.sql`EXISTS (
        SELECT 1 FROM "TeamMember" f
        WHERE f."userId" = a."userId" AND f."teamId" = ${input.teamId}
      )`,
    );
  }
  const whereSql =
    where.length > 0
      ? Prisma.sql`WHERE ${Prisma.join(where, " AND ")}`
      : Prisma.empty;

  const countRows = await prisma.$queryRaw<{ total: bigint | number }[]>(
    Prisma.sql`
      SELECT COUNT(*)::bigint AS total
      FROM "SubmissionAttempt" a
      JOIN "User" u ON u.id = a."userId"
      JOIN "Challenge" c ON c.id = a."challengeId"
      ${whereSql}
    `,
  );
  const total = num(countRows[0]?.total ?? 0);

  const rows = await prisma.$queryRaw<RowRow[]>(
    Prisma.sql`
      SELECT
        a.id,
        a."userId",
        u.username,
        c.title AS challenge,
        a."challengeId",
        t.id AS "teamId",
        t.name AS "teamName",
        a."flagAttemptHash" AS "flagHash",
        a."createdAt" AS time,
        a.correct
      FROM "SubmissionAttempt" a
      JOIN "User" u ON u.id = a."userId"
      JOIN "Challenge" c ON c.id = a."challengeId"
      LEFT JOIN "TeamMember" tm ON tm."userId" = a."userId"
      LEFT JOIN "Team" t ON t.id = tm."teamId"
      ${whereSql}
      ORDER BY a."createdAt" DESC, a.id DESC
      LIMIT ${limit} OFFSET ${(page - 1) * limit}
    `,
  );

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const items: SubmissionAdminRowDto[] = rows.map((r) => ({
    id: r.id,
    time: r.time.toISOString(),
    userId: r.userId,
    username: r.username,
    challengeId: r.challengeId,
    challenge: r.challenge,
    teamId: r.teamId,
    teamName: r.teamName,
    flagHash: r.flagHash,
    correct: r.correct,
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

function fillDays(rows: DayRow[]): SubmissionByDayPoint[] {
  const byDate = new Map(rows.map((r) => [r.date, r]));
  const out: SubmissionByDayPoint[] = [];
  for (let i = 13; i >= 0; i -= 1) {
    const key = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    const found = byDate.get(key);
    out.push({
      date: key,
      total: found ? num(found.total) : 0,
      correct: found ? num(found.correct) : 0,
      users: found ? num(found.users) : 0,
    });
  }
  return out;
}

export async function getSubmissionOverview(): Promise<SubmissionOverviewDto> {
  const [kpiRows, dayRows, topTeams, topUsers, topChallenges, recentCorrect] =
    await Promise.all([
      prisma.$queryRaw<{ total: bigint | number; correct: bigint | number; users: bigint | number }[]>`
        SELECT
          COUNT(*)::bigint AS total,
          COUNT(*) FILTER (WHERE correct)::bigint AS correct,
          COUNT(DISTINCT "userId")::bigint AS users
        FROM "SubmissionAttempt"
      `,
      prisma.$queryRaw<DayRow[]>`
        SELECT
          to_char("createdAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
          COUNT(*)::bigint AS total,
          COUNT(*) FILTER (WHERE correct)::bigint AS correct,
          COUNT(DISTINCT "userId")::bigint AS users
        FROM "SubmissionAttempt"
        WHERE "createdAt" >= (now() - interval '13 days')
        GROUP BY 1
      `,
      prisma.$queryRaw<NamedCountRow[]>`
        SELECT t.id, t.name, COUNT(a.id)::bigint AS count
        FROM "SubmissionAttempt" a
        JOIN "TeamMember" tm ON tm."userId" = a."userId"
        JOIN "Team" t ON t.id = tm."teamId"
        GROUP BY t.id, t.name
        ORDER BY count DESC, t.name ASC
        LIMIT 5
      `,
      prisma.$queryRaw<NamedCountRow[]>`
        SELECT u.id, u.username AS name, COUNT(a.id)::bigint AS count
        FROM "SubmissionAttempt" a
        JOIN "User" u ON u.id = a."userId"
        GROUP BY u.id, u.username
        ORDER BY count DESC, u.username ASC
        LIMIT 5
      `,
      prisma.$queryRaw<NamedCountRow[]>`
        SELECT c.id, c.title AS name, COUNT(a.id)::bigint AS count
        FROM "SubmissionAttempt" a
        JOIN "Challenge" c ON c.id = a."challengeId"
        GROUP BY c.id, c.title
        ORDER BY count DESC, c.title ASC
        LIMIT 5
      `,
      prisma.$queryRaw<RecentRow[]>`
        SELECT a.id, a."userId", u.username, a."challengeId", c.title AS challenge, a."createdAt" AS time
        FROM "SubmissionAttempt" a
        JOIN "User" u ON u.id = a."userId"
        JOIN "Challenge" c ON c.id = a."challengeId"
        WHERE a.correct = true
        ORDER BY a."createdAt" DESC
        LIMIT 6
      `,
    ]);

  const total = num(kpiRows[0]?.total ?? 0);
  const correct = num(kpiRows[0]?.correct ?? 0);
  const uniqueUsers = num(kpiRows[0]?.users ?? 0);
  const incorrect = total - correct;
  const byDay = fillDays(dayRows);

  const [challengeOptions, userOptions, teamOptions] = await Promise.all([
    prisma.challenge.findMany({
      where: { published: true },
      select: { id: true, title: true },
      orderBy: { title: "asc" },
      take: 100,
    }),
    prisma.user.findMany({
      select: { id: true, username: true },
      orderBy: { username: "asc" },
      take: 100,
    }),
    prisma.team.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 100,
    }),
  ]);

  const sumRange = (from: string, to: string, key: "total" | "correct" | "users") =>
    byDay
      .filter((d) => d.date >= from && d.date <= to)
      .reduce((acc, d) => acc + d[key], 0);

  const nowDay = new Date(Date.now()).toISOString().slice(0, 10);
  const d7start = new Date(Date.now() - 6 * 86_400_000).toISOString().slice(0, 10);
  const d14start = new Date(Date.now() - 13 * 86_400_000).toISOString().slice(0, 10);
  const d7end = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);

  const changePct = (cur: number, prev: number): number => {
    if (prev <= 0) return cur > 0 ? 100 : 0;
    return Math.round(((cur - prev) / prev) * 100);
  };

  const last7Total = sumRange(d7start, nowDay, "total");
  const last7Correct = sumRange(d7start, nowDay, "correct");
  const last7Incorrect = last7Total - last7Correct;
  const last7Users = sumRange(d7start, nowDay, "users");
  const prev7Total = sumRange(d14start, d7end, "total");
  const prev7Correct = sumRange(d14start, d7end, "correct");
  const prev7Users = sumRange(d14start, d7end, "users");

  const filters: SubmissionFilterOptionsDto = {
    challenges: challengeOptions.map((c) => ({ id: c.id, label: c.title })),
    users: userOptions.map((u) => ({ id: u.id, label: u.username })),
    teams: teamOptions.map((t) => ({ id: t.id, label: t.name })),
  };

  return {
    kpis: {
      total,
      correct,
      incorrect,
      uniqueUsers,
      solveRatePct: total > 0 ? Math.round((correct / total) * 1000) / 10 : 0,
      totalChangePct: changePct(last7Total, prev7Total),
      correctChangePct: changePct(last7Correct, prev7Correct),
      incorrectChangePct: changePct(last7Incorrect, prev7Total - prev7Correct),
      usersChangePct: changePct(last7Users, prev7Users),
    },
    byDay,
    status: { total, correct, incorrect },
    topTeams: topTeams.map(
      (t): SubmissionTopTeamDto => ({ teamId: t.id, name: t.name, count: num(t.count) }),
    ),
    topUsers: topUsers.map(
      (u): SubmissionTopUserDto => ({ userId: u.id, username: u.name, count: num(u.count) }),
    ),
    topChallenges: topChallenges.map(
      (c): SubmissionTopChallengeDto => ({
        challengeId: c.id,
        title: c.name,
        count: num(c.count),
        pct: total > 0 ? Math.round((num(c.count) / total) * 1000) / 10 : 0,
      }),
    ),
    recentCorrect: recentCorrect.map(
      (r): SubmissionRecentDto => ({
        id: r.id,
        userId: r.userId,
        username: r.username,
        challengeId: r.challengeId,
        challenge: r.challenge,
        time: r.time.toISOString(),
      }),
    ),
    filters,
  };
}