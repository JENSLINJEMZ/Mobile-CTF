import { APP_NAME, APP_VERSION } from "@ctf/shared";
import type { AuthResponse, UserDto } from "@ctf/shared";
import type { AnalyticsOverviewDto, AuditLogDto } from "@ctf/shared";
import { Badge, Button, Card, Text } from "@ctf/ui";
import { useEffect, useState } from "react";

import type { Session } from "./adminApi";
import * as adminApi from "./adminApi";
import { AnalyticsView } from "./views/AnalyticsView";
import { AnnouncementsView } from "./views/AnnouncementsView";
import { AuditLogView } from "./views/AuditLogView";
import { ChallengesView } from "./views/ChallengesView";
import { EventsView } from "./views/EventsView";
import { TeamsView } from "./views/TeamsView";
import { UsersView } from "./views/UsersView";

const NAV_ITEMS = [
  "Dashboard",
  "Challenges",
  "Events",
  "Announcements",
  "Users",
  "Teams",
  "Analytics",
  "Audit Log",
] as const;

type NavItem = (typeof NAV_ITEMS)[number];

const SESSION_KEY = "ctf.adminSession.v1";

function loadSession(): Session | null {
  try {
    const raw = globalThis.localStorage?.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as Session) : null;
  } catch {
    return null;
  }
}

function persistSession(session: Session | null) {
  if (session) {
    globalThis.localStorage?.setItem(SESSION_KEY, JSON.stringify(session));
  } else {
    globalThis.localStorage?.removeItem(SESSION_KEY);
  }
}

async function requestLogin(email: string, password: string): Promise<Session> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = (await res.json().catch(() => null)) as {
    success: boolean;
    data?: AuthResponse;
    error?: { message: string };
  } | null;
  if (!res.ok || !body?.success || !body.data) {
    throw new Error(body?.error?.message ?? `Login failed (${res.status})`);
  }
  return { user: body.data.user, ...body.data.tokens };
}

async function fetchSession(session: Session): Promise<UserDto> {
  const res = await fetch("/api/auth/me", {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });
  const body = (await res.json().catch(() => null)) as {
    success: boolean;
    data?: UserDto;
  } | null;
  if (!res.ok || !body?.success || !body.data) {
    throw new Error("Session expired");
  }
  return body.data;
}

function LoginView({ onLogin }: { onLogin: (s: Session) => void }) {
  const [email, setEmail] = useState("admin@ctf.test");
  const [password, setPassword] = useState("ctfpass123");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      onLogin(await requestLogin(email, password));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0f172a",
      }}
    >
      <Card
        title={`${APP_NAME} Admin`}
        style={{ width: 360 }}
        bodyStyle={{ display: "flex", flexDirection: "column", gap: 12 }}
      >
        <Text tone="secondary" size="sm">
          Admin console v{APP_VERSION}
        </Text>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          style={inputStyle}
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          type="password"
          style={inputStyle}
        />
        {error ? (
          <Text tone="danger" size="sm">
            {error}
          </Text>
        ) : null}
        <Button onClick={() => void submit()} disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </Card>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  fontSize: 14,
};

