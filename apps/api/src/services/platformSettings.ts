import { prisma } from "@ctf/database";
import {
  DEFAULT_SETTINGS,
  SETTING_KEYS,
  type PlatformSettingKey,
  type PlatformSettingsDto,
  type PlatformSettingsUpdatePayload,
  type SettingsKpisDto,
  type SettingsOverviewDto,
} from "@ctf/shared";

import { env } from "../config/env";
import { checkPostgres, checkRedis } from "./dependencies";

// Storage rows are keyed by internal dotted keys ("platform.*", "system.*");
// the DTO exposes flat field names so the admin UI has a single stable shape.
const KEY_FIELD: Record<PlatformSettingKey, keyof PlatformSettingsDto> = {
  "platform.name": "name",
  "platform.tagline": "tagline",
  "platform.description": "description",
  "platform.websiteUrl": "websiteUrl",
  "platform.supportEmail": "supportEmail",
  "system.timezone": "timezone",
  "system.language": "language",
  "system.dateFormat": "dateFormat",
  "system.timeFormat": "timeFormat",
  "system.registrationEnabled": "registrationEnabled",
  "system.requireEmailVerification": "requireEmailVerification",
  "system.allowGuestAccess": "allowGuestAccess",
  "system.maintenanceMode": "maintenanceMode",
};

const FIELD_KEY = Object.fromEntries(
  Object.entries(KEY_FIELD).map(([key, field]) => [field, key]),
) as Record<keyof Omit<PlatformSettingsDto, "updatedBy" | "updatedAt">, PlatformSettingKey>;

export async function getPlatformSettings(): Promise<PlatformSettingsDto> {
  const rows = await prisma.platformSetting.findMany({
    include: { updatedBy: { select: { id: true, username: true } } },
  });
  const byKey = new Map(rows.map((row) => [row.key, row]));

  const dto = {} as Record<string, string | boolean>;
  for (const key of SETTING_KEYS) {
    const row = byKey.get(key);
    const fallback = DEFAULT_SETTINGS[key];
    dto[KEY_FIELD[key]] =
      row && typeof row.value === typeof fallback
        ? (row.value as string | boolean)
        : fallback;
  }

  let last:
    | { updatedById: number | null; updatedBy: { id: number; username: string } | null; updatedAt: Date }
    | undefined;
  for (const key of SETTING_KEYS) {
    const row = byKey.get(key);
    if (row && (!last || row.updatedAt > last.updatedAt)) last = row;
  }

  return {
    ...(dto as unknown as PlatformSettingsDto),
    updatedBy: last?.updatedBy
      ? { id: last.updatedBy.id, username: last.updatedBy.username }
      : null,
    updatedAt: last ? last.updatedAt.toISOString() : null,
  };
}

export async function updatePlatformSettings(
  actor: { id: number; username: string },
  patch: PlatformSettingsUpdatePayload,
): Promise<PlatformSettingsDto> {
  const entries = Object.entries(patch) as Array<
    [keyof Omit<PlatformSettingsDto, "updatedBy" | "updatedAt">, string | boolean]
  >;
  for (const [field, value] of entries) {
    const key = FIELD_KEY[field];
    if (!key) continue;
    await prisma.platformSetting.upsert({
      where: { key },
      update: { value, updatedById: actor.id },
      create: { key, value, updatedById: actor.id },
    });
  }
  return getPlatformSettings();
}

export async function getSettingsKpis(): Promise<SettingsKpisDto> {
  const [db, redis, totalUsers, totalChallenges, activeSandboxes] =
    await Promise.all([
      checkPostgres(),
      checkRedis(),
      prisma.user.count(),
      prisma.challenge.count(),
      prisma.terminalSession.count({
        where: { status: "RUNNING" },
      }),
    ]);
  return {
    operational: db && redis,
    environment:
      env.nodeEnv === "production"
        ? "production"
        : env.nodeEnv === "test"
          ? "test"
          : "development",
    totalUsers,
    totalChallenges,
    activeSandboxes,
  };
}

export async function getSettingsOverview(): Promise<SettingsOverviewDto> {
  const [settings, kpis] = await Promise.all([
    getPlatformSettings(),
    getSettingsKpis(),
  ]);
  return { settings, kpis };
}