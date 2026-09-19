import type { AnnouncementAdminRowDto } from "@ctf/shared";
import { useEffect, useRef, useState } from "react";

import { mdPreview } from "./format";
import {
  BOLD,
  HEADING,
  IMAGE,
  ITALIC_S,
  LINK,
  LIST,
  QUOTE,
  SEND,
  STRIKE,
} from "./icons";
import { CODE, SVG } from "../teams/TeamIcons";

export interface AnnouncementDraft {
  title: string;
  body: string;
  pinned: boolean;
}

export function AnnouncementForm({
  editing,
  value,
  busy,
  focusKey,
  onChange,
  onSubmit,
  onCancel,
  onReset,
}: {
  editing: AnnouncementAdminRowDto | null;
  value: AnnouncementDraft;
  busy: boolean;
  focusKey: number;
  onChange: (next: AnnouncementDraft) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onReset: () => void;
}) {
  const [tab, setTab] = useState<"write" | "preview">("write");
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTab("write");
    if (focusKey > 0) {
      window.requestAnimationFrame(() => titleRef.current?.focus());
    }
  }, [focusKey]);

  const replaceSelection = (before: string, after = "") => {
    const el = bodyRef.current;
    if (!el) return;
    const start = el.selectionStart ?? value.body.length;
    const end = el.selectionEnd ?? value.body.length;
    const selected = value.body.slice(start, end) || before;
    const next = `${value.body.slice(0, start)}${before}${selected}${after}${value.body.slice(end)}`;
    onChange({ ...value, body: next });
    window.requestAnimationFrame(() => {
      el.focus();
      const caret = start + before.length + selected.length + after.length;
      el.setSelectionRange(caret, caret);
    });
  };

  const insertBlock = (marker: string) => {
    const el = bodyRef.current;
    if (!el) return;
    const start = el.selectionStart ?? value.body.length;
    const prefix =
      start > 0 && value.body.charAt(start - 1) !== "\n" && value.body.charAt(start - 1) !== ""
        ? "\n"
        : "";
    const next = `${value.body.slice(0, start)}${prefix}${marker}\n${value.body.slice(start)}`;
    onChange({ ...value, body: next });
    window.requestAnimationFrame(() => {
      el.focus();
      const caret = start + prefix.length + marker.length + 1;
      el.setSelectionRange(caret, caret);
    });
  };

  const canPublish = value.title.trim().length > 0 && value.body.trim().length > 0;

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">{editing ? "Edit Announcement" : "Create Announcement"}</span>
      </div>

      <div className="an-form-sub-tabs">
        <button
          type="button"
          className={`an-form-tab${tab === "write" ? " is-active" : ""}`}
          onClick={() => setTab("write")}
        >
          Write
        </button>
        <button
          type="button"
          className={`an-form-tab${tab === "preview" ? " is-active" : ""}`}
          onClick={() => setTab("preview")}
        >
          Preview
        </button>
        <span className="an-markdown-hint">Markdown supported</span>
      </div>

      {tab === "preview" ? (
        <div className="an-preview">
          <div
            className="an-preview-content"
            dangerouslySetInnerHTML={{
              __html:
                value.body.trim().length > 0
                  ? mdPreview(value.body)
                  : "<p class='an-preview-empty'>Nothing to preview yet.</p>",
            }}
          />
        </div>
      ) : (
        <>
          <div className="an-form-row-2">
            <div className="an-form-field">
              <label className="an-form-label">
                Title <span className="req">*</span>
              </label>
              <input
                ref={titleRef}
                type="text"
                className="an-form-input"
                placeholder="Enter announcement title..."
                value={value.title}
                maxLength={160}
                onChange={(e) => onChange({ ...value, title: e.target.value })}
              />
            </div>
            <div className="an-form-field">
              <label className="an-form-label">Mode</label>
              <span className="an-form-mode">{editing ? "Editing update" : "New publish"}</span>
            </div>
          </div>

          <label className="an-check-row">
            <input
              type="checkbox"
              className="an-check-box"
              checked={value.pinned}
              onChange={(e) => onChange({ ...value, pinned: e.target.checked })}
            />
            <div className="an-check-body">
              <div className="an-check-title">Pin this announcement</div>
              <div className="an-check-desc">Pinned announcements appear on top</div>
            </div>
          </label>

          <div className="an-form-field">
            <label className="an-form-label">
              Content <span className="req">*</span>
            </label>
            <div className="an-md-toolbar">
              <button type="button" title="Bold" onClick={() => replaceSelection("**", "**")}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <g dangerouslySetInnerHTML={{ __html: BOLD }} />
                </svg>
              </button>
              <button type="button" title="Italic" onClick={() => replaceSelection("*", "*")}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <g dangerouslySetInnerHTML={{ __html: ITALIC_S }} />
                </svg>
              </button>
              <button type="button" title="Strikethrough" onClick={() => replaceSelection("~~", "~~")}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <g dangerouslySetInnerHTML={{ __html: STRIKE }} />
                </svg>
              </button>
              <span className="an-md-sep" />
              <button type="button" title="Heading" onClick={() => insertBlock("## Heading")}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <g dangerouslySetInnerHTML={{ __html: HEADING }} />
                </svg>
              </button>
              <button type="button" title="List" onClick={() => insertBlock("- item")}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <g dangerouslySetInnerHTML={{ __html: LIST }} />
                </svg>
              </button>
              <button type="button" title="Quote" onClick={() => insertBlock("> quote")}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <g dangerouslySetInnerHTML={{ __html: QUOTE }} />
                </svg>
              </button>
              <span className="an-md-sep" />
              <button type="button" title="Code" onClick={() => replaceSelection("`", "`")}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <g dangerouslySetInnerHTML={{ __html: CODE }} />
                </svg>
              </button>
              <button type="button" title="Link" onClick={() => replaceSelection("[", "](https://)")}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <g dangerouslySetInnerHTML={{ __html: LINK }} />
                </svg>
              </button>
              <button type="button" title="Image" onClick={() => replaceSelection("![", "](https://)")}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <g dangerouslySetInnerHTML={{ __html: IMAGE }} />
                </svg>
              </button>
            </div>
            <textarea
              ref={bodyRef}
              className="an-form-textarea with-toolbar"
              placeholder={"Write your announcement here...\nYou can use Markdown formatting."}
              value={value.body}
              maxLength={20000}
              onChange={(e) => onChange({ ...value, body: e.target.value })}
            />
          </div>

          <div className="an-form-actions">
            {editing ? (
              <button
                type="button"
                className="an-form-btn ghost"
                disabled={busy}
                onClick={onCancel}
              >
                Cancel
              </button>
            ) : (
<button
              type="button"
              className="an-form-btn ghost"
              disabled={busy}
              onClick={onReset}
            >
              Reset
            </button>
            )}
            <button
              type="button"
              className="an-form-btn primary"
              disabled={busy || !canPublish}
              onClick={onSubmit}
            >
              <SVG d={SEND} size={13} />
              {busy
                ? editing
                  ? "Saving…"
                  : "Publishing…"
                : editing
                  ? "Update Announcement"
                  : "Publish Announcement"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}