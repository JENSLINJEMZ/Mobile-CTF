import type {
  PlatformSettingsUpdatePayload,
  SettingsOverviewDto,
  SystemStatusDto,
} from "@ctf/shared";
import { useCallback, useEffect, useState } from "react";

import type { Session } from "../adminApi";
import * as adminApi from "../adminApi";
import { ConfigGrid } from "./settings/ConfigGrid";
import {
  BELL_ICON,
  BOX_ICON,
  CARD_ICON,
  FLAG_ICON,
  GEAR_ICON,
  SHIELD_ICON,
  SUN_ICON,
  USERS_ICON,
} from "./settings/icons";
import { PlatformInfoPanel } from "./settings/PlatformInfoPanel";
import { ProgressPanel } from "./settings/ProgressPanel";
import { QuickActions } from "./settings/QuickActions";
import { QuoteCard } from "./settings/QuoteCard";
import { SettingsKpis } from "./settings/SettingsKpis";
import { SystemInfoPanel } from "./settings/SystemInfoPanel";
import { SystemSettingsPanel } from "./settings/SystemSettingsPanel";

const TABS: Array<{ label: string; icon: string; target?: string }> = [
  { label: "Overview", icon: GEAR_ICON },
  { label: "Platform", icon: GEAR_ICON },
  { label: "Users & Teams", icon: USERS_ICON, target: "Users" },
  { label: "Challenges", icon: FLAG_ICON, target: "Challenges" },
  { label: "Sandbox", icon: BOX_ICON, target: "Sandbox Manager" },
  { label: "Payments", icon: CARD_ICON },
  { label: "Notifications", icon: BELL_ICON },
  { label: "Security", icon: SHIELD_ICON, target: "Audit Log" },
  { label: "Appearance", icon: SUN_ICON },
  { label: "Advanced", icon: SUN_ICON },
];

export function SettingsView({
  session,
  onNavigate,
}: {
  session: Session;
  onNavigate?: (view: string) => void;
}) {
  const [overview, setOverview] = useState<SettingsOverviewDto | null>(null);
  const [system, setSystem] = useState<SystemStatusDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState("Overview");

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const [ov, sys] = await Promise.all([
        adminApi.getSettingsOverview(session),
        adminApi.getSystemStatus(session),
      ]);
      setOverview(ov);
      setSystem(sys);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setBusy(false);
    }
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  const commit = useCallback(
    async (patch: PlatformSettingsUpdatePayload) => {
      const updated = await adminApi.updatePlatformSettings(session, patch);
      setOverview((prev) => (prev ? { ...prev, settings: updated } : prev));
    },
    [session],
  );

  if (error && !overview) {
    return (
      <div className="set-wrap" style={{ padding: 24 }}>
        <div
          className="sub-banner error"
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
        >
          <span>{error}</span>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void load()}
            disabled={busy}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!overview || !system) {
    return (
      <div className="set-wrap" style={{ padding: 32, textAlign: "center", color: "var(--text-3)" }}>
        <div
          style={{
            display: "inline-block",
            width: 28,
            height: 28,
            border: "2px solid var(--purple)",
            borderTopColor: "transparent",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
            marginBottom: 12,
          }}
        />
        <div>Loading settings…</div>
      </div>
    );
  }

  return (
    <div className="set-wrap">
      <div className="page-head">
        <div>
          <div className="breadcrumbs">
            <span style={{ cursor: onNavigate ? "pointer" : "default" }} onClick={() => onNavigate?.("Dashboard")}>
              Dashboard
            </span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
            <span className="active">Settings</span>
          </div>
          <h1 className="page-title">Settings</h1>
          <p className="page-sub">
            Manage your platform, customize features, and keep everything secure.
          </p>
        </div>
        <div className="page-actions">
          <p className="page-quote">
            &ldquo;Configure today.
            <br />
            A stronger community tomorrow.&rdquo;
          </p>
        </div>
      </div>

      <div className="tabs-row">
        {TABS.map((tab) => (
          <button
            key={tab.label}
            type="button"
            className={`tab${activeTab === tab.label ? " is-active" : ""}`}
            onClick={() => {
              if (tab.target && onNavigate) {
                onNavigate(tab.target);
                return;
              }
              if (tab.label === "Overview") setActiveTab("Overview");
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: tab.icon }} />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid">
        <div className="left-col">
          <SettingsKpis kpis={overview.kpis} />
          <PlatformInfoPanel settings={overview.settings} onSave={commit} />
          <SystemSettingsPanel settings={overview.settings} onSave={commit} />

          <div className="config-grid">
            <ConfigGrid onNavigate={onNavigate} />
          </div>
        </div>

        <div className="right-col">
          <div className="right-top">
            <ProgressPanel settings={overview.settings} />
            <div className="right-top-side">
              <QuoteCard />
              <QuickActions settings={overview.settings} onNavigate={onNavigate} />
            </div>
          </div>
          <SystemInfoPanel
            system={system}
            environment={overview.kpis.environment}
            onNavigate={onNavigate}
          />
        </div>
      </div>

      <footer className="footer">
        <span>&ldquo;Small settings. Big impact.&rdquo;</span>
        <div className="footer-brand">
          <svg className="fm-logo" viewBox="0 0 40 28" fill="none">
            <defs>
              <linearGradient id="setFootGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#c4b5fd" />
                <stop offset="55%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#6d28d9" />
              </linearGradient>
            </defs>
            <path
              d="M2 26 L12 2 L20 13.5 L28 2 L38 26 L29 26 L24.5 15.5 L20 22 L15.5 15.5 L11 26 Z"
              fill="url(#setFootGrad)"
            />
          </svg>
          <b>Mobile CTF</b>
          <span className="sep" />
          <span>Admin Console</span>
          <span className="sep" />
          <span>v{system.resources.version}</span>
        </div>
      </footer>
    </div>
  );
}