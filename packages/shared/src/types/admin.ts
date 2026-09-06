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