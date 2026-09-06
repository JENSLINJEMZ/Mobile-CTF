import type { AchievementCode, AchievementDto } from "@ctf/shared";
import { NotificationType } from "@ctf/shared";
import { prisma } from "@ctf/database";

import { createNotification } from "./notifications";

interface AchievementDef {
  code: AchievementCode;
  title: string;
  description: string;
  icon: string | null;
  sortOrder: number;
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDef[] = [
  {
    code: "FIRST_SOLVE",
    title: "First Blood",
    description: "Submit your first correct flag.",
    icon: "🏆",
    sortOrder: 1,
  },
  {
    code: "SOLVE_10",
    title: "Decade",
    description: "Solve 10 challenges.",
    icon: "🎯",
    sortOrder: 2,
  },
  {
    code: "SOLVE_50",
    title: "Grand Master",
    description: "Solve 50 challenges.",
    icon: "👑",
    sortOrder: 3,
  },
  {
    code: "FIRST_BLOOD",
    title: "True First Blood",
    description: "Be the first person in the world to solve a challenge.",
    icon: "🩸",
    sortOrder: 4,
  },
  {
    code: "STREAK_3",
    title: "Three in a Row",
    description: "Solve a challenge on 3 consecutive days.",
    icon: "🔥",
    sortOrder: 5,
  },
  {
    code: "STREAK_7",
    title: "Weekly Grind",
    description: "Solve a challenge on 7 consecutive days.",
    icon: "⚡",
    sortOrder: 6,
  },
  {
    code: "TEAM_PLAYER",
    title: "Team Player",
    description: "Create or join a team.",
    icon: "🤝",
    sortOrder: 7,
  },
  {
    code: "CURATOR",
    title: "Curator",
    description: "Bookmark your first challenge.",
    icon: "📌",
    sortOrder: 8,
  },
  {
    code: "EVENT_ALUMNI",
    title: "Event Alumni",
    description: "Join a competition event.",
    icon: "🎟️",
    sortOrder: 9,
  },
];

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function longestStreak(days: string[]): number {
  const unique = [...new Set(days)].sort();
  let best = 0;
  let run = 0;
  let prev = "";
  for (const day of unique) {
    if (
      prev &&
      new Date(`${day}T00:00:00Z`).getTime() -
        new Date(`${prev}T00:00:00Z`).getTime() ===
        86400000
    ) {
      run += 1;
    } else {
      run = 1;
    }
    best = Math.max(best, run);
    prev = day;
  }
  return best;
}

async function evaluateCodes(userId: number): Promise<Set<AchievementCode>> {
  const [solves, teamMemberships, bookmarks, eventParticipants] =
    await Promise.all([
      prisma.submission.findMany({
        where: { userId },
        select: { solvedAt: true, isFirstBlood: true },
      }),
      prisma.teamMember.count({ where: { userId } }),
      prisma.bookmark.count({ where: { userId } }),
      prisma.eventParticipant.count({ where: { userId } }),
    ]);

  const earned = new Set<AchievementCode>();
  const solveCount = solves.length;
  if (solveCount >= 1) earned.add("FIRST_SOLVE");
  if (solveCount >= 10) earned.add("SOLVE_10");
  if (solveCount >= 50) earned.add("SOLVE_50");
  if (solves.some((s) => s.isFirstBlood)) earned.add("FIRST_BLOOD");

  const streak = longestStreak(solves.map((s) => dateKey(s.solvedAt)));
  if (streak >= 7) earned.add("STREAK_7");
  if (streak >= 3) earned.add("STREAK_3");

  if (teamMemberships >= 1) earned.add("TEAM_PLAYER");
  if (bookmarks >= 1) earned.add("CURATOR");
  if (eventParticipants >= 1) earned.add("EVENT_ALUMNI");
  return earned;
}

export async function evaluateAndGrantAchievements(
  userId: number,
): Promise<AchievementCode[]> {
  const candidateCodes = await evaluateCodes(userId);
  if (candidateCodes.size === 0) return [];

  const defsByCode = new Map(ACHIEVEMENT_DEFINITIONS.map((d) => [d.code, d]));
  const [alreadyEarned, achievementRows] = await Promise.all([
    prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true },
    }),
    prisma.achievement.findMany({ select: { id: true, code: true } }),
  ]);
  const earnedIds = new Set(alreadyEarned.map((e) => e.achievementId));
  const idByCode = new Map(achievementRows.map((a) => [a.code, a.id]));

  const newlyEarned: AchievementCode[] = [];
  for (const code of candidateCodes) {
    const def = defsByCode.get(code);
    if (!def) continue;
    const achievementId = idByCode.get(def.code);
    if (achievementId === undefined || earnedIds.has(achievementId)) continue;
    await prisma.userAchievement.create({
      data: { userId, achievementId },
    });
    await createNotification({
      userId,
      type: NotificationType.ACHIEVEMENT,
      title: `Achievement unlocked: ${def.title}`,
      body: def.description,
      data: { code: def.code },
    });
    newlyEarned.push(def.code);
  }
  return newlyEarned;
}

export async function getAchievements(userId: number | undefined): Promise<{
  items: AchievementDto[];
  earnedCount: number;
}> {
  const [achievementRows, earned] = await Promise.all([
    prisma.achievement.findMany(),
    userId === undefined
      ? Promise.resolve([])
      : prisma.userAchievement.findMany({
          where: { userId },
          select: { achievementId: true, earnedAt: true },
        }),
  ]);
  const idByCode = new Map(achievementRows.map((a) => [a.code, a.id]));
  const earnedAtByAchievementId = new Map(
    earned.map((e) => [e.achievementId, e.earnedAt.toISOString()]),
  );

  const codeOrder = new Map(ACHIEVEMENT_DEFINITIONS.map((d, i) => [d.code, i]));

  const items = ACHIEVEMENT_DEFINITIONS.map((def) => ({
    code: def.code,
    title: def.title,
    description: def.description,
    icon: def.icon,
    earnedAt: earnedAtByAchievementId.get(idByCode.get(def.code) ?? -1) ?? null,
  })).sort(
    (a, b) => (codeOrder.get(a.code) ?? 0) - (codeOrder.get(b.code) ?? 0),
  );

  return { items, earnedCount: earned.length };
}

export async function ensureAchievementDefinitions(): Promise<void> {
  for (const def of ACHIEVEMENT_DEFINITIONS) {
    await prisma.achievement.upsert({
      where: { code: def.code },
      update: {
        title: def.title,
        description: def.description,
        icon: def.icon,
        sortOrder: def.sortOrder,
      },
      create: {
        code: def.code,
        title: def.title,
        description: def.description,
        icon: def.icon,
        sortOrder: def.sortOrder,
      },
    });
  }
}
