import type { TeamAdminDto } from "@ctf/shared";
import { useEffect, useState } from "react";

import { SVG, TeamBadge, X } from "./TeamIcons";

export interface TeamModalSubmit {
  name: string;
  description?: string;
}

export function TeamModal({
  open,
  team,
  saving,
  error,
  onSubmit,
  onClose,
}: {
  open: boolean;
  team: TeamAdminDto | null;
  saving: boolean;
  error: string | null;
  onSubmit: (input: TeamModalSubmit) => void;
  onClose: () => void;
}) {
  const isCreate = team === null;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fieldErr, setFieldErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFieldErr(null);
    if (team) {
      setName(team.name);
      setDescription(team.description ?? "");
    } else {
      setName("");
      setDescription("");
    }
  }, [open, team]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submit = () => {
    const n = name.trim();
    if (n.length < 3 || n.length > 60) {
      setFieldErr("Team name must be 3–60 characters.");
      return;
    }
    const d = description.trim();
    if (d.length > 400) {
      setFieldErr("Tagline must be under 400 characters.");
      return;
    }
    setFieldErr(null);
    onSubmit({ name: n, description: d.length > 0 ? d : undefined });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={isCreate ? "Create Team" : `Edit ${team.name}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h3 className="modal-title">
            {isCreate ? "Create Team" : `Edit ${team.name}`}
          </h3>
          <button className="modal-close" aria-label="Close" onClick={onClose}>
            <SVG d={X} />
          </button>
        </div>

        <div className="modal-body">
          {!isCreate ? (
            <div className="tm-modal-team">
              <span className="tm-modal-badge">
                <TeamBadge name={team.name} seed={team.id} />
              </span>
              <div className="tm-modal-team-meta">
                <span className="tm-modal-team-name">{team.name}</span>
                <span className="tm-modal-team-id">
                  @{team.slug} · #{String(team.id).padStart(3, "0")}
                </span>
              </div>
            </div>
          ) : null}

          <div className="tm-form">
            <label className="tm-field">
              <span>Team name</span>
              <input
                type="text"
                value={name}
                maxLength={60}
                placeholder="e.g. NullPwn Collective"
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="tm-field">
              <span>
                Tagline
                <small>{description.length}/400</small>
              </span>
              <textarea
                rows={4}
                value={description}
                maxLength={400}
                placeholder="What drives your team?"
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
          </div>

          {fieldErr ? <div className="tm-form-error">{fieldErr}</div> : null}
          {error ? <div className="tm-form-error">{error}</div> : null}
        </div>

        <div className="modal-foot">
          <button className="btn btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>
            {saving
              ? "Saving…"
              : isCreate
                ? "Create Team"
                : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}