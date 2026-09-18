import type { Role } from "./enums";

export type Permission =
  | "content.manage"
  | "events.manage"
  | "announcements.manage"
  | "users.manage"
  | "teams.moderate"
  | "analytics.view"
  | "audit.view"
  | "notifications.broadcast"
  | "files.upload";

export interface AuditLogDto {
  id: number;
  actorId: number | null;
  actorUsername: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface AuditLogListResult {
  items: AuditLogDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface UserAdminDto {
  id: number;
  email: string;
  username: string;
  role: Role;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  solveCount: number;
  totalScore: number;
}

export interface UserAdminListResult {
  items: UserAdminDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export type SystemServiceKey =
  | "api"
  | "database"
  | "redis"
  | "docker"
  | "fileStorage"
  | "sandbox"
  | "proxy"
  | "mail";

export interface SystemStatusServiceDto {
  key: SystemServiceKey;
  ok: boolean;
  detail?: string | null;
}

export interface SystemStatusResourcesDto {
  cpuCount: number;
  cpuModel: string;
  load1: number;
  load5: number;
  load15: number;
  memoryTotalBytes: number;
  memoryUsedBytes: number;
  processRssBytes: number;
  uptimeSeconds: number;
  version: string;
}

export interface StorageBucketDto {
  name: string;
  bytes: number;
  color: string;
}

export interface SystemStorageDto {
  path: string;
  usedBytes: number;
  totalBytes: number;
  buckets: StorageBucketDto[];
}

export interface SystemStatusDto {
  checkedAt: string;
  services: SystemStatusServiceDto[];
  resources: SystemStatusResourcesDto;
  storage: SystemStorageDto;
}

export interface UserUpdatePayload {
  role?: Role;
  isActive?: boolean;
}

export interface TeamAdminDto {
  id: number;
  name: string;
  slug: string;
  joinCode: string;
  description: string | null;
  memberCount: number;
  leaderUsername: string | null;
  createdAt: string;
}

export interface TeamAdminListResult {
  items: TeamAdminDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface AnalyticsDayPoint {
  date: string;
  solves: number;
  attempts: number;
  points: number;
}

export interface AnalyticsChallengeRow {
  id: number;
  title: string;
  slug: string;
  published: boolean;
  solvedCount: number;
  attemptCount: number;
  pointsAwarded: number;
  firstBloodCount: number;
}

export interface AnalyticsSolverRow {
  userId: number;
  username: string;
  solves: number;
  points: number;
}

export interface AnalyticsOverviewDto {
  totalUsers: number;
  activeUsers: number;
  totalChallenges: number;
  publishedChallenges: number;
  totalSubmissions: number;
  totalAttempts: number;
  totalPointsAwarded: number;
  solvesToday: number;
  solvesThisWeek: number;
  firstBloodCount: number;
  submissionsByDay: AnalyticsDayPoint[];
  topChallenges: AnalyticsChallengeRow[];
  topSolvers: AnalyticsSolverRow[];
}

export interface FileDto {
  id: number;
  originalName: string;
  storageName: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  downloadCount: number;
  uploaderUsername: string | null;
  createdAt: string;
  url: string | null;
}

export interface FileListResult {
  items: FileDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ChallengeVersionDto {
  id: number;
  version: number;
  title: string;
  description: string;
  difficulty: string;
  basePoints: number;
  changeSummary: string | null;
  createdAt: string;
  authorUsername: string;
}

export interface NotificationDto {
  id: number;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationsResponse {
  items: NotificationDto[];
  unreadCount: number;
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// --- Sandbox manager ------------------------------------------------------

export interface SandboxHostDto {
  name: string;
  os: string;
  arch: string;
  product: string;
  cores: number;
  memTotalBytes: number;
  dockerRootDir: string;
  dockerApiVersion: string;
}

export type SandboxContainerStatus =
  | "running"
  | "paused"
  | "stopped"
  | "created";

export interface SandboxContainerUserDto {
  id: number;
  username: string;
}

export interface SandboxContainerDto {
  id: string;
  sessionId: string | null;
  name: string;
  image: string;
  status: SandboxContainerStatus;
  state: string;
  user: SandboxContainerUserDto | null;
  cpu: number;
  ramMb: number;
  cpuPct: number | null;
  memBytes: number | null;
  memPct: number | null;
  uptimeSeconds: number | null;
  createdAt: string | null;
  expiresAt: string | null;
  networkMode: string;
  ipAddress: string | null;
  rxBytes: number;
  txBytes: number;
  exportPort: string | null;
}

export interface SandboxKpisDto {
  running: number;
  stopped: number;
  paused: number;
  total: number;
  activeUsers: number;
  storageUsedBytes: number;
  storageTotalBytes: number;
  avgSessionMinutes: number;
}

export interface SandboxResourcesDto {
  cpu: { load: number; cores: number; pct: number };
  memory: { used: number; total: number; pct: number };
  storage: { used: number; total: number; pct: number };
  network: { rxBytes: number; txBytes: number };
}

export interface SandboxTrendPoint {
  date: string;
  running: number;
  stopped: number;
  total: number;
}

export interface SandboxCategoryPoint {
  name: string;
  value: number;
  color: string;
}

export interface SandboxActivityDto {
  id: string;
  time: number;
  text: string;
  color: string;
  icon: string;
}

export interface SandboxLimitsDto {
  image: string;
  maxCpuPerEnv: number;
  maxRamPerEnvMb: number;
  maxConcurrent: number;
  pidsLimit: number;
  sessionTimeoutSeconds: number;
}

export interface SandboxSnapshot {
  at: string;
  daemonUp: boolean;
  host: SandboxHostDto | null;
  kpis: SandboxKpisDto;
  containers: SandboxContainerDto[];
  resources: SandboxResourcesDto;
  trends: SandboxTrendPoint[];
  categories: SandboxCategoryPoint[];
  activity: SandboxActivityDto[];
  limits: SandboxLimitsDto;
}