import { APP_NAME, APP_VERSION } from '@ctf/shared';
import type { AuthResponse, HealthResponse, UserDto } from '@ctf/shared';
import { Badge, Button, Card, Text } from '@ctf/ui';
import { useEffect, useState } from 'react';

import type { Session } from './adminApi';
import { AnnouncementsView } from './views/AnnouncementsView';
import { EventsView } from './views/EventsView';

const NAV_ITEMS = [
  'Dashboard',
  'Challenges',
  'Events',
  'Announcements',
  'Users',
  'Teams',
  'Analytics',
  'Audit Log',
] as const;

type NavItem = (typeof NAV_ITEMS)[number];

const SESSION_KEY = 'ctf.adminSession.v1';

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
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = (await res.json().catch(() => null)) as
    | { success: boolean; data?: AuthResponse; error?: { message: string } }
    | null;
  if (!res.ok || !body?.success || !body.data) {
    throw new Error(body?.error?.message ?? `Login failed (${res.status})`);
  }
  return { user: body.data.user, ...body.data.tokens };
}

async function fetchSession(session: Session): Promise<UserDto> {
  const res = await fetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${session.accessToken}` },
  });
  const body = (await res.json().catch(() => null)) as
    | { success: boolean; data?: UserDto }
    | null;
  if (!res.ok || !body?.success || !body.data) {
    throw new Error('Session expired');
  }
  return body.data;
}

function LoginView({ onLogin }: { onLogin: (s: Session) => void }) {
  const [email, setEmail] = useState('admin@ctf.test');
  const [password, setPassword] = useState('ctfpass123');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      onLogin(await requestLogin(email, password));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0f172a',
      }}
    >
      <Card title={`${APP_NAME} Admin`} style={{ width: 360 }} bodyStyle={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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
        {error ? <Text tone="danger" size="sm">{error}</Text> : null}
        <Button onClick={() => void submit()} disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</Button>
      </Card>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '10px 12px',
  borderRadius: 8,
  border: '1px solid #cbd5e1',
  fontSize: 14,
};

function Dashboard({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const [apiStatus, setApiStatus] = useState<'checking' | 'up' | 'down'>('checking');
  const [activeView, setActiveView] = useState<NavItem>('Dashboard');

  useEffect(() => {
    fetch('/api/health', {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('bad status'))))
      .then((body: HealthResponse) => setApiStatus(body.status === 'ok' ? 'up' : 'down'))
      .catch(() => setApiStatus('down'));
  }, [session.accessToken]);

  const untouched = new Set<NavItem>(['Dashboard', 'Challenges', 'Users', 'Teams', 'Analytics', 'Audit Log']);

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside
        style={{
          width: 240,
          backgroundColor: '#0f172a',
          color: '#e2e8f0',
          padding: 24,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: '#ffffff', fontSize: 18, fontWeight: 700 }}>{APP_NAME}</div>
            <Text tone="muted" size="sm">
              Admin console v{APP_VERSION}
            </Text>
          </div>
        </div>
        <nav style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {NAV_ITEMS.map((item) => (
            <a
              key={item}
              href="#"
              onClick={(e) => {
                e.preventDefault();
                setActiveView(item);
              }}
              style={{
                color: '#cbd5e1',
                textDecoration: 'none',
                padding: '8px 12px',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: activeView === item ? 700 : 400,
                backgroundColor: activeView === item ? 'rgba(37, 99, 235, 0.25)' : 'transparent',
              }}
            >
              {item}
            </a>
          ))}
        </nav>
      </aside>

      <main style={{ flex: 1, padding: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16, gap: 12 }}>
          <Text tone="secondary" size="sm">
            {session.user.email} ({session.user.role})
          </Text>
          <Button onClick={onLogout}>Sign out</Button>
        </div>

        {activeView === 'Events' ? <EventsView session={session} /> : null}
        {activeView === 'Announcements' ? <AnnouncementsView session={session} /> : null}

        {untouched.has(activeView) ? (
          <Card
            title={`Stage 7 — ${activeView}`}
            bodyStyle={{ display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <Text>
              API status:{' '}
              {apiStatus === 'checking' ? (
                <Badge tone="neutral">checking…</Badge>
              ) : apiStatus === 'up' ? (
                <Badge tone="success">up</Badge>
              ) : (
                <Badge tone="danger">down</Badge>
              )}
            </Text>
            <Text tone="secondary">
              Signed in as <code>{session.user.username}</code>. This section is a placeholder in
              this stage.
            </Text>
          </Card>
        ) : null}
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