import type { AnalyticsOverviewDto } from "@ctf/shared";
import { useCallback, useEffect, useState } from "react";

import type { Session } from "../adminApi";
import * as adminApi from "../adminApi";
import { CALENDAR_ICON } from "./analytics/icons";
import { AnalyticsKpis } from "./analytics/AnalyticsKpis";
import { SubmissionsChart } from "./analytics/SubmissionsChart";
import { RealtimeBarChart } from "./analytics/RealtimeBarChart";
import { UserGrowthChart } from "./analytics/UserGrowthChart";
import { CategoryDonut } from "./analytics/CategoryDonut";
import { DifficultyBars } from "./analytics/DifficultyBars";
import { TopChallengesList } from "./analytics/TopChallengesList";
import { ActivityHeatmap } from "./analytics/ActivityHeatmap";
import { TopUsersTable } from "./analytics/TopUsersTable";
import { TopTeamsTable } from "./analytics/TopTeamsTable";
import { EventPerfTable } from "./analytics/EventPerfTable";
import { PlatformHealthPanel } from "./analytics/PlatformHealthPanel";
import { UserRolePanel } from "./analytics/UserRolePanel";
import { RecentActivityFeed } from "./analytics/RecentActivityFeed";

const TABS = [
  "Overview",
  "Users",
  "Challenges",
  "Teams",
  "Submissions",
  "Events",
  "Geography",
  "Retention",
  "System",
];

export function AnalyticsView({
  session,
  onNavigate,
}: {
  session: Session;
  onNavigate?: (view: string) => void;
}) {
  const [overview, setOverview] = useState<AnalyticsOverviewDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState("Overview");
  const [period, setPeriod] = useState<"30D" | "7D" | "ALL">("30D");

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      setOverview(await adminApi.getAnalyticsOverview(session));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setBusy(false);
    }
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error && !overview) {
    return (
      <div className="aly-wrap" style={{ padding: 24 }}>
        <div className="sub-banner error" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>{error}</span>
          <button type="button" className="btn btn-secondary" onClick={() => void load()} disabled={busy}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="aly-wrap" style={{ padding: 32, textAlign: "center", color: "var(--text-3)" }}>
        <div style={{ display: "inline-block", width: 28, height: 28, border: "2px solid var(--purple)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", marginBottom: 12 }} />
        <div>Loading analytics dashboard...</div>
      </div>
    );
  }

  return (
    <div className="aly-wrap">
      {/* Page Header */}
      <div className="page-head">
        <div>
          <div className="breadcrumbs">
            <span
              style={{ cursor: onNavigate ? "pointer" : "default" }}
              onClick={() => onNavigate?.("Dashboard")}
            >
              Dashboard
            </span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m9 18 6-6-6-6" />
            </svg>
            <span className="active">Analytics</span>
          </div>
          <h1 className="page-title">Platform Analytics</h1>
          <p className="page-sub">
            Deep-dive metrics across challenges, participants, submissions, and platform activity.
          </p>
        </div>

        <div className="page-actions">
          <div className="page-quote">&ldquo;Track the present. Build the future.&rdquo;</div>
          <div className="head-controls">
            <span className="date-range">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                dangerouslySetInnerHTML={{ __html: CALENDAR_ICON }}
              />
              {period === "30D" ? "Last 30 Days" : period === "7D" ? "Last 7 Days" : "All Time"}
            </span>

            <div className="period-tabs">
              <button
                type="button"
                className={`period-tab ${period === "30D" ? "is-active" : ""}`}
                onClick={() => setPeriod("30D")}
              >
                30D
              </button>
              <button
                type="button"
                className={`period-tab ${period === "7D" ? "is-active" : ""}`}
                onClick={() => setPeriod("7D")}
              >
                7D
              </button>
              <button
                type="button"
                className={`period-tab ${period === "ALL" ? "is-active" : ""}`}
                onClick={() => setPeriod("ALL")}
              >
                All
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="tabs-row">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={`tab ${activeTab === tab ? "is-active" : ""}`}
            onClick={() => {
              setActiveTab(tab);
              if (tab !== "Overview" && onNavigate) {
                // Quick jump to dedicated views if available
                if (tab === "Users") onNavigate("Users");
                else if (tab === "Challenges") onNavigate("Challenges");
                else if (tab === "Teams") onNavigate("Teams");
                else if (tab === "Submissions") onNavigate("Submissions");
                else if (tab === "Events") onNavigate("Events");
              }
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* 6 KPI Cards */}
      {overview.kpis ? <AnalyticsKpis kpis={overview.kpis} /> : null}

      {/* ROW 1: 3 Charts */}
      <div className="row-charts">
        <SubmissionsChart days={overview.submissionsByDay} />
        <RealtimeBarChart
          activeUsers={overview.activeUsers}
          hourlyActivity={overview.hourlyActivity}
        />
        <UserGrowthChart data={overview.userGrowth} />
      </div>

      {/* ROW 2: 4 Panels */}
      <div className="row-four">
        <CategoryDonut
          categories={overview.categoryDistribution}
          totalChallenges={overview.totalChallenges}
        />
        <DifficultyBars diffStats={overview.difficultyDistribution} />
        <TopChallengesList challenges={overview.topChallenges} />
        <ActivityHeatmap cells={overview.heatmap} />
      </div>

      {/* ROW 3: Top Users + Top Teams */}
      <div className="row-two">
        <TopUsersTable
          users={overview.topUsersTable}
          onViewAll={onNavigate ? () => onNavigate("Users") : undefined}
        />
        <TopTeamsTable
          teams={overview.topTeamsTable}
          onViewAll={onNavigate ? () => onNavigate("Teams") : undefined}
        />
      </div>

      {/* ROW 4: 4 Panels */}
      <div className="row-four-2">
        <EventPerfTable events={overview.eventPerformance} />
        <PlatformHealthPanel health={overview.platformHealth} />
        <UserRolePanel
          roles={overview.userRoleDistribution}
          totalUsers={overview.totalUsers}
        />
        <RecentActivityFeed
          activity={overview.recentActivity}
          onViewAll={onNavigate ? () => onNavigate("Submissions") : undefined}
        />
      </div>

      {/* Footer */}
      <footer className="footer">
        <span>&ldquo;Track the present. Build the future.&rdquo;</span>
        <div className="footer-brand">
          <svg className="fm-logo" viewBox="0 0 40 28" fill="none">
            <defs>
              <linearGradient id="footGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#c4b5fd" />
                <stop offset="55%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#6d28d9" />
              </linearGradient>
            </defs>
            <path
              d="M2 26 L12 2 L20 13.5 L28 2 L38 26 L29 26 L24.5 15.5 L20 22 L15.5 15.5 L11 26 Z"
              fill="url(#footGrad)"
            />
          </svg>
          <b>Mobile CTF</b>
          <span className="sep" />
          <span>Admin Console</span>
          <span className="sep" />
          <span>v2.1.0</span>
        </div>
      </footer>
    </div>
  );
}