import type { SettingsKpisDto } from "@ctf/shared";

import { BOX_ICON, FLAG_ICON, OPERATIONAL_ICON, USERS_ICON } from "./icons";
import { formatNumber } from "./format";

export function SettingsKpis({ kpis }: { kpis: SettingsKpisDto }) {
  return (
    <div className="panel overview-panel">
      <div className="panel-head">
        <div className="panel-title-wrap">
          <span className="panel-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: OPERATIONAL_ICON }} />
          </span>
          <div className="panel-title-block">
            <span className="panel-title">Platform Overview</span>
            <span className="panel-sub">Live health and scale of the platform.</span>
          </div>
        </div>
      </div>

      <div className="overview-kpis">
        <div className={`ov-kpi ${kpis.operational ? "green" : "red"}`}>
          <span className="ov-kpi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: OPERATIONAL_ICON }} />
          </span>
          <div className="ov-kpi-body">
            <span className="ov-kpi-title">
              {kpis.operational ? "Operational" : "Degraded"}
            </span>
            <span className="ov-kpi-sub">
              {kpis.operational ? "All Systems Online" : "Core Service Down"}
            </span>
          </div>
        </div>

        <div className="ov-kpi purple">
          <span className="ov-kpi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: USERS_ICON }} />
          </span>
          <div className="ov-kpi-body">
            <span className="ov-kpi-value">{formatNumber(kpis.totalUsers)}</span>
            <span className="ov-kpi-sub">Total Users</span>
          </div>
        </div>

        <div className="ov-kpi red">
          <span className="ov-kpi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: FLAG_ICON }} />
          </span>
          <div className="ov-kpi-body">
            <span className="ov-kpi-value">{formatNumber(kpis.totalChallenges)}</span>
            <span className="ov-kpi-sub">Challenges</span>
          </div>
        </div>

        <div className="ov-kpi blue">
          <span className="ov-kpi-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: BOX_ICON }} />
          </span>
          <div className="ov-kpi-body">
            <span className="ov-kpi-value">{formatNumber(kpis.activeSandboxes)}</span>
            <span className="ov-kpi-sub">Active Sandboxes</span>
          </div>
        </div>
      </div>
    </div>
  );
}