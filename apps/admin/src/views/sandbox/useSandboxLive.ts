import type {
  SandboxActivityDto,
  SandboxContainerStatus,
  SandboxSnapshot,
} from "@ctf/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

import * as adminApi from "../../adminApi";
import type { Session } from "../../adminApi";

export type LiveState = "connecting" | "live" | "off";

export interface SandboxFilter {
  q: string;
  status: "all" | SandboxContainerStatus;
  user: string;
}

export interface SandboxLiveState {
  snap: SandboxSnapshot | null;
  error: string | null;
  live: LiveState;
  activity: SandboxActivityDto[];
  refresh: () => Promise<void>;
  reportError: (message: string | null) => void;
}

/** Fetches the sandbox overview (HTTP) then subscribes to the live feed. */
export function useSandboxLive(session: Session): SandboxLiveState {
  const [snap, setSnap] = useState<SandboxSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState<LiveState>("connecting");
  const [activity, setActivity] = useState<SandboxActivityDto[]>([]);
  const socketRef = useRef<Socket | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await adminApi.getSandboxOverview(session);
      setSnap(data);
      setActivity(data.activity);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sandbox overview");
    }
  }, [session]);

  useEffect(() => {
    void refresh();

    const socket = io("/admin/sandbox", {
      auth: { token: session.accessToken },
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;
    socket.on("connect", () => setLive("live"));
    socket.on("connect_error", () => setLive("off"));
    socket.on("disconnect", () => setLive("off"));
    socket.on("sandbox:snapshot", (data: SandboxSnapshot) => {
      setSnap(data);
      setError(null);
    });
    socket.on("sandbox:activity", (item: SandboxActivityDto) => {
      setActivity((prev) => [item, ...prev].slice(0, 40));
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [session, refresh]);

  return { snap, error, live, activity, refresh, reportError: setError };
}