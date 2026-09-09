import type {
  TerminalCrashEvent,
  TerminalExitEvent,
  TerminalOutputEvent,
} from "@ctf/shared";
import { terminalSessionIdSchema } from "@ctf/shared";
import type { Server, Socket } from "socket.io";

import { ApiError } from "../middleware/errors";
import {
  getTerminalSession,
  sendTerminalInput,
  terminalEvents,
} from "../services/terminalSessions";
import { logger } from "../utils/logger";
import { authByHandshake } from "./auth";

const MAX_INPUT_CHARS = 16 * 1024;

const roomFor = (sessionId: string): string => `tm:${sessionId}`;

interface JoinAck {
  ok: boolean;
  error?: string;
}

interface InputAck {
  ok: boolean;
  error?: string;
}

export function attachTerminalNamespace(io: Server): void {
  const terminalNamespace = io.of("/terminal");
  terminalNamespace.use(authByHandshake);

  terminalNamespace.on("connection", (socket) => {
    logger.info(
      { sid: socket.id, user: socket.data.user?.id },
      "terminal socket connected",
    );

    socket.on(
      "terminal:join",
      (payload: unknown, ack?: (reply: JoinAck) => void) => {
        void joinHandler(socket, payload, ack);
      },
    );

    socket.on(
      "terminal:input",
      (payload: unknown, ack?: (reply: InputAck) => void) => {
        void inputHandler(socket, payload, ack);
      },
    );

    socket.on("disconnect", () => {
      logger.info({ sid: socket.id }, "terminal socket disconnected");
    });
  });

  terminalEvents.on("output", (event: TerminalOutputEvent) => {
    terminalNamespace
      .to(roomFor(event.sessionId))
      .emit("terminal:output", event);
  });

  terminalEvents.on("exit", (event: TerminalExitEvent) => {
    terminalNamespace.to(roomFor(event.sessionId)).emit("terminal:exit", event);
  });

  terminalEvents.on("crash", (event: TerminalCrashEvent) => {
    terminalNamespace.to(roomFor(event.sessionId)).emit("terminal:crash", event);
  });
}

async function joinHandler(
  socket: Socket,
  payload: unknown,
  ack?: (reply: JoinAck) => void,
): Promise<void> {
  const sessionId = parseSessionId(payload);
  if (!sessionId) {
    ack?.({ ok: false, error: "invalid session id" });
    return;
  }
  try {
    const session = await getTerminalSession(socket.data.user.id, sessionId);
    if (session.status !== "RUNNING") {
      ack?.({ ok: false, error: "session is not running" });
      return;
    }
    await socket.join(roomFor(sessionId));
    ack?.({ ok: true });
  } catch (err) {
    ack?.({ ok: false, error: messageOf(err) });
  }
}

async function inputHandler(
  socket: Socket,
  payload: unknown,
  ack?: (reply: InputAck) => void,
): Promise<void> {
  const { sessionId, data } = parseInput(payload);
  if (!sessionId) {
    ack?.({ ok: false, error: "invalid session id" });
    return;
  }
  if (!socket.rooms.has(roomFor(sessionId))) {
    ack?.({ ok: false, error: "join the session first" });
    return;
  }
  if (data === undefined || data.length > MAX_INPUT_CHARS) {
    ack?.({ ok: false, error: "invalid input payload" });
    return;
  }
  try {
    await sendTerminalInput(socket.data.user.id, sessionId, data);
    ack?.({ ok: true });
  } catch (err) {
    socket.emit("terminal:error", { sessionId, message: messageOf(err) });
    ack?.({ ok: false, error: messageOf(err) });
  }
}

function parseSessionId(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const raw = (payload as { sessionId?: unknown }).sessionId;
  if (typeof raw !== "string") return null;
  return terminalSessionIdSchema.safeParse(raw).success ? raw : null;
}

function parseInput(payload: unknown): {
  sessionId: string | null;
  data: string | undefined;
} {
  const sessionId = parseSessionId(payload);
  const data =
    typeof payload === "object" && payload !== null
      ? (payload as { data?: unknown }).data
      : undefined;
  return { sessionId, data: typeof data === "string" ? data : undefined };
}

function messageOf(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  return "request failed";
}
