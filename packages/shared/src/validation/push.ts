import { z } from "zod";

export const registerPushTokenSchema = z.object({
  token: z.string().trim().min(10).max(512),
  platform: z.enum(["android", "ios", "web"]).default("android"),
});

export const unregisterPushTokenSchema = z.object({
  token: z.string().trim().min(10).max(512),
});