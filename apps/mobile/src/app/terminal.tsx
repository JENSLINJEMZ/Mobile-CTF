import * as Clipboard from "expo-clipboard";
import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, Ellipse, LinearGradient as SvgLinearGradient, Path, Rect, Stop } from "react-native-svg";

import { IsoArt } from "@/components/iso-art";
import { LucideIcon, type LucideName } from "@/components/lucide-icon";
import { MachineLogo, type MachineLogoName } from "@/components/machine-logo";
import { useToast } from "@/components/toast";
import type { TerminalSessionDto } from "@ctf/shared";
import { Fonts } from "@/constants/theme";
import { useReduceMotion } from "@/hooks/use-reduce-motion";
import {
  closeTerminalSession,
  createTerminalSession,
  listTerminalSessions,
  reassembleTerminalSession,
} from "@/services/terminal";
import {
  connectTerminalSocket,
  disconnectTerminalSocket,
  sendTerminalInput,
  subscribeTerminalCrash,
  subscribeTerminalError,
  subscribeTerminalExit,
  subscribeTerminalOutput,
} from "@/services/terminalSocket";
import { getLeaderboard } from "@/services/leaderboard";
import { useAuthGate } from "@/hooks/use-auth-gate";

/* ------------------------------------------------------------
   Design tokens (ported from /home/jemzi/Developement/UI/1/terminal.html)
   ------------------------------------------------------------ */
const C = {
  bg: "#06060e",
  surface: "#12101f",
  purple: "#8b5cf6",
  purpleLight: "#a78bfa",
  purpleDeep: "#6d28d9",
  cyan: "#22d3ee",
  green: "#22c55e",
  greenLight: "#4ade80",
  orange: "#f97316",
  red: "#ef4444",
  gold: "#fbbf24",
  textPrimary: "#f5f3ff",
  textSecondary: "#b0abc9",
  textMuted: "#7a7699",
  border: "rgba(255,255,255,.07)",
  borderStrong: "rgba(255,255,255,.14)",
  monoOut: "#cbd5e1",
  monoDim: "#64748b",
  monoErr: "#f87171",
  monoDir: "#60a5fa",
  monoCmd: "#e2e8f0",
  monoNote: "#fbbf24",
  monoWhite: "#ffffff",
};

const MAX_LINES = 600;
const MAX_CHARS = 80;

type Toned = "out" | "err" | "dim" | "note" | "cyan" | "white" | "green" | "blank";

type Line =
  | { t: "prompt"; user: string; host: string; path: string; cmd: string }
  | { t: "text"; tone: Toned; text: string };

interface Machine {
  id: string;
  name: string;
  logo: MachineLogoName;
  desc: string;
  tags: string[];
  accent: string;
  soft: string;
  line: string;
  glow: string;
}

const MACHINES: Machine[] = [
  {
    id: "ubuntu",
    name: "Ubuntu",
    logo: "ubuntu",
    desc: "A clean Linux environment for general practice.",
    tags: ["Linux", "Beginner", "General"],
    accent: "#f97316",
    soft: "rgba(249,115,22,.10)",
    line: "rgba(249,115,22,.35)",
    glow: "rgba(249,115,22,.5)",
  },
  {
    id: "kali",
    name: "Kali Linux",
    logo: "kali",
    desc: "The ultimate penetration testing distribution.",
    tags: ["Linux", "Pentest", "Advanced"],
    accent: "#60a5fa",
    soft: "rgba(96,165,250,.10)",
    line: "rgba(96,165,250,.35)",
    glow: "rgba(96,165,250,.5)",
  },
  {
    id: "db",
    name: "DB",
    logo: "db",
    desc: "Vulnerable database for SQL injection practice.",
    tags: ["MySQL", "Database", "Web"],
    accent: "#60a5fa",
    soft: "rgba(96,165,250,.10)",
    line: "rgba(96,165,250,.35)",
    glow: "rgba(96,165,250,.5)",
  },
  {
    id: "dvwa",
    name: "DVWA",
    logo: "dvwa",
    desc: "Damn Vulnerable Web Application for web exploitation practice.",
    tags: ["PHP", "Web", "Vulnerable"],
    accent: "#a3e635",
    soft: "rgba(163,230,53,.10)",
    line: "rgba(163,230,53,.35)",
    glow: "rgba(163,230,53,.5)",
  },
];

/* ------------------------------------------------------------
   Small primitives
   ------------------------------------------------------------ */
function BlinkDot({ size, color }: { size: number; color: string }) {
  const value = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, { toValue: 0.25, duration: 700, useNativeDriver: true }),
        Animated.timing(value, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [value]);

  return (
    <Animated.View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        shadowColor: color,
        shadowOpacity: 0.9,
        shadowRadius: 6,
        opacity: value,
      }}
    />
  );
}

function toneColor(tone: Toned): string {
  switch (tone) {
    case "err":
      return C.monoErr;
    case "dim":
      return C.monoDim;
    case "note":
      return C.monoNote;
    case "cyan":
      return C.cyan;
    case "white":
      return C.monoWhite;
    case "green":
      return C.greenLight;
    case "blank":
      return C.monoDim;
    default:
      return C.monoOut;
  }
}

function ToneText({ tone, text }: { tone: Toned; text: string }) {
  if (tone === "blank") {
    return <Text style={[styles.termLine, styles.blankLine]} />;
  }
  return (
    <Text style={[styles.termLine, { color: toneColor(tone) }]}>
      {text.length > MAX_CHARS ? text.slice(0, MAX_CHARS) + "…" : text}
    </Text>
  );
}

function PromptLine({ user, host, path, cmd }: { user: string; host: string; path: string; cmd: string }) {
  return (
    <Text style={styles.termLine}>
      <Text style={styles.pUser}>{user}</Text>
      <Text style={styles.pHost}>@{host}</Text>
      <Text style={styles.pColon}>:</Text>
      <Text style={styles.pPath}>{path}</Text>
      <Text style={styles.pDollar}>$ </Text>
      <Text style={styles.pCmd}>{cmd}</Text>
    </Text>
  );
}

