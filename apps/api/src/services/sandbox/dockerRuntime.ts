import Dockerode from "dockerode";
import type { Container, DockerOptions } from "dockerode";
import type { Duplex } from "node:stream";

import { env } from "../../config/env";
import { logger } from "../../utils/logger";
import { WorkerPool } from "../../utils/workerPool";
import type { SandboxInstance, SandboxRuntime } from "./types";

interface RunningInstance {
  containerId: string;
  stream: Duplex;
  exited: Promise<number | null>;
}

function isConflict(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  return (err as { statusCode?: number }).statusCode === 409;
}

function isContainerGone(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as { statusCode?: number; reason?: string };
  return (
    e.statusCode === 404 ||
    e.statusCode === 409 ||
    /no such container/i.test(e.reason ?? "")
  );
}

/**
 * Docker-backed sandbox runtime. Container lifecycle is confined to the pinned
 * `ctf-sandbox` image with a hardened `HostConfig`; see
 * `infrastructure/sandbox/SECURITY.md` for the full hardening table.
 */
export class DockerSandboxRuntime implements SandboxRuntime {
  readonly type = "docker";

  private readonly docker: Dockerode;
  private readonly pool: WorkerPool;
  private readonly image: string;
  private readonly instances = new Map<string, RunningInstance>();

  constructor(options?: {
    socketPath?: string;
    image?: string;
    concurrency?: number;
  }) {
    const dockerOptions: DockerOptions = {
      socketPath: options?.socketPath ?? env.sandboxSocketPath,
    };
    this.docker = new Dockerode(dockerOptions);
    this.image = options?.image ?? env.sandboxImage;
    this.pool = new WorkerPool(
      options?.concurrency ?? env.sandboxCreateConcurrency,
    );
  }

  async isAvailable(): Promise<boolean> {
    try {
      await this.docker.ping();
      return true;
    } catch (err) {
      logger.warn({ err }, "sandbox docker daemon unavailable");
      return false;
    }
  }

  async create(sessionId: string): Promise<SandboxInstance> {
    return this.pool.run(() => this.createNow(sessionId));
  }

  async write(containerId: string, data: string): Promise<void> {
    for (const instance of this.instances.values()) {
      if (instance.containerId === containerId) {
        instance.stream.write(data);
        return;
      }
    }
    logger.warn({ containerId }, "sandbox write to unknown/closed container");
  }

  async kill(containerId: string): Promise<void> {
    if (!containerId) return;
    const container = this.docker.getContainer(containerId);
    try {
      await container.kill();
    } catch (err) {
      if (isContainerGone(err)) return;
      logger.warn({ err, containerId }, "sandbox kill failed");
      throw err;
    }
  }

  private async createNow(sessionId: string): Promise<SandboxInstance> {
    const container = await this.createContainer(sessionId);
    const stream = (await container.attach({
      stream: true,
      stdin: true,
      stdout: true,
      stderr: true,
      hijack: true,
      logs: false,
    })) as unknown as Duplex;

    await container.start();

    logger.info(
      { sessionId, containerId: container.id },
      "sandbox container started",
    );

    // Register the exit wait only after start; otherwise wait on a `Created`
    // (not yet running) container resolves immediately with code 0.
    const exited = this.trackExit(sessionId, container);
    const instance = { containerId: container.id, stream, exited };
    this.instances.set(sessionId, instance);

    return instance;
  }

  private async createContainer(sessionId: string): Promise<Container> {
    const name = `ctf-tm-${sessionId}`;
    try {
      return await this.docker.createContainer({
        name,
        Image: this.image,
        Cmd: ["/bin/bash"],
        Tty: true,
        OpenStdin: true,
        StdinOnce: false,
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        WorkingDir: "/home/ctf",
        User: "ctf:ctf",
        Env: ["TERM=dumb", "HOME=/home/ctf"],
        HostConfig: {
          Memory: env.sandboxMemoryMb * 1024 * 1024,
          MemorySwap: env.sandboxMemoryMb * 1024 * 1024,
          CpuQuota: Math.round(env.sandboxCpus * 100000),
          CpuPeriod: 100000,
          PidsLimit: env.sandboxPidsLimit,
          CapDrop: ["ALL"],
          SecurityOpt: ["no-new-privileges"],
          NetworkMode: "none",
          ReadonlyRootfs: true,
          AutoRemove: true,
          Ulimits: [{ Name: "nofile", Soft: 64, Hard: 64 }],
          Tmpfs: {
            "/tmp": "rw,noexec,nosuid,nodev,size=8m",
            "/home/ctf": "rw,noexec,nosuid,nodev,size=8m",
          },
        },
      });
    } catch (err) {
      // A previous crashed/swept run may have left a stale container with the
      // same name; force-remove it and retry once before surfacing the error.
      if (isConflict(err)) {
        try {
          await this.docker.getContainer(name).remove({ force: true });
          return await this.createContainer(sessionId);
        } catch (retryErr) {
          logger.error(
            { err: retryErr, sessionId },
            "sandbox container create retry failed",
          );
          throw retryErr;
        }
      }
      logger.error({ err, sessionId }, "sandbox container create failed");
      throw err;
    }
  }

  private trackExit(
    sessionId: string,
    container: Container,
  ): Promise<number | null> {
    return container
      .wait({ condition: "not-running" })
      .then((result) => {
        const code =
          typeof result?.StatusCode === "number" ? result.StatusCode : null;
        logger.info({ sessionId, code }, "sandbox container exited");
        return code;
      })
      .catch((err: unknown) => {
        logger.error({ err, sessionId }, "sandbox container wait failed");
        throw err;
      })
      .finally(() => {
        this.instances.delete(sessionId);
      });
  }
}
