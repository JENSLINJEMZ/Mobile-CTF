import type {
  TerminalExitEvent,
  TerminalOutputEvent,
  TerminalSessionDto,
} from "@ctf/shared";
import { Link } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { ScreenShell } from "@/components/screen-shell";
import { EmptyState, ErrorState } from "@/components/state-views";
import { GlassSurface } from "@/components/glass-surface";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Fonts, Radius, Spacing, TouchTarget } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAuthGate } from "@/hooks/use-auth-gate";
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
  const { isAuthenticated } = useAuthGate();
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

  const closeSession = useCallback(async (id: string) => {
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
  }, []);

  const closeActive = useCallback(async () => {
    if (!activeId) return;
    Alert.alert(
      "Close terminal session?",
      "The sandbox will stop and terminal history will be cleared.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Close", style: "destructive", onPress: () => void closeSession(activeId) },
      ],
    );
  }, [activeId, closeSession]);

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
        <GlassSurface radius={Radius.md} style={styles.promptCard}>
          <ThemedText type="small">
            Run commands in an isolated, auto-expiring Linux container.
          </ThemedText>
          <Link href="/auth/login" asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sign in to open a terminal"
              style={({ pressed }) => [
                styles.signInButton,
                { backgroundColor: theme.accent },
                pressed && styles.cardPressed,
              ]}
            >
              <ThemedText style={styles.signInLabel}>
                Sign in to open a terminal
              </ThemedText>
            </Pressable>
          </Link>
        </GlassSurface>
      ) : null}

      {isAuthenticated && !activeSession ? (
        <>
          <ThemedView style={styles.actionsRow}>
            <Pressable
              onPress={() => void createNew()}
              disabled={busy || loading}
              accessibilityRole="button"
              accessibilityLabel="Open a new terminal session"
              accessibilityState={{ disabled: busy || loading }}
              style={({ pressed }) => [
                styles.createButton,
                { backgroundColor: theme.accent },
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
              accessibilityRole="button"
              accessibilityLabel="Refresh terminal sessions"
              accessibilityState={{ disabled: busy }}
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
            <ErrorState message={error} onRetry={() => void load()} />
          ) : null}

          {loading ? (
            <ActivityIndicator style={{ marginTop: Spacing.four }} />
          ) : sessions.length === 0 ? (
            <EmptyState message="No terminal sessions yet. Sessions auto-expire after 30 minutes." />
          ) : (
            <ScrollView contentContainerStyle={styles.listContent}>
              {sessions.map((session) => {
                const active = isActive(session.status);
                return (
                  <GlassSurface
                    key={session.id}
                    radius={Radius.md}
                    variant={active ? "glass" : "subtle"}
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
                        accessibilityRole="button"
                        accessibilityLabel={`Open terminal session ${session.id.slice(0, 16)}`}
                        style={({ pressed }) => [
                          styles.rowAction,
                          { backgroundColor: theme.accent },
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
                  </GlassSurface>
                );
              })}
            </ScrollView>
          )}
        </>
      ) : null}

      {isAuthenticated && activeSession ? (
        <ThemedView style={styles.terminalContainer}>
          <GlassSurface radius={Radius.md} style={styles.terminalHeader}>
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
              accessibilityRole="button"
              accessibilityLabel="Close terminal session"
              accessibilityState={{ disabled: busy }}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.cardPressed,
              ]}
            >
              <ThemedText type="small" style={[styles.closeLabel, { color: theme.danger }]}>
                Close
              </ThemedText>
            </Pressable>
          </GlassSurface>

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
            <ThemedText
              type="small"
              style={{ color: theme.danger }}
              accessibilityRole="alert"
            >
              {error}
            </ThemedText>
          ) : null}

          {exitNote ? (
            <GlassSurface
              variant="subtle"
              radius={Radius.sm}
              style={styles.exitBanner}
              accessibilityRole="alert"
            >
              <ThemedText type="smallBold">{exitNote}</ThemedText>
            </GlassSurface>
          ) : null}

          <GlassSurface variant="strong" radius={Radius.md} style={styles.inputRow}>
            <TextInput
              style={[styles.input, { color: theme.text }]}
              value={input}
              onChangeText={setInput}
              placeholder={connected ? "Type a command…" : "Session ended"}
              placeholderTextColor={theme.placeholder}
              editable={connected}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="send"
              onSubmitEditing={() => submitInput()}
              accessibilityLabel="Terminal command input"
            />
            <Pressable
              onPress={submitInput}
              disabled={!connected || input.trim().length === 0}
              accessibilityRole="button"
              accessibilityLabel="Send command"
              accessibilityState={{
                disabled: !connected || input.trim().length === 0,
              }}
              style={({ pressed }) => [
                styles.sendButton,
                { backgroundColor: theme.accent },
                (!connected || input.trim().length === 0) &&
                  styles.sendButtonDisabled,
                pressed && styles.cardPressed,
              ]}
            >
              <ThemedText style={styles.sendLabel}>Send</ThemedText>
            </Pressable>
          </GlassSurface>
        </ThemedView>
      ) : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  promptCard: {
    width: "100%",
    padding: Spacing.three,
    gap: Spacing.two,
  },
  signInButton: {
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: TouchTarget.Android,
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
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: TouchTarget.Android,
    paddingVertical: Spacing.three,
  },
  createLabel: {
    color: "#ffffff",
    fontWeight: "600",
  },
  refreshButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: TouchTarget.Android,
    justifyContent: "center",
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
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  rowInfo: {
    flex: 1,
    gap: Spacing.half,
  },
  rowAction: {
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    minHeight: TouchTarget.Android,
    justifyContent: "center",
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
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  terminalHeaderLabel: {
    flex: 1,
  },
  closeButton: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    minHeight: TouchTarget.Android,
    justifyContent: "center",
  },
  closeLabel: {
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
    padding: Spacing.two,
  },
  inputRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: Spacing.one,
    minHeight: TouchTarget.Android,
    fontFamily: Fonts.mono,
  },
  sendButton: {
    borderRadius: 8,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    minHeight: TouchTarget.Android,
    justifyContent: "center",
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