function DashboardOverview({ session }: { session: Session }) {
  const [overview, setOverview] = useState<AnalyticsOverviewDto | null>(null);
  const [recent, setRecent] = useState<AuditLogDto[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      adminApi.getAnalyticsOverview(session),
      adminApi.listAuditLog(session, { limit: 8 }),
    ])
      .then(([o, a]) => {
        setOverview(o);
        setRecent(a.items);
      })
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Failed to load dashboard"),
      );
  }, [session]);

  const stats: Array<[string, number]> = overview
    ? [
        ["Users", overview.totalUsers],
        ["Challenges", overview.totalChallenges],
        ["Solves", overview.totalSubmissions],
        ["Points", overview.totalPointsAwarded],
        ["Solves today", overview.solvesToday],
      ]
    : [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {error ? <Text tone="danger">{error}</Text> : null}
      <Card
        title="Platform overview"
        bodyStyle={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        {stats.length === 0 ? (
          <Text tone="secondary">Loading…</Text>
        ) : (
          stats.map(([label, value]) => (
            <div
              key={label}
              style={{
                flex: 1,
                minWidth: 120,
                padding: 12,
                borderRadius: 10,
                border: "1px solid #e2e8f0",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <Text tone="secondary" size="xs">
                {label}
              </Text>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{value}</div>
            </div>
          ))
        )}
      </Card>

      <Card
        title="Recent activity"
        bodyStyle={{ display: "flex", flexDirection: "column", gap: 6 }}
      >
        {recent.length === 0 ? (
          <Text tone="secondary">No recent admin activity.</Text>
        ) : (
          recent.map((entry) => (
            <div
              key={entry.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                fontSize: 14,
              }}
            >
              <span>
                <Badge tone="neutral">{entry.action}</Badge>{" "}
                <span style={{ fontWeight: 600 }}>{entry.entityType}</span>
                {entry.entityId ? <span> #{entry.entityId}</span> : null}
              </span>
              <Text tone="secondary" size="xs">
                {entry.actorUsername ?? `#${entry.actorId ?? "?"}`} ·{" "}
                {new Date(entry.createdAt).toLocaleString()}
              </Text>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}

function Dashboard({
  session,
  onLogout,
}: {
  session: Session;
  onLogout: () => void;
}) {
  const [activeView, setActiveView] = useState<NavItem>("Dashboard");

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        style={{
          width: 240,
          backgroundColor: "#0f172a",
          color: "#e2e8f0",
          padding: 24,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div>
            <div style={{ color: "#ffffff", fontSize: 18, fontWeight: 700 }}>
              {APP_NAME}
            </div>
            <Text tone="muted" size="sm">
              Admin console v{APP_VERSION}
            </Text>
          </div>
        </div>
        <nav
          style={{
            marginTop: 24,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          {NAV_ITEMS.map((item) => (
            <a
              key={item}
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setActiveView(item);
              }}
              style={{
                color: "#cbd5e1",
                textDecoration: "none",
                padding: "8px 12px",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: activeView === item ? 700 : 400,
                backgroundColor:
                  activeView === item
                    ? "rgba(37, 99, 235, 0.25)"
                    : "transparent",
              }}
            >
              {item}
            </a>
          ))}
        </nav>
      </aside>

      <main style={{ flex: 1, padding: 32 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: 16,
            gap: 12,
          }}
        >
          <Text tone="secondary" size="sm">
            {session.user.email} ({session.user.role})
          </Text>
          <Button onClick={onLogout}>Sign out</Button>
        </div>

        {activeView === "Dashboard" ? (
          <DashboardOverview session={session} />
        ) : null}
        {activeView === "Challenges" ? (
          <ChallengesView session={session} />
        ) : null}
        {activeView === "Events" ? <EventsView session={session} /> : null}
        {activeView === "Announcements" ? (
          <AnnouncementsView session={session} />
        ) : null}
        {activeView === "Users" ? <UsersView session={session} /> : null}
        {activeView === "Teams" ? <TeamsView session={session} /> : null}
        {activeView === "Analytics" ? <AnalyticsView session={session} /> : null}
        {activeView === "Audit Log" ? <AuditLogView session={session} /> : null}
      </main>
    </div>
  );
}

export function App() {
  const [session, setSession] = useState<Session | null>(() => loadSession());

  const handleLogin = (s: Session) => {
    persistSession(s);
    setSession(s);
  };

  const handleLogout = () => {
    persistSession(null);
    setSession(null);
  };

  useEffect(() => {
    if (!session) return;
    fetchSession(session)
      .then((user) => setSession((prev) => (prev ? { ...prev, user } : prev)))
      .catch(() => {
        persistSession(null);
        setSession(null);
      });
  }, [session?.accessToken]);

  if (!session) {
    return <LoginView onLogin={handleLogin} />;
  }

  return <Dashboard session={session} onLogout={handleLogout} />;
}
