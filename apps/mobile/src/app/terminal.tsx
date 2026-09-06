import type {
  TerminalExitEvent,
  TerminalOutputEvent,
  TerminalSessionDto,
} from "@ctf/shared";
import { Link } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { ScreenShell } from "@/components/screen-shell";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Fonts, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAuthStore } from "@/store/auth-store";
import {
  createTerminalSession,
  closeTerminalSession,
  listTerminalSessions,
} from "@/services/terminal";
import {
  connectTerminalSocket,
  disconnectTerminalSocket,
  sendTerminalInput,
  subscribeTerminalError,
  subscribeTerminalExit,
  subscribeTerminalOutput,
} from "@/services/terminalSocket";

const MAX_OUTPUT_CHARS = 64 * 1024;

const STATUS_LABELS: Record<TerminalSessionDto["status"], string> = {
  CREATING: "starting",
  RUNNING: "running",
  CLOSED: "closed",
  EXPIRED: "expired",
  FAILED: "failed",
};

function isActive(status: TerminalSessionDto["status"]): boolean {
  return status === "RUNNING" || status === "CREATING";
}

export default function TerminalScreen() {
  const authStatus = useAuthStore((s) => s.status);
  const theme = useTheme();

  const [sessions, setSessions] = useState<TerminalSessionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [output, setOutput] = useState("");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exitNote, setExitNote] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const mountedRef = useRef(true);

  const isAuthenticated = authStatus === "authenticated";

  const load = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    setError(null);
    try {
      const results = await listTerminalSessions();
      setSessions(results);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load terminal sessions",
      );
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    mountedRef.current = true;
    void load();
    return () => {
      mountedRef.current = false;
      disconnectTerminalSocket();
    };
  }, [load]);

  const openSession = useCallback(
    async (sessionId: string) => {
      if (busy) return;
      setBusy(true);
      setError(null);
      setExitNote(null);
      setOutput("");
      try {
        await connectTerminalSocket(sessionId);
        if (!mountedRef.current) return;
        setActiveId(sessionId);
        setConnected(true);
      } catch (err) {
        if (mountedRef.current) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to connect to the terminal",
          );
          void load();
        }
      } finally {
        if (mountedRef.current) setBusy(false);
      }
    },
    [busy, load],
  );

  const createNew = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setExitNote(null);
    try {
      const session = await createTerminalSession();
      setSessions((prev) => [session, ...prev]);
      await openSession(session.id);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to start a sandbox session",
      );
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  }, [busy, openSession]);

  const closeActive = useCallback(async () => {
    if (!activeId) return;
    const id = activeId;
    setBusy(true);
    setError(null);
    try {
      const closed = await closeTerminalSession(id);
      setSessions((prev) => prev.map((s) => (s.id === id ? closed : s)));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to close the session",
      );
    } finally {
      disconnectTerminalSocket();
      setConnected(false);
      setActiveId(null);
      setOutput("");
      if (mountedRef.current) setBusy(false);
    }
  }, [activeId]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const offOutput = subscribeTerminalOutput((event: TerminalOutputEvent) => {
      setOutput((prev) => {
        const next = prev + event.data;
        return next.length > MAX_OUTPUT_CHARS
          ? next.slice(-MAX_OUTPUT_CHARS)
          : next;
      });
    });
    const offExit = subscribeTerminalExit((event: TerminalExitEvent) => {
      setConnected(false);
      setExitNote(`Session ended (exit code ${event.code ?? "n/a"})`);
      disconnectTerminalSocket();
      void load();
    });
    const offError = subscribeTerminalError((message: string) => {
      setError(message);
    });
    return () => {
      offOutput();
      offExit();
      offError();
    };
  }, [isAuthenticated, connected, load]);

  useEffect(() => {
    if (output.length > 0) {
      const frame = requestAnimationFrame(() => {
        scrollRef.current?.scrollToEnd({ animated: false });
      });
      return () => cancelAnimationFrame(frame);
    }
    return undefined;
  }, [output]);

  const submitInput = useCallback(() => {
    const command = input;
    if (!command || !connected) return;
    setInput("");
    void sendTerminalInput(`${command}\n`).catch((err) => {
      setError(err instanceof Error ? err.message : "Failed to send input");
    });
  }, [input, connected]);

  const activeSession = sessions.find((s) => s.id === activeId) ?? null;
  const terminalOutput = output;

  return (
    <ScreenShell title="Terminal">
      {!isAuthenticated ? (
        <ThemedView type="backgroundElement" style={styles.promptCard}>
          <ThemedText type="small">
            Run commands in an isolated, auto-expiring Linux container.
          </ThemedText>
          <Link href="/auth/login" asChild>
            <Pressable style={styles.signInButton}>
              <ThemedText style={styles.signInLabel}>
                Sign in to open a terminal
              </ThemedText>
            </Pressable>
          </Link>
        </ThemedView>
      ) : null}

      {isAuthenticated && !activeSession ? (
        <>
          <ThemedView style={styles.actionsRow}>
            <Pressable
              onPress={() => void createNew()}
              disabled={busy || loading}
              style={({ pressed }) => [
                styles.createButton,
                pressed && styles.cardPressed,
              ]}
            >
              {busy ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <ThemedText style={styles.createLabel}>
                  Open terminal session
                </ThemedText>
              )}
            </Pressable>
            <Pressable
              onPress={() => void load()}
              disabled={busy}
              style={({ pressed }) => [
                styles.refreshButton,
                pressed && styles.cardPressed,
              ]}
            >
              <ThemedText type="small" themeColor="textSecondary">
                Refresh
              </ThemedText>
            </Pressable>
          </ThemedView>

          {error ? (
            <ThemedText type="small" style={styles.errorText}>
              {error} — tap to retry
            </ThemedText>
          ) : null}

          {loading ? (
            <ActivityIndicator style={{ marginTop: Spacing.four }} />
          ) : sessions.length === 0 ? (
            <ThemedView type="backgroundElement" style={styles.promptCard}>
              <ThemedText type="small" themeColor="textSecondary">
                No terminal sessions yet. Sessions auto-expire after 30 minutes.
              </ThemedText>
            </ThemedView>
          ) : (
            <ScrollView contentContainerStyle={styles.listContent}>
              {sessions.map((session) => {
                const active = isActive(session.status);
                return (
                  <ThemedView
                    key={session.id}
                    type="backgroundElement"
                    style={styles.row}
                  >
                    <View style={styles.rowInfo}>
                      <ThemedText type="smallBold" numberOfLines={1}>
                        {session.id.slice(0, 16)}…
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {STATUS_LABELS[session.status]} ·{" "}
                        {new Date(session.createdAt).toLocaleString()}
                      </ThemedText>
                    </View>
                    {active ? (
                      <Pressable
                        onPress={() => void openSession(session.id)}
                        style={({ pressed }) => [
                          styles.rowAction,
                          pressed && styles.cardPressed,
                        ]}
                      >
                        <ThemedText
                          type="smallBold"
                          style={styles.rowActionLabel}
                        >
                          Open
                        </ThemedText>
                      </Pressable>
                    ) : (
                      <ThemedText type="small" themeColor="textSecondary">
                        {session.status}
                      </ThemedText>
                    )}
                  </ThemedView>
                );
              })}
            </ScrollView>
          )}
        </>
      ) : null}

      {isAuthenticated && activeSession ? (
        <ThemedView style={styles.terminalContainer}>
          <ThemedView type="backgroundElement" style={styles.terminalHeader}>
            <ThemedText
              type="smallBold"
              numberOfLines={1}
              style={styles.terminalHeaderLabel}
            >
              @ctf sandbox — {activeSession.id.slice(0, 16)}…
            </ThemedText>
            <Pressable
              onPress={() => void closeActive()}
              disabled={busy}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.cardPressed,
              ]}
            >
              <ThemedText type="small" style={styles.closeLabel}>
                Close
              </ThemedText>
            </Pressable>
          </ThemedView>

          <ScrollView
            ref={scrollRef}
            style={styles.outputScroll}
            contentContainerStyle={styles.outputContent}
          >
            <ThemedText style={[styles.outputText, { color: theme.text }]}>
              {terminalOutput || "Sandbox connected — type a command below."}
            </ThemedText>
          </ScrollView>

          {error ? (
            <ThemedText type="small" style={styles.errorText}>
              {error}
            </ThemedText>
          ) : null}

          {exitNote ? (
            <ThemedView type="backgroundElement" style={styles.exitBanner}>
              <ThemedText type="smallBold">{exitNote}</ThemedText>
            </ThemedView>
          ) : null}

          <ThemedView type="backgroundElement" style={styles.inputRow}>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={input}
              onChangeText={setInput}
              placeholder={connected ? "Type a command…" : "Session ended"}
              placeholderTextColor="#8e8e93"
              editable={connected}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="send"
              onSubmitEditing={() => submitInput()}
            />
            <Pressable
              onPress={submitInput}
              disabled={!connected || input.trim().length === 0}
              style={({ pressed }) => [
                styles.sendButton,
                (!connected || input.trim().length === 0) &&
                  styles.sendButtonDisabled,
                pressed && styles.cardPressed,
              ]}
            >
              <ThemedText style={styles.sendLabel}>Send</ThemedText>
            </Pressable>
          </ThemedView>
        </ThemedView>
      ) : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  promptCard: {
    width: "100%",
    borderRadius: 12,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  signInButton: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    alignItems: "center",
    paddingVertical: Spacing.two,
  },
  signInLabel: {
    color: "#ffffff",
    fontWeight: "600",
  },
  actionsRow: {
    width: "100%",
    flexDirection: "row",
    gap: Spacing.two,
    alignItems: "center",
  },
  createButton: {
    flex: 1,
    backgroundColor: "#2563eb",
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: Spacing.three,
  },
  createLabel: {
    color: "#ffffff",
    fontWeight: "600",
  },
  refreshButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  errorText: {
    color: "#dc2626",
  },
  listContent: {
    gap: Spacing.two,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.four,
  },
  row: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    borderRadius: 12,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  rowInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  rowAction: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  rowActionLabel: {
    color: "#ffffff",
  },
  terminalContainer: {
    flex: 1,
    width: "100%",
    gap: Spacing.two,
  },
  terminalHeader: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  terminalHeaderLabel: {
    flex: 1,
  },
  closeButton: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  closeLabel: {
    color: "#dc2626",
    fontWeight: "600",
  },
  outputScroll: {
    flex: 1,
    borderRadius: 12,
  },
  outputContent: {
    padding: Spacing.three,
    paddingBottom: Spacing.four,
  },
  outputText: {
    fontFamily: Fonts.mono,
    fontSize: 13,
    lineHeight: 18,
  },
  exitBanner: {
    width: "100%",
    borderRadius: 8,
    padding: Spacing.two,
  },
  inputRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: Spacing.one,
    fontFamily: Fonts.mono,
  },
  sendButton: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  sendButtonDisabled: {
    opacity: 0.35,
  },
  sendLabel: {
    color: "#ffffff",
    fontWeight: "600",
  },
  cardPressed: {
    opacity: 0.85,
  },
});