function LivePrompt({ user, host, path, buffer, reduce }: { user: string; host: string; path: string; buffer: string; reduce: boolean }) {
  return (
    <Text style={styles.termLine}>
      <Text style={styles.pUser}>{user}</Text>
      <Text style={styles.pHost}>@{host}</Text>
      <Text style={styles.pColon}>:</Text>
      <Text style={styles.pPath}>{path}</Text>
      <Text style={styles.pDollar}>$ </Text>
      <Text style={styles.pCmd}>{buffer}</Text>
      {reduce ? <Text style={styles.cursor} /> : <BlinkingCursor />}
    </Text>
  );
}

function BlinkingCursor() {
  return <Text style={styles.cursor}>▍</Text>;
}

const ANSI_OSC = new RegExp(`\\x1b\\][^\\u0007]*(?:\\u0007|\\x1b\\\\)`, "g");
// eslint-disable-next-line no-control-regex
const ANSI_CSI = new RegExp("\\x1b\\[[0-9;?]*[a-zA-Z]", "g");
// eslint-disable-next-line no-control-regex
const ANSI_ESC = new RegExp("\\x1b[@-Z\\\\-_]", "g");

function sanitizeOutput(raw: string): string {
  return raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(ANSI_OSC, "")
    .replace(ANSI_CSI, "")
    .replace(ANSI_ESC, "");
}

