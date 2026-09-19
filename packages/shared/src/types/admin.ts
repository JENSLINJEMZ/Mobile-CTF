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

export type TeamAdminStatus = "active" | "inactive";

export interface TeamAdminDto {
  id: number;
  name: string;
  slug: string;
  joinCode: string;
  description: string | null;
  memberCount: number;
  leaderUsername: string | null;
  createdAt: string;
  status: TeamAdminStatus;
  points: number;
  solves: number;
  rank: number;
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

export interface TeamMemberAdminDto {
  userId: number;
  username: string;
  role: "LEADER" | "MEMBER";
  isActive: boolean;
  joinedAt: string;
  lastActiveAt: string | null;
}

export interface TeamActivityDto {
  id: number;
  type: "solve" | "join";
  username: string;
  challenge: string | null;
  points: number;
  at: string;
}

export interface TeamPerformancePointDto {
  date: string;
  points: number;
  solves: number;
}

export interface TeamAdminDetailDto {
  team: TeamAdminDto;
  members: TeamMemberAdminDto[];
  performance: TeamPerformancePointDto[];
  activity: TeamActivityDto[];
}

export type SubmissionResultKey = "all" | "correct" | "incorrect";

export interface SubmissionAdminRowDto {
  id: number;
  time: string;
  userId: number;
  username: string;
  teamId: number | null;
  teamName: string | null;
  challengeId: number;
  challenge: string;
  flagHash: string;
  correct: boolean;
}

export interface SubmissionAdminListResult {
  items: SubmissionAdminRowDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface SubmissionKpiDto {
  total: number;
  correct: number;
  incorrect: number;
  uniqueUsers: number;
  solveRatePct: number;
  totalChangePct: number;
  correctChangePct: number;
  incorrectChangePct: number;
  usersChangePct: number;
}

export interface SubmissionByDayPoint {
  date: string;
  total: number;
  correct: number;
  users: number;
}

export interface SubmissionTopUserDto {
  userId: number;
  username: string;
  count: number;
}

export interface SubmissionTopTeamDto {
  teamId: number;
  name: string;
  count: number;
}

export interface SubmissionTopChallengeDto {
  challengeId: number;
  title: string;
  count: number;
  pct: number;
}

export interface SubmissionRecentDto {
  id: number;
  userId: number;
  username: string;
  challengeId: number;
  challenge: string;
  time: string;
}

export interface SubmissionFilterOption {
  id: number;
  label: string;
}

export interface SubmissionFilterOptionsDto {
  challenges: SubmissionFilterOption[];
  users: SubmissionFilterOption[];
  teams: SubmissionFilterOption[];
}

export interface SubmissionOverviewDto {
  kpis: SubmissionKpiDto;
  byDay: SubmissionByDayPoint[];
  status: { total: number; correct: number; incorrect: number };
  topTeams: SubmissionTopTeamDto[];
  topUsers: SubmissionTopUserDto[];
  topChallenges: SubmissionTopChallengeDto[];
  recentCorrect: SubmissionRecentDto[];
  filters: SubmissionFilterOptionsDto;
}

export interface AnnouncementAdminRowDto {
  id: number;
  pinned: boolean;
  title: string;
  body: string;
  excerpt: string;
  authorId: number;
  authorUsername: string;
  createdAt: string;
  updatedAt: string;
}

export interface AnnouncementAdminListResult {
  items: AnnouncementAdminRowDto[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface AnnouncementKpiDto {
  total: number;
  pinned: number;
  last7: number;
  authors: number;
  totalChangePct: number;
  pinnedChangePct: number;
  last7ChangePct: number;
  authorsChangePct: number;
}

export interface AnnouncementRecentDto {
  id: number;
  title: string;
  pinned: boolean;
  username: string;
  createdAt: string;
}

export interface AnnouncementOverviewDto {
  kpis: AnnouncementKpiDto;
  recent: AnnouncementRecentDto[];
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

export interface AnalyticsKpiPoint {
  value: number;
  changePct: number;
  sparkline: number[];
}

export interface AnalyticsKpis {
  totalUsers: AnalyticsKpiPoint;
  activeUsers: AnalyticsKpiPoint;
  totalSubmissions: AnalyticsKpiPoint;
  correctSubmissions: AnalyticsKpiPoint;
  pointsAwarded: AnalyticsKpiPoint;
  challenges: AnalyticsKpiPoint;
}

export interface AnalyticsUserGrowthPoint {
  date: string;
  total: number;
  newUsers: number;
}

export interface AnalyticsHourlyPoint {
  hour: string;
  count: number;
}

export interface AnalyticsCategoryPoint {
  name: string;
  count: number;
  pct: number;
  color: string;
}

export interface AnalyticsDifficultyItem {
  count: number;
  solves: number;
  pct: number;
}

export interface AnalyticsRolePoint {
  role: string;
  label: string;
  count: number;
  pct: number;
  color: string;
}

export interface AnalyticsDifficultyStats {
  easy: AnalyticsDifficultyItem;
  medium: AnalyticsDifficultyItem;
  hard: AnalyticsDifficultyItem;
  expert: AnalyticsDifficultyItem;
}

export interface AnalyticsHeatmapCell {
  day: number;
  hour: number;
  level: number;
  count: number;
}

export interface AnalyticsTopUserRow {
  rank: number;
  userId: number;
  username: string;
  teamName: string | null;
  points: number;
  solves: number;
}

export interface AnalyticsTopTeamRow {
  rank: number;
  teamId: number;
  name: string;
  members: number;
  points: number;
}

export interface AnalyticsEventPerfRow {
  id: number;
  name: string;
  start: string;
  end: string;
  participants: number;
  solves: number;
}

export interface AnalyticsRecentActivityRow {
  id: string;
  text: string;
  time: string;
  pts: string;
  icon: string;
  color: string;
}

export interface AnalyticsPlatformHealth {
  services: Array<{ key: string; name: string; ok: boolean; val: string }>;
  summary: {
    uptime: string;
    avgResponse: string;
    ramUsage: string;
    activeSandboxes: number;
  };
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
  kpis?: AnalyticsKpis;
  userGrowth?: AnalyticsUserGrowthPoint[];
  hourlyActivity?: AnalyticsHourlyPoint[];
  categoryDistribution?: AnalyticsCategoryPoint[];
  difficultyDistribution?: AnalyticsDifficultyStats;
  userRoleDistribution?: AnalyticsRolePoint[];
  heatmap?: AnalyticsHeatmapCell[];
  topUsersTable?: AnalyticsTopUserRow[];
  topTeamsTable?: AnalyticsTopTeamRow[];
  eventPerformance?: AnalyticsEventPerfRow[];
  recentActivity?: AnalyticsRecentActivityRow[];
  platformHealth?: AnalyticsPlatformHealth;
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