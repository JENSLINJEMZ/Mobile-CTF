import { prisma } from "@ctf/database";
import type { PushPlatform, PushTokenDto } from "@ctf/shared";
import { Expo } from "expo-server-sdk";

import { env } from "../config/env";

export interface PushMessageInput {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

interface ExpoMessage extends PushMessageInput {
  to: string;
  sound: "default";
}

function toDto(row: {
  id: number;
  token: string;
  platform: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}): PushTokenDto {
  return {
    token: row.token,
    platform: row.platform as PushPlatform,
    enabled: row.enabled,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function registerPushToken(
  userId: number,
  token: string,
  platform: PushPlatform,
): Promise<PushTokenDto> {
  const row = await prisma.pushSubscription.upsert({
    where: { userId_token: { userId, token } },
    create: { userId, token, platform, enabled: true },
    update: { platform, enabled: true },
  });
  return toDto(row);
}

export async function unregisterPushToken(
  userId: number,
  token: string,
): Promise<void> {
  await prisma.pushSubscription.deleteMany({ where: { userId, token } });
}

export async function listPushTokens(userId: number): Promise<PushTokenDto[]> {
  const rows = await prisma.pushSubscription.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toDto);
}

async function sendToTokens(
  tokens: string[],
  input: PushMessageInput,
): Promise<number> {
  const messages: ExpoMessage[] = [];
  for (const token of tokens) {
    if (!Expo.isExpoPushToken(token)) continue;
    messages.push({
      to: token,
      sound: "default",
      title: input.title,
      body: input.body,
      data: input.data,
    });
  }
  if (messages.length === 0) return 0;
  try {
    const expo = new Expo({ accessToken: env.expoAccessToken || undefined });
    await expo.sendPushNotificationsAsync(messages);
  } catch {
    // Push is best-effort: notification creation must never fail because of it.
    return 0;
  }
  return messages.length;
}

export async function dispatchPush(
  userId: number,
  input: PushMessageInput,
): Promise<number> {
  const subs = await prisma.pushSubscription.findMany({
    where: { userId, enabled: true },
    select: { token: true },
  });
  return sendToTokens(
    subs.map((s) => s.token),
    input,
  );
}

export async function dispatchPushToUsers(
  userIds: number[],
  input: PushMessageInput,
): Promise<number> {
  if (userIds.length === 0) return 0;
  const subs = await prisma.pushSubscription.findMany({
    where: { userId: { in: userIds }, enabled: true },
    select: { token: true },
  });
  return sendToTokens(
    subs.map((s) => s.token),
    input,
  );
}