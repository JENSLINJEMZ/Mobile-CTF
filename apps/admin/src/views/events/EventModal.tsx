import { useState } from "react";
import { Button, Text } from "@ctf/ui";

export interface EventAdminPayload {
  title: string;
  slug: string;
  description: string;
  status: "DRAFT" | "SCHEDULED" | "RUNNING" | "ENDED";
  startsAt: string;
  endsAt: string;
}

function toLocalInput(value?: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

const STATUSES: EventAdminPayload["status"][] = [
  "DRAFT",
  "SCHEDULED",
  "RUNNING",
  "ENDED",
];

export function EventModal({
  open,
  editing,
  busy,
  error,
  onClose,
  onSave,
}: {
  open: boolean;
  editing: Omit<EventAdminPayload, "id"> | null;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (p: EventAdminPayload) => void;
}) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<EventAdminPayload["status"]>("SCHEDULED");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [initKey, setInitKey] = useState<number>(0);

  if (editing && initKey !== 1) {
    setInitKey(1);
    setTitle(editing.title);
    setSlug(editing.slug);
    setDescription(editing.description);
    setStatus(editing.status);
    setStartsAt(toLocalInput(editing.startsAt));
    setEndsAt(toLocalInput(editing.endsAt));
  } else if (!editing && initKey !== -1) {
    setInitKey(-1);
    setTitle("");
    setSlug("");
    setDescription("");
    setStatus("SCHEDULED");
    setStartsAt("");
    setEndsAt("");
  }

  if (!open) return null;

  const canSave =
    !busy &&
    title.trim().length > 0 &&
    slug.trim().length > 0 &&
    startsAt !== "" &&
    endsAt !== "";

  const submit = () => {
    if (!canSave) return;
    onSave({
      title: title.trim(),
      slug: slug.trim(),
      description,
      status,
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
    });
  };

  return (
    <div className="evt-modal-overlay" onClick={busy ? undefined : onClose}>
      <div
        className="evt-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="evt-modal-head">
          <h2>{editing ? "Edit Event" : "Create Event"}</h2>
          <button
            className="evt-modal-close"
            aria-label="Close"
            disabled={busy}
            onClick={onClose}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error ? <Text tone="danger" size="sm">{error}</Text> : null}

        <div className="evt-modal-body">
          <label className="evt-field">
            <span>Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="CTF Summer Sprint"
              disabled={busy}
            />
          </label>
          <label className="evt-field">
            <span>Slug</span>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="ctf-summer-sprint"
              disabled={busy}
            />
          </label>
          <label className="evt-field evt-span">
            <span>Description (Markdown)</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="What is this event about?"
              disabled={busy}
            />
          </label>
          <label className="evt-field">
            <span>Status</span>
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as EventAdminPayload["status"])
              }
              disabled={busy}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="evt-field">
            <span>Starts at (local)</span>
            <input
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              disabled={busy}
            />
          </label>
          <label className="evt-field">
            <span>Ends at (local)</span>
            <input
              type="datetime-local"
              value={endsAt}
              onChange={(e) => setEndsAt(e.target.value)}
              disabled={busy}
            />
          </label>
        </div>

        <div className="evt-modal-foot">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSave}>
            {editing ? "Save changes" : "Create event"}
          </Button>
        </div>
      </div>
    </div>
  );
}