import type {
  PlatformSettingsDto,
  PlatformSettingsUpdatePayload,
} from "@ctf/shared";
import { useState } from "react";

import { CHECK_ICON, HOME_ICON, LogoMark } from "./icons";

export function PlatformInfoPanel({
  settings,
  onSave,
}: {
  settings: PlatformSettingsDto;
  onSave: (patch: PlatformSettingsUpdatePayload) => Promise<void>;
}) {
  const [draft, setDraft] = useState({
    name: settings.name,
    tagline: settings.tagline,
    description: settings.description,
    websiteUrl: settings.websiteUrl,
    supportEmail: settings.supportEmail,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const dirty =
    draft.name !== settings.name ||
    draft.tagline !== settings.tagline ||
    draft.description !== settings.description ||
    draft.websiteUrl !== settings.websiteUrl ||
    draft.supportEmail !== settings.supportEmail;

  const set = (field: keyof typeof draft, value: string) =>
    setDraft((prev) => ({ ...prev, [field]: value }));

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
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" dangerouslySetInnerHTML={{ __html: HOME_ICON }} />
          </span>
          <div className="panel-title-block">
            <span className="panel-title">Platform Information</span>
            <span className="panel-sub">Basic details about your CTF platform.</span>
          </div>
        </div>
      </div>

      <div className="form-row">
        <div className="row-label">Platform Name</div>
        <div className="row-content">
          <input className="field" type="text" value={draft.name} onChange={(e) => set("name", e.target.value)} />
        </div>
      </div>

      <div className="form-row">
        <div className="row-label">Tagline</div>
        <div className="row-content">
          <input className="field" type="text" value={draft.tagline} onChange={(e) => set("tagline", e.target.value)} />
        </div>
      </div>

      <div className="form-row">
        <div className="row-label">Description</div>
        <div className="row-content">
          <textarea className="field" value={draft.description} onChange={(e) => set("description", e.target.value)} />
        </div>
      </div>

      <div className="form-row">
        <div className="row-label">Website URL</div>
        <div className="row-content">
          <input className="field" type="text" placeholder="https://" value={draft.websiteUrl} onChange={(e) => set("websiteUrl", e.target.value)} />
        </div>
      </div>

      <div className="form-row">
        <div className="row-label">Support Email</div>
        <div className="row-content">
          <input className="field" type="text" placeholder="support@example.com" value={draft.supportEmail} onChange={(e) => set("supportEmail", e.target.value)} />
        </div>
      </div>

      <div className="form-row">
        <div className="row-label">Logo</div>
        <div className="row-content">
          <div className="logo-row">
            <span className="logo-preview">
              <LogoMark />
            </span>
            <div>
              <button className="btn-ghost" type="button" disabled aria-disabled title="Logo upload is not wired in this build">
                Change Logo
              </button>
              <div className="field-help">PNG, JPG (max 2MB) — upload not wired yet</div>
            </div>
          </div>
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