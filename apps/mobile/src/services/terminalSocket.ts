import type {
  TerminalCrashEvent,
  TerminalExitEvent,
  TerminalOutputEvent,
} from "@ctf/shared";
import type { Socket } from "socket.io-client";

import { API_URL } from "./http";
import { connectAuthenticatedSocket } from "./authenticated-socket";

export function terminalEndpoint(): string {
  return `${API_URL}/terminal`;
}

interface Ack {
  ok: boolean;
  error?: string;
}

const outputHandlers = new Set<(event: TerminalOutputEvent) => void>();
const exitHandlers = new Set<(event: TerminalExitEvent) => void>();
const crashHandlers = new Set<(event: TerminalCrashEvent) => void>();
const errorHandlers = new Set<(message: string) => void>();

let socket: Socket | null = null;
let joinedSessionId: string | null = null;

function emitWithAck(event: string, payload: unknown): Promise<Ack> {
  const active = socket;
  if (!active || !active.connected) {
    return Promise.reject(new Error("Terminal is not connected"));
  }
  return new Promise<Ack>((resolve, reject) => {
    active
      .timeout(5000)
      .emit(event, payload, (err: Error | null, reply?: Ack) => {
        if (err)
          reject(
            new Error(
              err instanceof Error ? err.message : "Terminal timed out",
            ),
          );
        else resolve(reply ?? { ok: false });
      });
  });
}

export async function connectTerminalSocket(sessionId: string): Promise<void> {
  disconnectTerminalSocket();
  joinedSessionId = sessionId;
  socket = await connectAuthenticatedSocket(terminalEndpoint(), (s) => {
    s.on("terminal:output", (event: TerminalOutputEvent) => {
      for (const handler of outputHandlers) handler(event);
    });
    s.on("terminal:exit", (event: TerminalExitEvent) => {
      for (const handler of exitHandlers) handler(event);
    });
    s.on("terminal:crash", (event: TerminalCrashEvent) => {
      for (const handler of crashHandlers) handler(event);
    });
    s.on("terminal:error", (payload: { message?: string }) => {
      const message = payload?.message ?? "Terminal error";
      for (const handler of errorHandlers) handler(message);
    });
  });

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    const onConnect = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };
    const onError = (err: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(err);
    };
    const cleanup = () => {
      socket?.off("connect", onConnect);
      socket?.off("connect_error", onError);
    };
    socket?.on("connect", onConnect);
    socket?.on("connect_error", onError);
    setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("Terminal connection timed out"));
    }, 8000);
  });

  const join = await emitWithAck("terminal:join", { sessionId });
  if (!join.ok) {
    throw new Error(join.error ?? "Failed to join terminal session");
  }
}

export async function sendTerminalInput(data: string): Promise<void> {
  const reply = await emitWithAck("terminal:input", {
    sessionId: joinedSessionId,
    data,
  });
  if (!reply.ok) throw new Error(reply.error ?? "Terminal rejected input");
}

export function disconnectTerminalSocket(): void {
  socket?.disconnect();
  socket = null;
  joinedSessionId = null;
}

export function subscribeTerminalOutput(
  handler: (event: TerminalOutputEvent) => void,
): () => void {
  outputHandlers.add(handler);
  return () => {
    outputHandlers.delete(handler);
  };
}

export function subscribeTerminalExit(
  handler: (event: TerminalExitEvent) => void,
): () => void {
  exitHandlers.add(handler);
  return () => {
    exitHandlers.delete(handler);
  };
}

export function subscribeTerminalCrash(
  handler: (event: TerminalCrashEvent) => void,
): () => void {
  crashHandlers.add(handler);
  return () => {
    crashHandlers.delete(handler);
  };
}

export function subscribeTerminalError(
  handler: (message: string) => void,
): () => void {
  errorHandlers.add(handler);
  return () => {
    errorHandlers.delete(handler);
  };
}