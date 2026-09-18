import { roleHasPermission } from "@ctf/shared";
import type { SandboxActivityDto } from "@ctf/shared";
import type { Server, Socket } from "socket.io";

import {
  getSandboxSnapshot,
  onSandboxActivity,
  startSandboxEventWatch,
} from "../services/sandboxAdmin";
import { logger } from "../utils/logger";
import { authByHandshake } from "./auth";

const SNAPSHOT_INTERVAL_MS = 3000;

const clients = new Set<Socket>();
let publisher: NodeJS.Timeout | null = null;

/** True while at least one admin is looking at the sandbox page. */
function beginPublishing(): void {
  if (publisher || clients.size === 0) return;
  publisher = setInterval(() => {
    void publishSnapshot();
  }, SNAPSHOT_INTERVAL_MS);
}

function stopPublishing(): void {
  if (publisher && clients.size === 0) {
    clearInterval(publisher);
    publisher = null;
  }
}

async function publishSnapshot(): Promise<void> {
  if (clients.size === 0) return;
  try {
    const snapshot = await getSandboxSnapshot();
    for (const socket of clients) {
      socket.emit("sandbox:snapshot", snapshot);
    }
  } catch (err) {
    logger.warn({ err }, "sandbox live snapshot failed");
  }
}

export function attachSandboxAdminNamespace(io: Server): void {
  const namespace = io.of("/admin/sandbox");
  namespace.use(authByHandshake);
  namespace.use((socket, next) => {
    const role = socket.data.user?.role as string | undefined;
    if (role && roleHasPermission(role as never, "analytics.view")) {
      next();
    } else {
      next(new Error("forbidden"));
    }
  });

  namespace.on("connection", (socket) => {
    clients.add(socket);
    startSandboxEventWatch();
    logger.info(
      { sid: socket.id, user: socket.data.user?.id },
      "admin sandbox socket connected",
    );
    void publishSnapshot();
    beginPublishing();

    socket.on("disconnect", () => {
      clients.delete(socket);
      logger.info({ sid: socket.id }, "admin sandbox socket disconnected");
      stopPublishing();
    });
  });

  onSandboxActivity((item: SandboxActivityDto) => {
    if (clients.size > 0) {
      for (const socket of clients) socket.emit("sandbox:activity", item);
    }
  });
}