function classifyLine(line: string): Toned {
  const l = line.trim();
  if (!l) return "dim";
  if (/permission denied|command not found|usage:|segmentation/i.test(l)) return "err";
  if (/^\s*(root|#|\$)/.test(l)) return "note";
  if (/#(recon|flag|task|admin)/i.test(l)) return "cyan";
  return "out";
}

function formatLongClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/* ------------------------------------------------------------
   Avatar + App header (colored like the design)
   ------------------------------------------------------------ */
function MiniAvatar() {
  return (
    <Svg viewBox="0 0 40 40" width="100%" height="100%">
      <Defs>
        <SvgLinearGradient id="avBg" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0%" stopColor="#1a1030" />
          <Stop offset="100%" stopColor="#0a0616" />
        </SvgLinearGradient>
        <SvgLinearGradient id="avHood" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#6d28d9" />
          <Stop offset="100%" stopColor="#2a1a52" />
        </SvgLinearGradient>
      </Defs>
      <Rect width="40" height="40" fill="url(#avBg)" rx="20" />
      <Path d="M20 6 Q30 8 30 18 Q30 30 20 34 Q10 30 10 18 Q10 8 20 6Z" fill="url(#avHood)" />
      <Ellipse cx="20" cy="21" rx="6" ry="7" fill="#05030c" />
      <Circle cx="17.5" cy="20" r="1" fill="#22d3ee" />
      <Circle cx="22.5" cy="20" r="1" fill="#22d3ee" />
      <Path d="M14 33 q6 -4 12 0 l4 7H10Z" fill="#0d0818" />
    </Svg>
  );
}

function AppHeader({ level }: { level: number }) {
  return (
    <View style={styles.appHeader}>
      <View style={styles.brand}>
        <Svg width={26} height={19} viewBox="0 0 40 28">
          <Defs>
            <SvgLinearGradient id="brandGrad" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0%" stopColor="#c4b5fd" />
              <Stop offset="55%" stopColor="#8b5cf6" />
              <Stop offset="100%" stopColor="#6d28d9" />
            </SvgLinearGradient>
          </Defs>
          <Path d="M2 26 L12 2 L20 13.5 L28 2 L38 26 L29 26 L24.5 15.5 L20 22 L15.5 15.5 L11 26 Z" fill="url(#brandGrad)" />
        </Svg>
        <View>
          <Text style={styles.brandName}>
            Mobile <Text style={styles.brandCtf}>CTF</Text>
          </Text>
          <Text style={styles.brandTagline}>Learn · Hack · Compete</Text>
        </View>
      </View>
      <View style={styles.headerActions}>
        <View style={styles.iconBtn}>
          <View style={styles.notifDot} />
          <LucideIcon name="bell" size={18} color={C.textSecondary} />
        </View>
        <View style={styles.avatarWrap}>
          <View style={styles.avatarBox}>
            <MiniAvatar />
          </View>
          <Text style={styles.avatarLv}>Lv. {level}</Text>
        </View>
      </View>
    </View>
  );
}

/* ------------------------------------------------------------
   Script deco
   ------------------------------------------------------------ */
function ScriptDeco({ lines }: { lines: [string, string, string] }) {
  return (
    <View style={styles.scriptDeco}>
      <Text style={styles.scriptText}>
        {lines[0]}
        {"\n"}
        {lines[1]}
        {"\n"}
        {lines[2]}
      </Text>
      <Svg width={34} height={7} viewBox="0 0 52 9" style={styles.scriptUnderline}>
        <Path d="M1.5 6 Q 26 -1.5 50.5 6" stroke="rgba(196,181,253,.7)" fill="none" strokeWidth={1.6} strokeLinecap="round" />
      </Svg>
    </View>
  );
}

function PageHead({ title, sub, deco }: { title: string; sub: string; deco: [string, string, string] }) {
  return (
    <View style={styles.pageHead}>
      <View style={styles.pageHeadCopy}>
        <Text style={styles.pageTitle}>{title}</Text>
        <Text style={styles.pageSub}>{sub}</Text>
      </View>
      <ScriptDeco lines={deco} />
    </View>
  );
}

/* ------------------------------------------------------------
   Hub view
   ------------------------------------------------------------ */
function IsoCard() {
  return (
    <View style={styles.isoCard}>
      <View style={styles.isoRow}>
        <View style={styles.isoIcon}>
          <LucideIcon name="shield" size={24} color={C.greenLight} />
        </View>
        <View style={styles.isoBody}>
          <Text style={styles.isoTitle}>Isolated Environment</Text>
          <Text style={styles.isoDesc}>
            Each machine runs in a secure container.{"\n"}Your actions won't affect the main system.
          </Text>
        </View>
      </View>
      <View style={styles.isoArtWrap}>
        <IsoArt />
      </View>
      <View style={styles.sandboxPill}>
        <BlinkDot size={6} color={C.green} />
        <Text style={styles.sandboxText}>Sandbox Ready</Text>
      </View>
      <View style={styles.isoAccentRail} />
    </View>
  );
}

function MachineCard({ machine, onStart, disabled }: { machine: Machine; onStart: () => void; disabled: boolean }) {
  return (
    <View style={[styles.machineCard, { borderColor: machine.line, backgroundColor: machine.soft }]}>
      <LinearGradient
        colors={[machine.soft, "rgba(14,12,24,.96)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.6, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.machineAccentRail} />
      <View style={styles.mLogoWrap}>
        <View style={[styles.mLogo, { shadowColor: machine.glow }]}>
          <MachineLogo name={machine.logo} size={44} />
        </View>
        <View style={[styles.readyBadge, { borderColor: "rgba(34,197,94,.4)" }]}>
          <BlinkDot size={5} color={C.green} />
          <Text style={styles.readyText}>Ready</Text>
        </View>
      </View>
      <Text style={styles.mTitle}>{machine.name}</Text>
      <Text style={styles.mDesc}>{machine.desc}</Text>
      <View style={styles.mTags}>
        {machine.tags.map((tag) => (
          <View key={tag} style={styles.mTag}>
            <Text style={styles.mTagText}>{tag}</Text>
          </View>
        ))}
      </View>
      <Pressable
        onPress={onStart}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`Start ${machine.name}`}
        style={({ pressed }) => [styles.mStart, pressed && styles.scaled]}
      >
        <LinearGradient
          colors={[C.purple, C.purpleDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <LucideIcon name="play" size={13} color="#fff" />
        <Text style={styles.mStartText}>Start Machine</Text>
      </Pressable>
    </View>
  );
}

/* ------------------------------------------------------------
   Terminal output renderer
   ------------------------------------------------------------ */
function isRunningStatus(s: TerminalSessionDto["status"]): boolean {
  return s === "RUNNING" || s === "CREATING";
}

export default function TerminalScreen() {
  const { isAuthenticated } = useAuthGate();
  const reduceMotion = useReduceMotion();
  const insets = useSafeAreaInsets();
  const tabBarPad = 60 + (insets.bottom || 0);
  const toast = useToast();

  const [view, setView] = useState<"hub" | "cli">("hub");
  const [sessions, setSessions] = useState<TerminalSessionDto[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [starting, setStarting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [crashNote, setCrashNote] = useState<string | null>(null);
  const [exitNote, setExitNote] = useState<string | null>(null);
  const [level, setLevel] = useState(1);

  const [lines, setLines] = useState<Line[]>([]);
  const [buffer, setBuffer] = useState("");
  const [shiftOn, setShiftOn] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [hostLabel, setHostLabel] = useState("ctf@challenge:~");
  const lastCommandRef = useRef<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    if (!isAuthenticated) return;
    setError(null);
    try {
      const results = await listTerminalSessions();
      if (mountedRef.current) setSessions(results);
    } catch (err) {
      if (mountedRef.current)
        setError(err instanceof Error ? err.message : "Failed to load terminal sessions");
    }
  }, [isAuthenticated]);

  useEffect(() => {
    getLeaderboard("global", 1)
      .then((r) => {
        const lv = Math.max(1, Math.floor((r.me?.score ?? 0) / 250) + 1);
        setLevel(lv);
      })
      .catch(() => setLevel(1));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      disconnectTerminalSocket();
    };
  }, []);

  /* session timer */
  useEffect(() => {
    if (!expiresAt || view !== "cli") return;
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt, view]);

  const timeoutMs = expiresAt ? Math.max(0, new Date(expiresAt).getTime() - now) : 0;
  const timedOut = connected && timeoutMs <= 0;

  useEffect(() => {
    if (!timedOut || !activeId) return;
    disconnectTerminalSocket();
    setConnected(false);
    toast.show({ title: "Session ended", body: "Container stopped by timeout.", tone: "error" });
    setExpiresAt(null);
    setView("hub");
    void load();
  }, [timedOut, activeId, toast, load]);

  /* socket subscriptions for the active session */
  useEffect(() => {
    if (!isAuthenticated || !activeId) return;
    const offOutput = subscribeTerminalOutput((event) => {
      if (event.sessionId !== activeId) return;
      const clean = sanitizeOutput(event.data);
      if (!clean) return;
      const chunks = clean.split("\n");
      setLines((prev) => {
        const next = [...prev];
        for (const chunk of chunks) {
          const line = chunk.trimEnd();
          if (!line) continue;
          if (lastCommandRef.current && line.trim() === lastCommandRef.current) continue;
          next.push({ t: "text", tone: classifyLine(line), text: line });
        }
        while (next.length > MAX_LINES) next.shift();
        return next;
      });
    });
    const offExit = subscribeTerminalExit(() => {
      setConnected(false);
      setExitNote("Session ended — container stopped.");
      disconnectTerminalSocket();
      void load();
      setTimeout(() => {
        if (mountedRef.current) setView("hub");
      }, 900);
    });
    const offCrash = subscribeTerminalCrash((event) => {
      setConnected(false);
      setCrashNote(event.reason);
      disconnectTerminalSocket();
      void load();
    });
    const offError = subscribeTerminalError((message) => setError(message));
    return () => {
      offOutput();
      offExit();
      offCrash();
      offError();
    };
  }, [isAuthenticated, activeId, toast, load]);

  useEffect(() => {
    if (lines.length > 0) {
      const frame = requestAnimationFrame(() => {
        scrollRef.current?.scrollToEnd({ animated: false });
      });
      return () => cancelAnimationFrame(frame);
    }
    return undefined;
  }, [lines]);

  const bootSession = useCallback((session: TerminalSessionDto) => {
    setLines([]);
    setExitNote(null);
    setCrashNote(null);
    setBuffer("");
    setShiftOn(false);
    setConnected(true);
    setActiveId(session.id);
    setExpiresAt(session.expiresAt);
    setHostLabel(`ctf@challenge:~`);
    setView("cli");
    setLines([
      { t: "text", tone: "green", text: "Welcome to Mobile CTF Sandbox" },
      { t: "text", tone: "dim", text: "Type 'help' to see available commands." },
      { t: "text", tone: "dim", text: " " },
    ]);
    toast.show({ title: "Container ready", body: "Isolated sandbox is running.", tone: "success" });
  }, [toast]);

  const openSession = useCallback(
    async (sessionId: string) => {
      if (busy) return;
      setBusy(true);
      setError(null);
      try {
        await connectTerminalSocket(sessionId);
        if (!mountedRef.current) return;
        const cached = sessions.find((s) => s.id === sessionId) ?? {
          id: sessionId,
          status: "RUNNING" as const,
          ttlSeconds: 1800,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 1800 * 1000).toISOString(),
          closedAt: null,
          crashReason: null,
        };
        bootSession(cached);
        void load();
      } catch (err) {
        if (mountedRef.current) {
          setError(err instanceof Error ? err.message : "Failed to connect to the terminal");
          void load();
        }
      } finally {
        if (mountedRef.current) setBusy(false);
      }
    },
    [busy, sessions, bootSession, load],
  );

  const startMachine = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setStarting(true);
    setError(null);
    try {
      const session = await createTerminalSession();
      setSessions((prev) => [session, ...prev]);
      setStarting(false);
      await openSession(session.id);
    } catch (err) {
      setStarting(false);
      setError(err instanceof Error ? err.message : "Failed to start a sandbox session");
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  }, [busy, openSession]);

  const stopInstance = useCallback(async () => {
    if (!activeId) return;
    setBusy(true);
    setError(null);
    try {
      const closed = await closeTerminalSession(activeId);
      setSessions((prev) => prev.map((s) => (s.id === activeId ? closed : s)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to close the session");
    } finally {
      disconnectTerminalSocket();
      setConnected(false);
      setActiveId(null);
      setExpiresAt(null);
      setLines([]);
      setBuffer("");
      setView("hub");
      toast.show({ title: "Instance stopped", body: "Container terminated.", tone: "error" });
      void load();
      if (mountedRef.current) setBusy(false);
    }
  }, [activeId, toast, load]);

  const confirmStop = useCallback(async () => {
    Alert.alert(
      "Stop instance?",
      "This will terminate your container and end the current session. Any unsaved progress will be lost.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Stop", style: "destructive", onPress: () => void stopInstance() },
      ],
    );
  }, [stopInstance]);

  const reassemble = useCallback(async () => {
    if (!activeId) return;
    setBusy(true);
    setError(null);
    setCrashNote(null);
    try {
      const revived = await reassembleTerminalSession(activeId);
      setSessions((prev) => prev.map((s) => (s.id === activeId ? revived : s)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reassemble the sandbox");
    } finally {
      if (mountedRef.current) setBusy(false);
    }
  }, [activeId]);

  const submitInput = useCallback(() => {
    const command = buffer.trim();
    if (!command || !connected) return;
    setBuffer("");
    setShiftOn(false);
    lastCommandRef.current = command;
    setLines((prev) => [
      ...prev,
      { t: "prompt", user: "ctf", host: "challenge", path: "~", cmd: command },
    ]);
    if (command === "clear") {
      setLines([]);
    }
    void sendTerminalInput(command + "\n").catch((err) => {
      setError(err instanceof Error ? err.message : "Failed to send input");
    });
  }, [buffer, connected]);

  const pressKey = useCallback(
    (key: string) => {
      if (!connected) return;
      if (key === "shift") {
        setShiftOn((s) => !s);
        return;
      }
      if (key === "backspace") {
        setBuffer((b) => b.slice(0, -1));
        return;
      }
      if (key === "enter") {
        submitInput();
        return;
      }
      if (key === "space") {
        setBuffer((b) => b + " ");
        return;
      }
      if (key === "num" || key === "globe" || key === "tab") return;
      if (key.length === 1) {
        setBuffer((b) => b + (shiftOn ? key.toUpperCase() : key));
        setShiftOn(false);
      }
    },
    [connected, shiftOn, submitInput],
  );

  const clearOutput = useCallback(() => {
    setLines([]);
    setBuffer("");
  }, []);

  const copyOutput = useCallback(() => {
    const text = lines
      .map((l) =>
        l.t === "prompt"
          ? `${l.user}@${l.host}:${l.path}$ ${l.cmd}`
          : l.t === "text"
            ? l.text
            : "",
      )
      .filter((l) => l.length > 0)
      .join("\n");
    if (!text) {
      toast.show({ title: "Nothing to copy", body: "Terminal is empty.", tone: "error" });
      return;
    }
    void Clipboard.setStringAsync(text).then(() =>
      toast.show({ title: "Copied", body: "Terminal output copied.", tone: "success" }),
    );
  }, [lines, toast]);

  const resumeSession = sessions.find((s) => isRunningStatus(s.status)) ?? null;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={["#0a0913", "#07070f", "#06060d"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={["rgba(109,40,217,.20)", "transparent"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.topGlow}
      />

      {/* App header */}
      <View style={[styles.headerShell, { paddingTop: insets.top + 6 }]}>
        <AppHeader level={level} />
      </View>

      {!isAuthenticated ? (
        <View style={styles.centerWrap}>
          <View style={styles.infoCard}>
            <View style={[styles.infoIc, styles.infoIcBlue]}>
              <LucideIcon name="terminal" size={17} color="#60a5fa" />
            </View>
            <View style={styles.infoBody}>
              <Text style={styles.infoTitle}>Sign in required</Text>
              <Text style={styles.infoDesc}>Run commands in an isolated, auto-expiring Linux container.</Text>
            </View>
          </View>
          <Link href="/auth/login" asChild>
            <Pressable accessibilityRole="button" style={({ pressed }) => [styles.signInButton, pressed && styles.scaled]}>
              <Text style={styles.signInLabel}>Sign in to open a terminal</Text>
            </Pressable>
          </Link>
        </View>
      ) : view === "hub" ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.hubContent}
        >
          <PageHead
            title="Terminal"
            sub="Choose a machine and start your hacking environment."
            deco={["Practice", "Explore", "Get Better"]}
          />

          <IsoCard />

          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Available Machines</Text>
            <View style={styles.sectionHint}>
              <LucideIcon name="info" size={12} color={C.textMuted} />
              <Text style={styles.sectionHintText}>Select a machine to start</Text>
            </View>
          </View>

          <View style={styles.machineGrid}>
            {MACHINES.map((machine) => (
              <MachineCard
                key={machine.id}
                machine={machine}
                disabled={busy || starting}
                onStart={() => void startMachine()}
              />
            ))}
          </View>

          <View style={styles.infoCard}>
            <View style={[styles.infoIc, styles.infoIcBlue]}>
              <LucideIcon name="monitor" size={17} color="#60a5fa" />
            </View>
            <View style={styles.infoBody}>
              <Text style={styles.infoTitle}>Your Active Session</Text>
              {resumeSession ? (
                <Text style={styles.infoDesc}>
                  {resumeSession.id.slice(0, 16)}… · {resumeSession.status.toLowerCase()}
                </Text>
              ) : (
                <Text style={styles.infoDesc}>No machine running</Text>
              )}
              <Text style={[styles.infoDesc, styles.infoSub]}>
                {resumeSession
                  ? "Resume your running session below."
                  : "Start a machine above to begin your lab session."}
              </Text>
            </View>
            {resumeSession ? (
              <Pressable
                onPress={() => void openSession(resumeSession.id)}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="Resume session"
                style={({ pressed }) => [styles.infoAction, pressed && styles.scaled]}
              >
                <Text style={styles.infoActionText}>Resume</Text>
                <LucideIcon name="chevron" size={13} color={C.textSecondary} />
              </Pressable>
            ) : null}
          </View>

          <View style={styles.infoCardSolid}>
            <View style={[styles.infoIc, styles.infoIcBlue]}>
              <LucideIcon name="info" size={17} color="#60a5fa" />
            </View>
            <View style={styles.infoBody}>
              <Text style={styles.infoTitle}>Need Help?</Text>
              <Text style={styles.infoDesc}>
                Each machine has pre-installed tools and configs. Use the hints section if you get stuck.
              </Text>
            </View>
            <Pressable
              onPress={() =>
                toast.show({
                  title: "Lab Guides",
                  body: "nmap -sV target · Burp Suite · msfconsole · linpeas",
                  tone: "success",
                })
              }
              accessibilityRole="button"
              style={({ pressed }) => [styles.infoAction, pressed && styles.scaled]}
            >
              <Text style={styles.infoActionText}>View Guides</Text>
              <LucideIcon name="chevron" size={13} color={C.textSecondary} />
            </Pressable>
          </View>

          {error ? (
            <Pressable onPress={() => void load()} accessibilityRole="button" style={styles.errBanner}>
              <Text style={styles.errText}>{error}</Text>
            </Pressable>
          ) : null}

          {starting ? (
            <View style={styles.startingCard}>
              <View style={styles.spinner} />
              <Text style={styles.startingText}>Spinning up an isolated container…</Text>
            </View>
          ) : null}
        </ScrollView>
      ) : (
        <View style={styles.cliWrap}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.termScroll}
            contentContainerStyle={[styles.cliScrollContent, { paddingBottom: tabBarPad + 220 }]}
          >
            <PageHead
              title="Terminal"
              sub="Practice. Try. Break. Learn."
              deco={["Real", "Environment", "Real Skills"]}
            />

            <View style={styles.sessionStatus}>
              <View style={styles.statusTileRunning}>
                <View style={styles.statusTop}>
                  <BlinkDot size={7} color={C.green} />
                  <Text style={styles.runningText}>
                    {connected ? "Container Running" : "Container Idle"}
                  </Text>
                </View>
                <Text style={styles.statusSub} numberOfLines={1}>
                  {hostLabel}
                </Text>
              </View>
              <View style={styles.statusTileTime}>
                <View style={[styles.statusTop, styles.timeTop]}>
                  <LucideIcon name="clock" size={12} color={C.textMuted} />
                  <Text style={styles.timeLabel}>Time Left</Text>
                </View>
                <Text style={styles.timeVal}>{formatLongClock(timeoutMs)}</Text>
              </View>
              <Pressable
                onPress={() => void confirmStop()}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel="Stop instance"
                style={({ pressed }) => [styles.stopBtn, pressed && styles.scaled]}
              >
                <LucideIcon name="x" size={12} color="#fca5a5" />
                <Text style={styles.stopBtnText}>Stop</Text>
              </Pressable>
            </View>

            <View style={styles.tabBar}>
              {(["terminal", "files", "notes", "hints"] as const).map((tab) => {
                const active = tab === "terminal";
                const icon: Record<string, LucideName> = {
                  terminal: "terminal",
                  files: "folder",
                  notes: "notes",
                  hints: "bulb",
                };
                return (
                  <Pressable
                    key={tab}
                    onPress={() => {
                      if (!active) {
                        toast.show({
                          title: `${tab[0].toUpperCase()}${tab.slice(1)} tab`,
                          body: "Coming soon.",
                          tone: "default",
                        });
                      }
                    }}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                    style={[styles.tab, active && styles.tabActive]}
                  >
                    <LucideIcon
                      name={icon[tab]}
                      size={14}
                      color={active ? "#fff" : C.textSecondary}
                    />
                    <Text style={[styles.tabText, active && styles.tabTextActive]}>
                      {tab[0].toUpperCase() + tab.slice(1)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.termPanel}>
              <Pressable
                onPress={() => void copyOutput()}
                accessibilityRole="button"
                accessibilityLabel="Copy terminal output"
                style={({ pressed }) => [styles.termCopy, pressed && styles.scaled]}
              >
                <LucideIcon name="copy" size={14} color={C.textMuted} />
              </Pressable>
              <ScrollView
                ref={scrollRef}
                showsVerticalScrollIndicator={false}
                style={styles.termOut}
                contentContainerStyle={styles.termOutContent}
              >
                {lines.map((line, i) =>
                  line.t === "prompt" ? (
                    <PromptLine key={i} user={line.user} host={line.host} path={line.path} cmd={line.cmd} />
                  ) : (
                    <ToneText key={i} tone={line.tone} text={line.text} />
                  ),
                )}
                {connected ? (
                  <LivePrompt user="ctf" host="challenge" path="~" buffer={buffer} reduce={reduceMotion} />
                ) : null}
              </ScrollView>
            </View>

            {crashNote ? (
              <View style={styles.crashBanner}>
                <Text style={styles.crashTitle}>Sandbox destroyed</Text>
                <Text style={styles.crashBody}>{crashNote}</Text>
                <Pressable onPress={() => void reassemble()} disabled={busy} accessibilityRole="button" style={({ pressed }) => [styles.reassembleBtn, pressed && styles.scaled]}>
                  <Text style={styles.reassembleText}>{busy ? "Reassembling…" : "Reassemble sandbox"}</Text>
                </Pressable>
              </View>
            ) : null}

            {exitNote ? (
              <View style={styles.exitBanner}>
                <Text style={styles.exitText}>{exitNote}</Text>
              </View>
            ) : null}

            {error ? (
              <Pressable onPress={() => setError(null)} accessibilityRole="button" style={styles.errBanner}>
                <Text style={styles.errText}>{error}</Text>
              </Pressable>
            ) : null}
          </ScrollView>

          <View style={[styles.actionRow, { bottom: tabBarPad + 148 }]}>
            <Pressable onPress={() => undefined} accessibilityRole="button" style={({ pressed }) => [styles.actBtn, pressed && styles.scaled]}>
              <Text style={styles.actBtnText}>Ctrl</Text>
            </Pressable>
            <Pressable onPress={() => undefined} accessibilityRole="button" style={({ pressed }) => [styles.actBtn, pressed && styles.scaled]}>
              <Text style={styles.actBtnText}>Alt</Text>
            </Pressable>
            <Pressable onPress={() => pressKey("tab")} accessibilityRole="button" style={({ pressed }) => [styles.actBtn, pressed && styles.scaled]}>
              <Text style={styles.actBtnText}>Tab</Text>
            </Pressable>
            <Pressable onPress={clearOutput} accessibilityRole="button" style={({ pressed }) => [styles.actBtn, styles.actBtnClear, pressed && styles.scaled]}>
              <Text style={styles.actBtnClearText}>Clear</Text>
            </Pressable>
            <Pressable
              onPress={() => toast.show({ title: "Upload File", body: "File upload is coming soon.", tone: "default" })}
              accessibilityRole="button"
              style={({ pressed }) => [styles.actBtn, styles.actBtnUpload, pressed && styles.scaled]}
            >
              <LucideIcon name="upload" size={13} color="#fff" />
              <Text style={styles.actBtnUploadText}>Upload</Text>
            </Pressable>
          </View>

          {/* Virtual keyboard */}
          <View style={[styles.kb, { bottom: tabBarPad + 4 }]}>
            <KeyboardRow keys={["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"]} onKey={pressKey} />
            <KeyboardRow keys={["a", "s", "d", "f", "g", "h", "j", "k", "l"]} onKey={pressKey} />
            <View style={styles.kbRow}>
              <KeyBtn flex={1.4} keyLabel="shift" onKey={pressKey} icon="shift" />
              {["z", "x", "c", "v", "b", "n", "m"].map((k) => (
                <KeyBtn key={k} flex={1} keyLabel={k} onKey={pressKey} />
              ))}
              <KeyBtn flex={1.4} keyLabel="backspace" onKey={pressKey} icon="backspace" />
            </View>
            <View style={styles.kbRow}>
              <KeyBtn flex={1.4} keyLabel="num" onKey={pressKey} text="?123" mod />
              <KeyBtn flex={1} keyLabel="globe" onKey={pressKey} icon="globe" mod />
              <KeyBtn flex={4} keyLabel="space" onKey={pressKey} text="English" space />
              <KeyBtn flex={1.6} keyLabel="enter" onKey={pressKey} text="Enter" enter />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

function KeyboardRow({ keys, onKey }: { keys: string[]; onKey: (k: string) => void }) {
  return (
    <View style={styles.kbRow}>
      {keys.map((k) => (
        <KeyBtn key={k} flex={1} keyLabel={k} onKey={onKey} />
      ))}
    </View>
  );
}

function KeyBtn({
  flex,
  keyLabel,
  onKey,
  text,
  icon,
  mod,
  space,
  enter,
}: {
  flex: number;
  keyLabel: string;
  onKey: (k: string) => void;
  text?: string;
  icon?: LucideName;
  mod?: boolean;
  space?: boolean;
  enter?: boolean;
}) {
  return (
    <Pressable
      onPress={() => onKey(keyLabel)}
      accessibilityRole="button"
      accessibilityLabel={keyLabel}
      style={({ pressed }) => [
        styles.key,
        { flex },
        mod && styles.keyMods,
        space && styles.keySpace,
        enter && styles.keyEnter,
        pressed && styles.keyPressed,
      ]}
    >
      {icon ? (
        <LucideIcon name={icon} size={15} color={enter || keyLabel === "backspace" ? "#e2e8f0" : C.textSecondary} />
      ) : (
        <Text style={[styles.keyText, enter && styles.keyEnterText, mod && styles.keyModText]}>{text ?? keyLabel}</Text>
      )}
    </Pressable>
  );
}



const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  topGlow: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 220,
  },
  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
    gap: 14,
  },
  headerShell: {
    paddingHorizontal: 14,
    paddingBottom: 4,
  },

  /* app header */
  appHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },
  brandName: {
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.4,
    color: C.textPrimary,
  },
  brandCtf: {
    color: C.purple,
  },
  brandTagline: {
    fontSize: 6.8,
    fontWeight: "600",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: C.textMuted,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  notifDot: {
    position: "absolute",
    top: 6,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#f43f5e",
  },
  avatarWrap: {
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
    marginLeft: 3,
  },
  avatarBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(167,139,250,.5)",
  },
  avatarLv: {
    fontSize: 8,
    fontWeight: "700",
    color: C.textSecondary,
  },

  /* page head */
  pageHead: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 14,
    marginTop: 8,
    marginBottom: 14,
  },
  pageHeadCopy: {
    flex: 1,
    minWidth: 0,
  },
  pageTitle: {
    fontSize: 27,
    fontWeight: "800",
    letterSpacing: -0.8,
    lineHeight: 29,
    color: C.textPrimary,
  },
  pageSub: {
    fontSize: 11,
    color: C.textSecondary,
    lineHeight: 16,
    maxWidth: 205,
    marginTop: 5,
  },
  scriptDeco: {
    position: "relative",
    paddingTop: 2,
  },
  scriptText: {
    fontSize: 14,
    lineHeight: 14,
    fontWeight: "600",
    fontStyle: "italic",
    textAlign: "right",
    color: "rgba(196,181,253,.9)",
    transform: [{ rotate: "-4deg" }],
  },
  scriptUnderline: {
    position: "absolute",
    bottom: -6,
    right: 0,
    transform: [{ rotate: "-4deg" }],
  },

  /* iso card */
  isoCard: {
    position: "relative",
    borderRadius: 15,
    padding: 14,
    marginBottom: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(139,92,246,.35)",
    backgroundColor: "rgba(17,24,39,.6)",
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  isoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  isoIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  isoBody: {
    flex: 1,
    minWidth: 0,
  },
  isoTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    letterSpacing: -0.2,
    color: C.greenLight,
    marginBottom: 5,
  },
  isoDesc: {
    fontSize: 10,
    color: C.textSecondary,
    lineHeight: 15,
    maxWidth: 200,
  },
  isoArtWrap: {
    position: "absolute",
    right: 6,
    top: 12,
    opacity: 0.9,
  },
  sandboxPill: {
    position: "absolute",
    right: 12,
    bottom: 11,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "rgba(20,83,45,.4)",
    borderWidth: 1,
    borderColor: "rgba(34,197,94,.4)",
  },
  sandboxDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.green,
  },
  sandboxText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#86efac",
  },
  isoAccentRail: {
    position: "absolute",
    left: 0,
    top: "12%",
    bottom: "12%",
    width: 3,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
    backgroundColor: C.green,
  },

  /* section head */
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    gap: 8,
    marginBottom: 11,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.3,
    color: C.textPrimary,
  },
  sectionHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  sectionHintText: {
    fontSize: 9.5,
    color: C.textMuted,
    fontWeight: "500",
  },

  /* machine grid */
  machineGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
    marginBottom: 14,
  },
  machineCard: {
    position: "relative",
    width: "48%",
    flexGrow: 1,
    borderRadius: 13,
    padding: 12,
    minHeight: 178,
    overflow: "hidden",
    borderWidth: 1,
    gap: 0,
  },
  machineAccentRail: {
    position: "absolute",
    left: 0,
    top: "14%",
    bottom: "14%",
    width: 3,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  mLogoWrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 11,
  },
  mLogo: {
    width: 44,
    height: 44,
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  readyBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 6,
    backgroundColor: "rgba(20,83,45,.5)",
  },
  readyDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: C.green,
  },
  readyText: {
    fontSize: 8.5,
    fontWeight: "700",
    color: "#86efac",
    letterSpacing: 0.2,
  },
  mTitle: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: -0.3,
    color: C.textPrimary,
    marginBottom: 5,
  },
  mDesc: {
    fontSize: 9.5,
    color: C.textSecondary,
    lineHeight: 13.5,
    marginBottom: 9,
    minHeight: 27,
  },
  mTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginBottom: 10,
  },
  mTag: {
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,.045)",
    borderWidth: 1,
    borderColor: C.border,
  },
  mTagText: {
    fontSize: 8,
    fontWeight: "600",
    color: C.textSecondary,
  },
  mStart: {
    marginTop: "auto",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    height: 38,
    borderRadius: 10,
    overflow: "hidden",
  },
  mStartText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#fff",
  },

  /* info cards */
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    padding: 13,
    marginBottom: 11,
    borderRadius: 13,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,.13)",
    backgroundColor: "rgba(18,16,31,.75)",
  },
  infoCardSolid: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    padding: 13,
    marginBottom: 12,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: "rgba(18,16,31,.75)",
  },
  infoIc: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  infoIcBlue: {
    backgroundColor: "rgba(96,165,250,.10)",
    borderColor: "rgba(96,165,250,.30)",
  },
  infoBody: {
    flex: 1,
    minWidth: 0,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: -0.2,
    color: C.textPrimary,
    marginBottom: 3,
  },
  infoDesc: {
    fontSize: 10,
    color: C.textSecondary,
    lineHeight: 14,
    marginBottom: 3,
  },
  infoSub: {
    color: C.textMuted,
  },
  infoAction: {
    marginLeft: "auto",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    alignSelf: "center",
    paddingVertical: 8,
    paddingHorizontal: 11,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: C.borderStrong,
    backgroundColor: "rgba(255,255,255,.05)",
  },
  infoActionText: {
    fontSize: 10,
    fontWeight: "700",
    color: C.textSecondary,
  },

  /* sign-in */
  signInButton: {
    minHeight: 46,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    backgroundColor: C.purple,
    shadowColor: "#8b5cf6",
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  signInLabel: {
    color: "#fff",
    fontSize: 12.5,
    fontWeight: "700",
  },

  errBanner: {
    padding: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,.35)",
    backgroundColor: "rgba(127,29,29,.25)",
    marginBottom: 12,
  },
  errText: {
    fontSize: 10.5,
    color: "#fca5a5",
    fontWeight: "600",
    textAlign: "center",
  },
  startingCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,.3)",
    backgroundColor: "rgba(18,16,31,.8)",
    marginBottom: 12,
  },
  spinner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "rgba(139,92,246,.25)",
    borderTopColor: C.purpleLight,
  },
  startingText: {
    fontSize: 11,
    color: C.textSecondary,
    fontWeight: "600",
  },

  hubContent: {
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 30,
  },

  /* CLI */
  cliWrap: {
    flex: 1,
    minHeight: 0,
  },
  cliScrollContent: {
    paddingHorizontal: 14,
    paddingTop: 6,
    paddingBottom: 220,
    flexGrow: 1,
  },
  termScroll: {
    flex: 1,
    minHeight: 0,
  },
  sessionStatus: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 9,
    marginBottom: 12,
  },
  statusTileRunning: {
    flex: 1.15,
    justifyContent: "center",
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "rgba(34,197,94,.32)",
    backgroundColor: "rgba(6,60,34,.24)",
  },
  statusTileTime: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,.09)",
    backgroundColor: "rgba(18,16,31,.9)",
  },
  statusTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  runningDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: C.green,
    shadowColor: C.green,
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  runningText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#86efac",
  },
  statusSub: {
    fontSize: 9.5,
    color: C.textMuted,
    fontFamily: Fonts.mono,
    letterSpacing: 0.2,
  },
  timeTop: {
    justifyContent: "center",
  },
  timeLabel: {
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 0.3,
    color: C.textMuted,
  },
  timeVal: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.4,
    color: "#fff",
    fontVariant: ["tabular-nums"],
    lineHeight: 20,
  },
  stopBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 12,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,.45)",
    backgroundColor: "rgba(127,29,29,.35)",
  },
  stopBtnText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#fca5a5",
  },

  tabBar: {
    flexDirection: "row",
    gap: 4,
    padding: 4,
    marginBottom: 11,
    borderRadius: 11,
    backgroundColor: "rgba(18,16,31,.85)",
    borderWidth: 1,
    borderColor: C.border,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: "rgba(139,92,246,.22)",
    borderWidth: 1,
    borderColor: C.purple,
  },
  tabText: {
    fontSize: 10.5,
    fontWeight: "600",
    color: C.textSecondary,
  },
  tabTextActive: {
    color: "#fff",
  },

  termPanel: {
    flex: 1,
    minHeight: 0,
  },
  termCopy: {
    position: "absolute",
    top: 9,
    right: 10,
    zIndex: 3,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: "rgba(255,255,255,.05)",
  },
  termOut: {
    flex: 1,
    minHeight: 0,
    borderRadius: 13,
    backgroundColor: "#040308",
    borderWidth: 1,
    borderColor: "rgba(139,92,246,.24)",
    paddingTop: 2,
  },
  termOutContent: {
    paddingVertical: 12,
    paddingHorizontal: 13,
    minHeight: 150,
  },
  termLine: {
    fontFamily: Fonts.mono,
    fontSize: 10.5,
    lineHeight: 17,
  },
  blankLine: {
    height: 17,
  },
  pUser: { color: C.greenLight, fontWeight: "600" },
  pHost: { color: C.green },
  pColon: { color: C.green },
  pPath: { color: C.monoDir, fontWeight: "600" },
  pDollar: { color: C.green },
  pCmd: { color: C.monoCmd },
  cursor: {
    color: C.green,
    backgroundColor: C.green,
    width: 7,
    height: 12,
    marginLeft: 1,
    overflow: "hidden",
    opacity: 0.9,
  },

  actionRow: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 148,
    flexDirection: "row",
    gap: 6,
  },
  actBtn: {
    flex: 1,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: C.borderStrong,
    backgroundColor: "rgba(30,27,52,.9)",
    flexDirection: "row",
  },
  actBtnText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: C.textSecondary,
    letterSpacing: 0.1,
  },
  actBtnClear: {
    backgroundColor: "rgba(127,29,29,.35)",
    borderColor: "rgba(239,68,68,.35)",
  },
  actBtnClearText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#fca5a5",
  },
  actBtnUpload: {
    flex: 1.35,
    backgroundColor: "transparent",
    borderColor: "transparent",
  },
  actBtnUploadText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#fff",
  },

  kb: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 4,
    height: 140,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: "rgba(14,12,26,.96)",
  },
  kbRow: {
    flex: 1,
    flexDirection: "row",
    gap: 5,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 3,
  },
  key: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    backgroundColor: "#2f2f39",
  },
  keyText: {
    fontSize: 13,
    fontWeight: "500",
    color: C.monoCmd,
  },
  keyMods: {
    backgroundColor: "rgba(38,37,46,.9)",
  },
  keySpace: {
    backgroundColor: "rgba(38,37,46,.9)",
  },
  keyEnter: {
    backgroundColor: "transparent",
  },
  keyEnterText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  keyModText: {
    fontSize: 12,
    fontWeight: "600",
    color: C.monoOut,
  },
  keyPressed: {
    opacity: 0.7,
    transform: [{ translateY: 1 }],
  },

  dot: {
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  scaled: {
    transform: [{ scale: 0.96 }],
  },

  crashBanner: {
    padding: 11,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,.35)",
    backgroundColor: "rgba(127,29,29,.25)",
    marginBottom: 10,
    gap: 4,
  },
  crashTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: C.monoErr,
  },
  crashBody: {
    fontSize: 10,
    color: C.textSecondary,
    lineHeight: 14,
  },
  reassembleBtn: {
    marginTop: 6,
    borderRadius: 8,
    backgroundColor: C.purple,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
  },
  reassembleText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  exitBanner: {
    padding: 11,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: "rgba(18,16,31,.85)",
    marginBottom: 10,
  },
  exitText: {
    fontSize: 10.5,
    color: C.textSecondary,
    fontWeight: "600",
  },
});