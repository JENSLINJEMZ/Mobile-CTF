import type { Duplex } from 'node:stream';

export interface SandboxInstance {
  containerId: string;
  /** Duplex attach stream: write() sends stdin, 'data' events carry stdout/stderr. */
  stream: Duplex;
  /** Resolves with the container exit code when it stops (or rejects on fatal error). */
  exited: Promise<number | null>;
}

export interface SandboxRuntime {
  readonly type: string;
  /** Create and start a hardened container scoped to `sessionId`. */
  create(sessionId: string): Promise<SandboxInstance>;
  /** Write a chunk to the container's stdin. */
  write(containerId: string, data: string): Promise<void>;
  /** Force-stop (and auto-remove) a container. Safe to call more than once. */
  kill(containerId: string): Promise<void>;
  /** Whether the underlying sandbox daemon is reachable. */
  isAvailable(): Promise<boolean>;
}