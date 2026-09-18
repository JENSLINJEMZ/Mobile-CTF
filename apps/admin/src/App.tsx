import { APP_VERSION } from "@ctf/shared";
import type { UserDto } from "@ctf/shared";
import { useEffect, useRef, useState } from "react";

import type { Session } from "./adminApi";
import { Icon } from "./icons";
import { AnalyticsView } from "./views/AnalyticsView";
import { AnnouncementsView } from "./views/AnnouncementsView";
import { AuditLogView } from "./views/AuditLogView";
import { ChallengesView } from "./views/ChallengesView";
import { DashboardView } from "./views/DashboardView";
import { EventsView } from "./views/EventsView";
import { SandboxView } from "./views/sandbox/SandboxView";
import { TeamsView } from "./views/TeamsView";
import { UsersView } from "./views/UsersView";

const NAV: Array<[string, string]> = [
  ["Dashboard", "dashboard"],
  ["Challenges", "flag"],
  ["Events", "calendar"],
  ["Users", "user"],
  ["Teams", "users"],
  ["Submissions", "inbox"],
  ["Announcements", "mega"],
  ["Analytics", "chart"],
  ["Sandbox Manager", "box"],
  ["Files & Resources", "folder"],
  ["Badges & Rewards", "award"],
  ["Payments", "card"],
  ["Settings", "gear"],
  ["Audit Log", "list"],
];

const WIRED = new Set([
  "Dashboard",
  "Challenges",
  "Events",
  "Users",
  "Teams",
  "Announcements",
  "Analytics",
  "Sandbox Manager",
  "Audit Log",
]);

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
    data?: { user: UserDto; tokens: { accessToken: string; refreshToken: string } };
    error?: { message: string };
  } | null;
  if (!res.ok || !body?.success || !body.data) {
    throw new Error(body?.error?.message ?? `Login failed (${res.status})`);
  }
  return {
    user: {
      id: body.data.user.id,
      username: body.data.user.username,
      email: body.data.user.email,
      role: body.data.user.role,
    },
    ...body.data.tokens,
  };
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

function Brand() {
  return (
    <div className="brand">
      <svg className="brand-mark" viewBox="0 0 48 48" fill="none">
        <defs>
          <linearGradient id="bm" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#22d3ee" />
            <stop offset=".5" stopColor="#8b5cf6" />
            <stop offset="1" stopColor="#ec4899" />
          </linearGradient>
        </defs>
        <path
          d="M5 40 L16 8 L24 26 L32 8 L43 40 L34 40 L28 24 L24 34 L20 24 L14 40 Z"
          fill="url(#bm)"
        />
      </svg>
      <div>
        <div className="brand-name">Mobile CTF</div>
        <div className="brand-sub">ADMIN CONSOLE</div>
      </div>
    </div>
  );
}

function Arrow() {
  return <Icon name="arrow" />;
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
    <div className="login-wrap">
      <div className="login-card">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            paddingBottom: 2,
          }}
        >
          <Brand />
        </div>
        <div>
          <h2>Sign in</h2>
          <div className="login-sub">Access the Mobile CTF administration console</div>
        </div>
        <label className="login-field">
          <Icon name="user" />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="username"
          />
        </label>
        <label className="login-field">
          <Icon name="gear" />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            type="password"
            autoComplete="current-password"
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
            }}
          />
        </label>
        {error ? <div className="login-err">{error}</div> : null}
        <button className="btn-primary login-btn" onClick={() => void submit()} disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </div>
    </div>
  );
}

function Placeholder({ name }: { name: string }) {
  return (
    <section className="card">
      <div className="card-head">
        <span className="card-title">{name}</span>
        <span className="select">
          Module
          <Icon name="arrow" />
        </span>
      </div>
      <div
        style={{
          padding: "4px 14px 18px",
          fontSize: 12,
          color: "#a49fc4",
          lineHeight: 1.7,
        }}
      >
        This module is not wired up in the current build of the admin console. Use the{" "}
        <b style={{ color: "#cfcae8" }}>Dashboard</b> for an overview and the{" "}
        <b style={{ color: "#cfcae8" }}>Audit Log</b> to trace administrative activity.
      </div>
    </section>
  );
}

