import type {
  PlatformSettingsDto,
  PlatformSettingsUpdatePayload,
} from "@ctf/shared";
import { useState } from "react";

import { CHECK_ICON, GEAR_ICON, INFO_ICON } from "./icons";

const TIMEZONES = [
  "Asia/Calcutta (IST)",
  "Asia/Kolkata (IST)",
  "America/New_York (EST)",
  "Europe/London (GMT)",
  "Asia/Tokyo (JST)",
];

const LANGUAGES = ["English", "Spanish", "French", "German", "Hindi"];

const DATE_FORMATS = [
  "September 17, 2026",
  "17 September 2026",
  "2026-09-17",
  "09/17/2026",
];

const TIME_FORMATS = ["12 Hour (AM/PM)", "24 Hour"];

type BoolKey =
  | "registrationEnabled"
  | "requireEmailVerification"
  | "allowGuestAccess"
  | "maintenanceMode";

export function SystemSettingsPanel({
  settings,
  onSave,
}: {
  settings: PlatformSettingsDto;
  onSave: (patch: PlatformSettingsUpdatePayload) => Promise<void>;
}) {
  const [draft, setDraft] = useState({
    timezone: settings.timezone,
    language: settings.language,
    dateFormat: settings.dateFormat,
    timeFormat: settings.timeFormat,
    registrationEnabled: settings.registrationEnabled,
    requireEmailVerification: settings.requireEmailVerification,
    allowGuestAccess: settings.allowGuestAccess,
    maintenanceMode: settings.maintenanceMode,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const dirty =
    draft.timezone !== settings.timezone ||
    draft.language !== settings.language ||
    draft.dateFormat !== settings.dateFormat ||
    draft.timeFormat !== settings.timeFormat ||
    draft.registrationEnabled !== settings.registrationEnabled ||
    draft.requireEmailVerification !== settings.requireEmailVerification ||
    draft.allowGuestAccess !== settings.allowGuestAccess ||
    draft.maintenanceMode !== settings.maintenanceMode;

  const setSelect = (field: "timezone" | "language" | "dateFormat" | "timeFormat", value: string) =>
    setDraft((prev) => ({ ...prev, [field]: value }));

  const toggle = (field: BoolKey) =>
    setDraft((prev) => ({ ...prev, [field]: !prev[field] }));

  const save = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    setSaved(false);
    try {
      await onSave(draft);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="panel">
      <div className="panel-head">
        <div className="panel-title-wrap">
          <span className="panel-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: GEAR_ICON }} />
          </span>
          <div className="panel-title-block">
            <span className="panel-title">System Settings</span>
            <span className="panel-sub">Core platform behavior and preferences.</span>
          </div>
        </div>
      </div>

      <div className="form-row">
        <div className="row-label">Default Timezone</div>
        <div className="row-content">
          <select className="select-field" value={draft.timezone} onChange={(e) => setSelect("timezone", e.target.value)}>
            {TIMEZONES.map((tz) => (
              <option key={tz}>{tz}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="row-label">Platform Language</div>
        <div className="row-content">
          <select className="select-field" value={draft.language} onChange={(e) => setSelect("language", e.target.value)}>
            {LANGUAGES.map((lang) => (
              <option key={lang}>{lang}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="row-label">Date Format</div>
        <div className="row-content">
          <select className="select-field" value={draft.dateFormat} onChange={(e) => setSelect("dateFormat", e.target.value)}>
            {DATE_FORMATS.map((fmt) => (
              <option key={fmt}>{fmt}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="row-label">Time Format</div>
        <div className="row-content">
          <select className="select-field" value={draft.timeFormat} onChange={(e) => setSelect("timeFormat", e.target.value)}>
            {TIME_FORMATS.map((fmt) => (
              <option key={fmt}>{fmt}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-row">
        <div className="row-label">Enable Registration</div>
        <div className="row-content toggle-cell">
          <button type="button" className={`switch${draft.registrationEnabled ? " is-on" : ""}`} onClick={() => toggle("registrationEnabled")} aria-label="Toggle Enable Registration" />
        </div>
      </div>

      <div className="form-row">
        <div className="row-label">Require Email Verification</div>
        <div className="row-content toggle-cell">
          <button type="button" className={`switch${draft.requireEmailVerification ? " is-on" : ""}`} onClick={() => toggle("requireEmailVerification")} aria-label="Toggle Require Email Verification" />
        </div>
      </div>

      <div className="form-row">
        <div className="row-label">Allow Guest Access</div>
        <div className="row-content toggle-cell">
          <button type="button" className={`switch${draft.allowGuestAccess ? " is-on" : ""}`} onClick={() => toggle("allowGuestAccess")} aria-label="Toggle Allow Guest Access" />
        </div>
      </div>

      <div className="form-row">
        <div className="row-label">
          Maintenance Mode
          <svg className="info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: INFO_ICON }} />
        </div>
        <div className="row-content toggle-cell">
          <button type="button" className={`switch${draft.maintenanceMode ? " is-on" : ""}`} onClick={() => toggle("maintenanceMode")} aria-label="Toggle Maintenance Mode" />
        </div>
      </div>

      <div className="form-actions">
        <button className="btn-primary" type="button" onClick={() => void save()} disabled={!dirty || saving}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: CHECK_ICON }} />
          {saving ? "Saving…" : saved ? "Saved" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}