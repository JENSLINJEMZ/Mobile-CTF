import type { PlatformSettingsDto } from "@ctf/shared";
import { useEffect, useState } from "react";

import { CHEVRON_ICON, CHECK_ICON } from "./icons";

export function ProgressPanel({
  settings,
}: {
  settings: PlatformSettingsDto;
}) {
  const [shown, setShown] = useState(false);

  const items = [
    {
      label: "Platform Information",
      on:
        settings.name.trim().length > 0 &&
        settings.tagline.trim().length > 0 &&
        settings.description.trim().length > 0,
      note: null,
    },
    {
      label: "Security Settings",
      on: !settings.maintenanceMode && !settings.allowGuestAccess,
      note: null,
    },
    {
      label: "Payment Configuration",
      on: false,
      note: "no payments module",
    },
    {
      label: "Email & Notifications",
      on: settings.supportEmail.trim().length > 0,
      note: "mail not configured",
    },
    { label: "Customize Appearance", on: false, note: "no theming module" },
    { label: "Integrate Services", on: false, note: "no integrations" },
    { label: "Advanced Configuration", on: false, note: "no advanced module" },
  ];

  const done = items.filter((i) => i.on).length;
  const pct = Math.round((done / items.length) * 100);

  useEffect(() => {
    const raf = requestAnimationFrame(() =>
      window.setTimeout(() => setShown(true), 260),
    );
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title-wrap">
          <div className="panel-title-block">
            <span className="panel-title">Configuration Progress</span>
            <span className="panel-sub">
              Completed checklist items out of what this build supports.
            </span>
          </div>
        </div>
      </div>

      <div className="progress-wrap">
        <div className="progress-top">
          <span className="progress-label">Overall Progress</span>
          <span className="progress-pct">{pct}%</span>
        </div>
        <div className="progress-bar">
          <span
            className="progress-fill"
            style={{ width: shown ? `${pct}%` : "0%" }}
          />
        </div>
      </div>

      <div className="checklist">
        {items.map((item) => (
          <div className="check-row" key={item.label}>
            <span className={`check-box${item.on ? "" : " off"}`}>
              {item.on ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: CHECK_ICON }} />
              ) : null}
            </span>
            {item.label}
            {item.note ? (
              <span className="check-note">· {item.note}</span>
            ) : null}
          </div>
        ))}
      </div>

      <button className="btn-guide" type="button" disabled aria-disabled title="Setup guide not wired in this build">
        View Setup Guide
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: CHEVRON_ICON }} />
      </button>
    </div>
  );
}