import { z } from "zod";

import { AUTH } from "../constants";

export const emailSchema = z.string().trim().toLowerCase().email().max(254);

export const usernameSchema = z
  .string()
  .trim()
  .regex(
    /^[a-zA-Z0-9_-]{3,32}$/,
    '3-32 characters: letters, digits, "_" or "-"',
  );

export const passwordSchema = z
  .string()
  .min(
    AUTH.MIN_PASSWORD_LEN,
    `Password must be at least ${AUTH.MIN_PASSWORD_LEN} characters`,
  )
  .max(AUTH.MAX_PASSWORD_LEN);

export const refreshTokenSchema = z.string().min(20).max(1024);

export const registerSchema = z.object({
  email: emailSchema,
  username: usernameSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, "Password is required")
    .max(AUTH.MAX_PASSWORD_LEN),
});

export const refreshSchema = z.object({
  refreshToken: refreshTokenSchema,
});

export const logoutSchema = z.object({
  refreshToken: refreshTokenSchema,
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(1024),
  newPassword: passwordSchema,
});
