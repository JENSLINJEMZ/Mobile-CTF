import { Difficulty, type ChallengeSummaryDto } from "@ctf/shared";
import { useState } from "react";

import { DIFF_LABEL } from "./format";

export interface ChallengeAdminPayload {
  title: string;
  slug: string;
  description: string;
  categoryId: number;
  difficulty: Difficulty;
  basePoints: number;
  published: boolean;
  flag?: string;
}

export type EditingChallenge = ChallengeSummaryDto & { description?: string };

const DIFFS: Difficulty[] = [
  Difficulty.EASY,
  Difficulty.MEDIUM,
  Difficulty.HARD,
  Difficulty.EXPERT,
];

export function ChallengeModal({
  open,
  editing,
  categories,
  busy,
  error,
  onClose,
  onSave,
}: {
  open: boolean;
  editing: EditingChallenge | null;
  categories: { id: number; name: string }[];
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSave: (p: ChallengeAdminPayload) => void;
}) {
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.EASY);
  const [basePoints, setBasePoints] = useState("100");
  const [flag, setFlag] = useState("");
  const [published, setPublished] = useState(true);

  const [initKey, setInitKey] = useState<number>(0);

  if (editing && initKey !== editing.id) {
    setInitKey(editing.id);
    setTitle(editing.title);
    setSlug(editing.slug);
    setDescription(editing.description ?? "");
    setCategoryId(editing.category.id);
    setDifficulty(editing.difficulty);
    setBasePoints(String(editing.basePoints));
    setFlag("");
    setPublished(editing.published);
  } else if (!editing && initKey !== -1) {
    setInitKey(-1);
    setTitle("");
    setSlug("");
    setDescription("");
    setCategoryId(categories[0]?.id ?? 0);
    setDifficulty(Difficulty.EASY);
    setBasePoints("100");
    setFlag("");
    setPublished(true);
  }

  if (!open) return null;

  const canSave =
    !busy &&
    title.trim().length > 0 &&
    slug.trim().length > 0 &&
    categoryId > 0 &&
    Number(basePoints) >= 0;

  const submit = () => {
    if (!canSave) return;
    onSave({
      title: title.trim(),
      slug: slug.trim(),
      description: description.trim(),
      categoryId,
      difficulty,
      basePoints: Number(basePoints) || 0,
      published,
      ...(flag.trim() ? { flag: flag.trim() } : {}),
    });
  };

  return (
    <div className="chx-overlay" onClick={busy ? undefined : onClose}>
      <div
        className="chx-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="chx-modal-head">
          <div>
            <div className="chx-modal-title">
              {editing ? `Edit Challenge #${editing.id}` : "New Challenge"}
            </div>
            <div className="chx-modal-sub">
              {editing
                ? `Editing "${editing.title}" — saves a new version.`
                : "Fill in the challenge details to publish it to players."}
            </div>
          </div>
          <button className="chx-modal-close" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="chx-modal-body">
          <div className="chx-field chx-span">
            <label>Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. SQL Injection"
              autoFocus
            />
          </div>
          <div className="chx-field chx-span">
            <label>Slug (URL identifier)</label>
            <input
              value={slug}
              onChange={(e) =>
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, "-"))
              }
              placeholder="url-slug"
            />
          </div>
          <div className="chx-field chx-span">
            <label>Description (Markdown)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Describe the challenge, hints and goal for players…"
            />
          </div>
          <div className="chx-field">
            <label>Category</label>
            <select value={categoryId} onChange={(e) => setCategoryId(Number(e.target.value))}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="chx-field">
            <label>Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            >
              {DIFFS.map((d) => (
                <option key={d} value={d}>
                  {DIFF_LABEL[d]}
                </option>
              ))}
            </select>
          </div>
          <div className="chx-field">
            <label>Base points</label>
            <input
              value={basePoints}
              onChange={(e) => setBasePoints(e.target.value.replace(/[^0-9]/g, ""))}
              inputMode="numeric"
              placeholder="100"
            />
          </div>
          <div className="chx-field">
            <label>{editing ? "Flag (blank keeps current)" : "Flag (required)"}</label>
            <input
              value={flag}
              onChange={(e) => setFlag(e.target.value)}
              placeholder={editing ? "Leave blank to keep" : "CTF{…}"}
              autoComplete="off"
            />
          </div>
          <label className="chx-check chx-span">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            Published — visible to players right away
          </label>
        </div>

        <div className="chx-modal-foot">
          {error ? <div className="chx-modal-error">{error}</div> : <div />}
          <div className="chx-modal-actions">
            <button
              className="btn btn-secondary"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={submit}
              disabled={!canSave}
            >
              {busy ? "Saving…" : editing ? "Save" : "Create Challenge"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}