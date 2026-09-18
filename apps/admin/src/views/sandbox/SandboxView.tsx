import { useCallback, useMemo, useState } from "react";

import type { Session } from "../../adminApi";
import * as adminApi from "../../adminApi";
import { Icon } from "../../icons";
import { ActivityFeed } from "./ActivityFeed";
import { AccessTab } from "./AccessTab";
import { EnvFilters } from "./EnvFilters";
import { EnvTable } from "./EnvTable";
import { KpiCards } from "./KpiCards";
import { LogsTab } from "./LogsTab";
import { D_BREAD, D_DOC, D_SETTINGS, Svg } from "./miniIcons";
import { NetworkTab } from "./NetworkTab";
import { ResourceRings } from "./ResourceRings";
import { ResourcesTab } from "./ResourcesTab";
import { UsersTab } from "./UsersTab";
import { useSandboxLive, type SandboxFilter } from "./useSandboxLive";

const TABS = [
  "Environments",
  "Users",
  "Resource Usage",
  "Network",
  "Access Control",
  "Logs",
];

export function SandboxView({ session }: { session: Session }) {
  const { snap, error, live, activity, refresh, reportError } = useSandboxLive(session);
  const [activeTab, setActiveTab] = useState(0);
  const [filter, setFilter] = useState<SandboxFilter>({
    q: "",
    status: "all",
    user: "all",
  });
  const [stopping, setStopping] = useState<string | null>(null);

  const daemonUp = snap?.daemonUp ?? true;
  const limits = snap?.limits;

  const users = useMemo(() => {
    const set = new Set<string>();
    for (const c of snap?.containers ?? []) if (c.user) set.add(c.user.username);
    return [...set].sort();
  }, [snap]);

  const filtered = useMemo(() => {
    const needle = filter.q.trim().toLowerCase();
    return (snap?.containers ?? []).filter((c) => {
      if (filter.status !== "all" && c.status !== filter.status) return false;
      if (filter.user !== "all" && c.user?.username !== filter.user) return false;
      if (needle) {
        const hay = `${c.id} ${c.name} ${c.user?.username ?? ""} ${c.image}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [snap, filter]);

  const sparkRunning = useMemo(
    () => (snap?.trends ?? []).map((t) => t.running),
    [snap],
  );
  const sparkStopped = useMemo(
    () => (snap?.trends ?? []).map((t) => t.stopped),
    [snap],
  );
  const sparkTotal = useMemo(
    () => (snap?.trends ?? []).map((t) => t.total),
    [snap],
  );

  const handleStop = useCallback(
    async (envId: string) => {
      if (stopping) return;
      setStopping(envId);
      try {
        await adminApi.stopSandboxContainer(session, envId);
      } catch (err) {
        reportError(err instanceof Error ? err.message : "Could not stop environment");
      } finally {
        setStopping(null);
        void refresh();
      }
    },
    [session, stopping, refresh],
  );

  return (
    <div className="sbx">
      <div className="page-head">
        <div>
          <div className="breadcrumbs">
            <span>Dashboard</span>
            <Svg d={D_BREAD} size={11} />
            <span className="active">Sandbox Manager</span>
          </div>
          <h1 className="page-title">Sandbox Manager</h1>
          <p className="page-sub">
            Manage isolated environments for CTF challenges.
            {snap?.host ? ` Running on ${snap.host.name} · Docker ${snap.host.dockerApiVersion}.` : ""}
          </p>
        </div>
        <div className="page-actions">
          <p className="page-quote">
            "Controlled environments.
            <br />
            Unlimited possibilities."
          </p>
          <button className="btn btn-secondary">
            <Svg d={D_DOC} />
            Documentation
          </button>
          <button className="btn btn-secondary">
            <Svg d={D_SETTINGS} />
            Settings
          </button>
          <button
            className="btn btn-primary"
            title="Environments are provisioned on-demand from challenge terminals"
          >
            <Icon name="plus" />
            Create Environment
          </button>
        </div>
      </div>

      {error ? (
        <div className="sbx-error">
          {error} — {daemonUp ? "live updates paused" : "sandbox daemon unreachable"}
        </div>
      ) : null}

      <div className="grid sbx-grid">
        <div className="left-col">
          <KpiCards
            snap={snap}
            live={live}
            sparkRunning={sparkRunning}
            sparkStopped={sparkStopped}
            sparkTotal={sparkTotal}
          />

          <div className="tabs">
            {TABS.map((t, i) => (
              <button
                key={t}
                className={`tab${i === activeTab ? " is-active" : ""}`}
                onClick={() => setActiveTab(i)}
              >
                {t}
              </button>
            ))}
          </div>

          {activeTab === 0 ? (
            <>
              <EnvFilters
                filter={filter}
                users={users}
                image={limits?.image}
                onFilter={setFilter}
                onRefresh={() => void refresh()}
              />
              <EnvTable envs={filtered} daemonUp={daemonUp} onStop={handleStop} stopping={stopping} />
            </>
          ) : null}

          {activeTab === 1 ? (
            <UsersTab containers={snap?.containers ?? []} daemonUp={daemonUp} />
          ) : null}

          {activeTab === 2 ? (
            <ResourcesTab
              resources={snap?.resources ?? null}
              trends={snap?.trends ?? []}
              categories={snap?.categories ?? []}
              total={snap?.kpis?.total ?? 0}
              host={snap?.host ?? null}
            />
          ) : null}

          {activeTab === 3 ? (
            <NetworkTab
              resources={snap?.resources ?? null}
              containers={snap?.containers ?? []}
              daemonUp={daemonUp}
            />
          ) : null}

          {activeTab === 4 ? <AccessTab limits={snap?.limits ?? null} /> : null}

          {activeTab === 5 ? (
            <LogsTab activity={activity} live={live === "live"} />
          ) : null}
        </div>

        <div className="right-col">
          <ResourceRings resources={snap?.resources ?? null} host={snap?.host ?? null} live={live} />
          <ActivityFeed activity={activity} live={live === "live"} />
        </div>
      </div>
    </div>
  );
}