function Dashboard({
  session,
  onLogout,
}: {
  session: Session;
  onLogout: () => void;
}) {
  const [activeView, setActiveView] = useState<string>("Dashboard");
  const [userOpen, setUserOpen] = useState(false);
  const sideRef = useRef<HTMLElement>(null);
  const timeRef = useRef<HTMLSpanElement>(null);
  const dateRef = useRef<HTMLSpanElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const d = new Date();
    if (dateRef.current) {
      dateRef.current.textContent = d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    }
    const t = setInterval(() => {
      if (timeRef.current) {
        timeRef.current.textContent = new Date().toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
      }
    }, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const burger = document.getElementById("burger");
    const check = () => {
      const m = window.innerWidth <= 900;
      if (burger) burger.style.display = m ? "grid" : "none";
      if (!m) sideRef.current?.classList.remove("open");
    };
    burger?.addEventListener("click", () => sideRef.current?.classList.toggle("open"));
    window.addEventListener("resize", check);
    check();
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      burger?.removeEventListener("click", () => sideRef.current?.classList.toggle("open"));
      window.removeEventListener("resize", check);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const roleLabel = (session.user.role ?? "ADMIN")
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");

  return (
    <div className="shell">
      <aside className="side" id="side" ref={sideRef}>
        <Brand />
        <div className="brand-tag">CONTROL · MANAGE · SECURE · INSPIRE</div>

        <nav className="nav">
          {NAV.map(([n, ic]) => (
            <button
              key={n}
              type="button"
              onClick={() => {
                setActiveView(n);
                sideRef.current?.classList.remove("open");
              }}
              className={`nav-item${activeView === n ? " active" : ""}`}
            >
              <Icon name={ic} />
              <span>{n}</span>
            </button>
          ))}
        </nav>

        <div className="side-promo">
          <svg className="hood" viewBox="0 0 64 64" fill="none">
            <path
              d="M32 4C20 4 12 14 12 28v12c0 10 8 20 20 20s20-10 20-20V28C52 14 44 4 32 4z"
              fill="#000"
            />
            <path
              d="M32 10c-9 0-15 8-15 18 0 4 2 7 5 8 2-6 5-9 10-9s8 3 10 9c3-1 5-4 5-8 0-10-6-18-15-18z"
              fill="#1d1640"
            />
          </svg>
          <h4>CTF Builders</h4>
          <p>Build the next generation of security minds.</p>
          <div className="quote">
            “Same minds.
            <br />
            Different exploits.”
          </div>
        </div>

        <div className="side-foot">
          <div>
            <div className="v">v{APP_VERSION}</div>
            <div className="n">Mobile CTF Admin</div>
          </div>
          <span className="pill-green">
            <i className="dot"></i>API Online
          </span>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button className="icon-btn" id="burger" style={{ display: "none" }} aria-label="Menu">
            <Icon name="menu" />
          </button>
          <label className="search">
            <Icon name="eye" style={{ width: 15, height: 15 }} />
            <input
              ref={searchRef}
              placeholder="Search users, challenges, teams, submissions..."
              aria-label="Search"
            />
            <span className="kbd">Ctrl K</span>
          </label>
          <div className="top-right">
            <button className="icon-btn" aria-label="Theme">
              <Icon name="sun" />
            </button>
            <button className="icon-btn" aria-label="Notifications">
              <Icon name="bell" />
              <span className="badge-count">6</span>
            </button>
            <div className="user-wrap">
              <button
                className="user"
                onClick={() => setUserOpen((v) => !v)}
                aria-label="Account"
              >
                <span className="avatar">
                  <Icon name="user" />
                </span>
                <div>
                  <div className="nm">{session.user.username ?? "admin"}</div>
                  <div className="rl">{roleLabel}</div>
                </div>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  style={{ width: 12, height: 12, color: "#6f6a90" }}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {userOpen ? (
                <>
                  <div
                    style={{
                      position: "fixed",
                      inset: 0,
                      zIndex: 49,
                    }}
                    onClick={() => setUserOpen(false)}
                  />
                  <div className="user-menu">
                    <button onClick={onLogout}>
                      <Icon name="export" />
                      Sign out
                    </button>
                  </div>
                </>
              ) : null}
            </div>
            <div className="clock">
              <b>
                <span ref={dateRef}></span>
              </b>
              <span ref={timeRef}>—</span>
            </div>
          </div>
        </header>

        <main
          className={`content${
            activeView === "Sandbox Manager"
              ? " sbox-shell"
              : activeView === "Challenges"
                ? " chx-shell"
                : ""
          }`}
        >
          <div key={activeView} style={{ display: "contents" }}>
            {activeView === "Dashboard" ? (
              <DashboardView session={session} onNavigate={(v) => setActiveView(v)} />
            ) : null}
            {activeView === "Challenges" ? <ChallengesView session={session} /> : null}
            {activeView === "Events" ? <EventsView session={session} /> : null}
            {activeView === "Announcements" ? <AnnouncementsView session={session} /> : null}
            {activeView === "Users" ? <UsersView session={session} /> : null}
            {activeView === "Teams" ? <TeamsView session={session} /> : null}
            {activeView === "Analytics" ? <AnalyticsView session={session} /> : null}
            {activeView === "Sandbox Manager" ? <SandboxView session={session} /> : null}
            {activeView === "Audit Log" ? <AuditLogView session={session} /> : null}
            {!WIRED.has(activeView) ? <Placeholder name={activeView} /> : null}
          </div>

          {activeView === "Dashboard" ? (
            <footer className="foot">
              <span className="q">“Hack. Learn. Compete. Repeat.”</span>
              <span className="rt">
                <svg viewBox="0 0 48 48" fill="none">
                  <path
                    d="M5 40 L16 8 L24 26 L32 8 L43 40 L34 40 L28 24 L24 34 L20 24 L14 40 Z"
                    fill="url(#bm)"
                  />
                </svg>
                Mobile CTF | Admin Console
                <span style={{ color: "#6f6a90" }}>v{APP_VERSION}</span>
              </span>
            </footer>
          ) : null}
        </main>
      </div>
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
      .then((user) =>
        setSession((prev) => (prev ? { ...prev, user } : prev)),
      )
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