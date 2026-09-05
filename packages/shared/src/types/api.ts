import type { ErrorCode } from './enums';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: ErrorCode | string;
    message: string;
    details?: unknown;
  };
}

export interface PaginatedResult<T> {
  items: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface HealthDependency {
  status: 'up' | 'down' | 'unknown';
  latencyMs?: number;
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  version: string;
  uptime: number;
  timestamp: string;
}

export interface ReadyResponse {
  status: 'ready' | 'not_ready';
  dependencies: {
    postgres: HealthDependency;
    redis: HealthDependency;
    sandbox: HealthDependency;
  };
}