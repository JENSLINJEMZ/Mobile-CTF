export * from "./permissions";

export const APP_NAME = "CTF Platform";
export const APP_VERSION = "0.1.0";
export const API_VERSION = "v1";
export const API_PREFIX = "/api";

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

export const AUTH = {
  ACCESS_TTL_SECONDS: 900,
  REFRESH_TTL_SECONDS: 604800,
  PASSWORD_RESET_TTL_SECONDS: 3600,
  BCRYPT_ROUNDS_DEFAULT: 12,
  MIN_PASSWORD_LEN: 8,
  MAX_PASSWORD_LEN: 128,
} as const;

export const RATE_LIMITS = {
  LOGIN_PER_MIN: 5,
  SUBMISSION_PER_MIN_PER_USER: 5,
  GENERAL_PER_MIN_PER_USER: 100,
  UPLOAD_PER_MIN_PER_USER: 20,
} as const;

export const CHALLENGE = {
  FLAG_PREFIX: "ctf{",
  FIRST_BLOOD_BONUS_PERCENT: 10,
  SEARCH_MIN_CHARS: 2,
} as const;

export const LEADERBOARD = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  SCOPES: ["global", "daily", "weekly"] as const,
} as const;

export const TERMINAL = {
  DEFAULT_TTL_SECONDS: 30 * 60,
  MAX_ACTIVE_PER_USER: 2,
  MAX_OUTPUT_LENGTH: 64 * 1024,
  SESSION_NAMESPACE: "/terminal",
} as const;

export const TEAM = {
  MAX_MEMBERS: 5,
  JOIN_CODE_LENGTH: 6,
  INVITE_CODE_LENGTH: 8,
} as const;

export const EVENT = {
  LEADERBOARD_DEFAULT_LIMIT: 50,
  LEADERBOARD_MAX_LIMIT: 100,
} as const;

export const STORAGE_KEYS = {
  ACCESS_TOKEN: "ctf.accessToken",
  REFRESH_TOKEN: "ctf.refreshToken",
  OFFLINE_QUEUE: "ctf.offlineQueue",
} as const;

export const FILE = {
  MAX_SIZE_BYTES: 25 * 1024 * 1024,
  DOWNLOAD_URL_TTL_SECONDS: 300,
  ALLOWED_MIME_TYPES: [
    "text/plain",
    "text/markdown",
    "text/csv",
    "application/json",
    "application/pdf",
    "application/zip",
    "application/gzip",
    "application/x-tar",
    "application/octet-stream",
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
  ] as const,
} as const;

export const NOTIFICATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  TYPES: ["SYSTEM", "ANNOUNCEMENT", "ACHIEVEMENT", "TEAM_INVITE", "EVENT"] as const,
} as const;

export const AUDIT = {
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 100,
} as const;
