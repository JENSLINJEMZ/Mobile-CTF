import type { SystemStatusDto } from "@ctf/shared";
import { useEffect, useState } from "react";

import { clampPct, formatBytes, formatServerTime, formatUptime } from "./format";
import { CHEVRON_ICON, DATABASE_ICON } from "./icons";

export function SystemInfoPanel({
  system,
  environment,
  onNavigate,
}: {
  system: SystemStatusDto;
  environment: string;
  onNavigate?: (view: string) => void;
}) {
  const [shown, setShown] = useState(false);
  const [clock, setClock] = useState(() => new Date());

  const db = system.services.find((s) => s.key === "database");
  const memPct = clampPct(
    (system.resources.memoryUsedBytes / system.resources.memoryTotalBytes) * 100,
  );
  const storagePct = clampPct(
    (system.storage.usedBytes / system.storage.totalBytes) * 100,
  );
  const cpuPct = clampPct(
    (system.resources.load1 / Math.max(1, system.resources.cpuCount)) * 100,
  );

  useEffect(() => {
    const raf = requestAnimationFrame(() =>
      window.setTimeout(() => setShown(true), 320),
    );
    const timer = window.setInterval(() => setClock(new Date()), 1000);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(timer);
    };
  }, []);

  const rows: Array<{
    key: string;
    val: React.ReactNode;
  }> = [
    { key: "Version", val: system.resources.version },
    { key: "Environment", val: environment.charAt(0).toUpperCase() + environment.slice(1) },
    { key: "Server Time", val: formatServerTime(clock.toISOString()) },
    { key: "Uptime", val: formatUptime(system.resources.uptimeSeconds) },
    {
      key: "Database",
      val: (
        <span className={`db-status${db && db.ok ? "" : " down"}`}>
          <span className="dot"></span>
          {db && db.ok ? "Connected" : "Unreachable"}
        </span>
      ),
    },
    {
      key: "Storage Usage",
      val: (
        <span className="row-with-bar">
          <span className="sys-val">
            {formatBytes(system.storage.usedBytes)} / {formatBytes(system.storage.totalBytes)}
          </span>
          <span className="mini-bar">
            <span className="purple" style={{ width: shown ? `${storagePct}%` : "0%" }}></span>
          </span>
          <span className="mini-bar-pct">{storagePct}%</span>
        </span>
      ),
    },
    {
      key: "CPU Usage",
      val: (
        <span className="row-with-bar">
          <span className="sys-val">{cpuPct}%</span>
          <span className="mini-bar">
            <span className="blue" style={{ width: shown ? `${cpuPct}%` : "0%" }}></span>
          </span>
          <span className="mini-bar-pct"></span>
        </span>
      ),
    },
    {
      key: "Memory Usage",
      val: (
        <span className="row-with-bar">
          <span className="sys-val">
            {formatBytes(system.resources.memoryUsedBytes)} / {formatBytes(system.resources.memoryTotalBytes)}
          </span>
          <span className="mini-bar">
            <span className="green" style={{ width: shown ? `${memPct}%` : "0%" }}></span>
          </span>
          <span className="mini-bar-pct">{memPct}%</span>
        </span>
      ),
    },
  ];

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title-wrap">
          <span className="panel-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: DATABASE_ICON }} />
          </span>
          <div className="panel-title-block">
            <span className="panel-title">System Information</span>
            <span className="panel-sub">Details about your installation.</span>
          </div>
        </div>
      </div>

      <div className="sys-info-rows">
        {rows.map((row) => (
          <div className="sys-row" key={row.key}>
            <span className="sys-key">{row.key}</span>
            <span className="sys-val">{row.val}</span>
          </div>
        ))}
      </div>

      <button
        className="btn-detailed"
        type="button"
        onClick={() => onNavigate?.("Sandbox Manager")}
      >
        View Detailed Stats
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: CHEVRON_ICON }} />
      </button>
    </div>
  );
}