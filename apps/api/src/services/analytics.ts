import type { AnalyticsOverviewDto } from "@ctf/shared";
import { prisma } from "@ctf/database";

interface DayBucket {
  date: string;
  solves: bigint | number;
  attempts: bigint | number;
  points: bigint | number;
}

interface ChallengeBucket {
  id: number;
  title: string;
  slug: string;
  published: boolean;
  solvedCount: bigint | number;
  attemptCount: bigint | number;
  pointsAwarded: bigint | number;
  firstBloodCount: bigint | number;
}

interface SolverBucket {
  userId: number;
  username: string;
  solves: bigint | number;
  points: bigint | number;
}

function num(value: bigint | number): number {
  return typeof value === "bigint" ? Number(value) : value;
}

export async function getAnalyticsOverview(): Promise<AnalyticsOverviewDto> {
  const now = new Date();
  const startOfDay = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const startOfWeek = new Date(startOfDay.getTime() - 6 * 86400000);

  const [
    totalUsers,
    activeUsers,
    totalChallenges,
    publishedChallenges,
    totalSubmissions,
    totalAttempts,
    totalPointsAwarded,
    solvesToday,
    solvesThisWeek,
    firstBloodCount,
    dayRows,
    challengeRows,
    solverRows,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.challenge.count(),
    prisma.challenge.count({ where: { published: true } }),
    prisma.submission.count(),
    prisma.submissionAttempt.count(),
    prisma.submission.aggregate({ _sum: { pointsAwarded: true } }),
    prisma.submission.count({ where: { solvedAt: { gte: startOfDay } } }),
    prisma.submission.count({ where: { solvedAt: { gte: startOfWeek } } }),
    prisma.submission.count({ where: { isFirstBlood: true } }),
    prisma.$queryRaw<DayBucket[]>`
      SELECT
        to_char(d."solvedAt" AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS date,
        COUNT(*) AS "solves",
        0::bigint AS "attempts",
        COALESCE(SUM(d."pointsAwarded"), 0)::bigint AS "points"
      FROM (
        SELECT id, "solvedAt", "pointsAwarded"
        FROM "Submission"
        WHERE "solvedAt" >= (now() - interval '13 days')
      ) d
      GROUP BY 1
      ORDER BY 1 ASC
    `,
    prisma.$queryRaw<ChallengeBucket[]>`
      SELECT
        c.id,
        c.title,
        c.slug,
        c.published,
        COUNT(DISTINCT s.id)::bigint AS "solvedCount",
        (SELECT COUNT(*) FROM "SubmissionAttempt" a WHERE a."challengeId" = c.id)::bigint AS "attemptCount",
        COALESCE(SUM(s."pointsAwarded"), 0)::bigint AS "pointsAwarded",
        COUNT(DISTINCT s.id) FILTER (WHERE s."isFirstBlood")::bigint AS "firstBloodCount"
      FROM "Challenge" c
      LEFT JOIN "Submission" s ON s."challengeId" = c.id
      GROUP BY c.id, c.title, c.slug, c.published
      ORDER BY "solvedCount" DESC, c.id ASC
      LIMIT 10
    `,
    prisma.$queryRaw<SolverBucket[]>`
      SELECT
        u.id AS "userId",
        u.username,
        COUNT(s.id)::bigint AS "solves",
        COALESCE(SUM(s."pointsAwarded"), 0)::bigint AS "points"
      FROM "User" u
      LEFT JOIN "Submission" s ON s."userId" = u.id
      GROUP BY u.id, u.username
      ORDER BY "points" DESC, "solves" DESC
      LIMIT 10
    `,
  ]);

  const last14 = new Map<string, AnalyticsOverviewDto["submissionsByDay"][number]>();
  for (let i = 13; i >= 0; i -= 1) {
    const d = new Date(startOfDay.getTime() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    last14.set(key, { date: key, solves: 0, attempts: 0, points: 0 });
  }
  for (const row of dayRows) {
    const bucket = last14.get(row.date);
    if (bucket) {
      bucket.solves += num(row.solves);
      bucket.attempts += num(row.attempts);
      bucket.points += num(row.points);
    }
  }

  return {
    totalUsers,
    activeUsers,
    totalChallenges,
    publishedChallenges,
    totalSubmissions,
    totalAttempts,
    totalPointsAwarded: totalPointsAwarded._sum.pointsAwarded ?? 0,
    solvesToday,
    solvesThisWeek,
    firstBloodCount,
    submissionsByDay: [...last14.values()],
    topChallenges: challengeRows.map((c) => ({
      id: c.id,
      title: c.title,
      slug: c.slug,
      published: c.published,
      solvedCount: num(c.solvedCount),
      attemptCount: num(c.attemptCount),
      pointsAwarded: num(c.pointsAwarded),
      firstBloodCount: num(c.firstBloodCount),
    })),
    topSolvers: solverRows.map((s) => ({
      userId: s.userId,
      username: s.username,
      solves: num(s.solves),
      points: num(s.points),
    })),
  };
}