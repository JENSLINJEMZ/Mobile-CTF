import type { PlatformSettingsDto } from "@ctf/shared";
import { useState } from "react";

import {
  BELL_ICON,
  CHEVRON_ICON,
  DATABASE_ICON,
  DOWNLOAD_ICON,
  FILE_ICON,
  RESTART_ICON,
  TRASH_ICON,
} from "./icons";

export function QuickActions({
  settings,
  onNavigate,
}: {
  settings: PlatformSettingsDto;
  onNavigate?: (view: string) => void;
}) {
  const [exported, setExported] = useState(false);

  const exportConfig = () => {
    const blob = new Blob([JSON.stringify(settings, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mobile-ctf-settings.json";
    a.click();
    URL.revokeObjectURL(url);
    setExported(true);
    window.setTimeout(() => setExported(false), 2000);
  };

  const rows: Array<{
    key: string;
    icon: string;
    text: string;
    action?: () => void;
    note?: string;
  }> = [
    { key: "cache", icon: TRASH_ICON, text: "Clear Cache", note: "not wired" },
    { key: "restart", icon: RESTART_ICON, text: "Restart Services", note: "not wired" },
    { key: "backup", icon: DATABASE_ICON, text: "Backup Now", note: "not wired" },
    { key: "export", icon: DOWNLOAD_ICON, text: exported ? "Exported now" : "Export Configuration", action: exportConfig },
    {
      key: "audit",
      icon: FILE_ICON,
      text: "View Audit Log",
      action: onNavigate ? () => onNavigate("Audit Log") : undefined,
    },
  ];

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title-wrap">
          <span className="panel-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: BELL_ICON }} />
          </span>
          <div className="panel-title-block">
            <span className="panel-title">Quick Actions</span>
          </div>
        </div>
      </div>

      <div className="quick-list">
        {rows.map((row) => {
          const enabled = row.action !== undefined;
          return (
            <div
              key={row.key}
              className={`quick-row${enabled ? "" : " is-muted"}`}
              role={enabled ? "button" : undefined}
              tabIndex={enabled ? 0 : undefined}
              title={enabled ? undefined : row.note}
              onClick={() => row.action?.()}
              onKeyDown={(e) => {
                if (enabled && e.key === "Enter") row.action?.();
              }}
            >
              <span className="quick-ic">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: row.icon }} />
              </span>
              <span className="quick-text">{row.text}</span>
              {!enabled ? <span className="quick-note">{row.note}</span> : null}
              <svg className="quick-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: CHEVRON_ICON }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}