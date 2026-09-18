import type { ChallengeSummaryDto } from "@ctf/shared";

import { DIFF_CLASS, DIFF_LABEL, fmtWhen, toneFor } from "./format";

export interface TableHandlers {
  onEdit: (c: ChallengeSummaryDto) => void;
  onDuplicate: (c: ChallengeSummaryDto) => void;
  onDelete: (c: ChallengeSummaryDto) => void;
  onToggle: (c: ChallengeSummaryDto) => void;
  busy: Set<number>;
}

function ChallengeCell({ c }: { c: ChallengeSummaryDto }) {
  const tone = toneFor(c.category.slug);
  return (
    <div className="cell-challenge">
      <span
        className="chx-icon"
        style={
          {
            "--icon-bg": tone.bg,
            "--icon-line": tone.line,
            "--icon-color": tone.color,
            "--icon-glow": tone.glow,
          } as React.CSSProperties
        }
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          dangerouslySetInnerHTML={{ __html: tone.glyph }}
        />
      </span>
      <span className="ch-body">
        <span className="ch-name">{c.title}</span>
        <span className="ch-slug">{c.slug}</span>
      </span>
    </div>
  );
}

const TAG_CLASS: Record<string, string> = {
  web: "blue",
  crypto: "purple",
  forensics: "orange",
  reversing: "cyan",
  osint: "pink",
  misc: "gray",
};

function tagCls(slug: string): string {
  return TAG_CLASS[slug] ?? "gray";
}

function TagChip({ name, slug }: { name: string; slug: string }) {
  return <span className={`tag ${tagCls(slug)}`}>{name}</span>;
}

export function ChallengesTable({
  rows,
  start,
  onEdit,
  onDuplicate,
  onDelete,
  onToggle,
  busy,
}: TableHandlers & { rows: ChallengeSummaryDto[]; start: number }) {
  return (
    <div className="table-wrap" id="chxTable">
      <div className="table-scroll">
        <table className="ch-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Challenge</th>
              <th>Category</th>
              <th>Difficulty</th>
              <th>Points</th>
              <th>Solves</th>
              <th>Status</th>
              <th>Last Updated</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="empty-cell">
                  No challenges match your filters.
                </td>
              </tr>
            ) : (
              rows.map((c, i) => {
                const when = fmtWhen(c.updatedAt);
                const working = busy.has(c.id);
                return (
                  <tr key={c.id}>
                    <td className="cell-num">{String(start + i).padStart(2, "0")}</td>
                    <td>
                      <ChallengeCell c={c} />
                    </td>
                    <td>
                      <div className="cell-tags">
                        <TagChip name={c.category.name} slug={c.category.slug} />
                        {c.tags.slice(0, 2).map((t) => (
                          <TagChip key={t.id} name={t.name} slug={t.slug} />
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className={`diff ${DIFF_CLASS[c.difficulty]}`}>
                        {DIFF_LABEL[c.difficulty]}
                      </span>
                    </td>
                    <td>
                      <span className="cell-num-val">
                        {c.basePoints.toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <span className="cell-num-val muted">
                        {c.solvedCount.toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <div className="status-cell">
                        <button
                          className={`toggle${c.published ? " is-on" : ""}`}
                          aria-label="Toggle status"
                          onClick={() => onToggle(c)}
                          disabled={working}
                        />
                        <span
                          className={`status-text${c.published ? " published" : " draft"}`}
                        >
                          {c.published ? "Published" : "Draft"}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="cell-date">
                        <span className="d">{when.d}</span>
                        <span>{when.t}</span>
                      </div>
                    </td>
                    <td>
                      <div className="cell-actions">
                        <button
                          className="action-icon edit"
                          aria-label="Edit"
                          title="Edit"
                          onClick={() => onEdit(c)}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
                          </svg>
                        </button>
                        <button
                          className="action-icon copy"
                          aria-label="Duplicate"
                          title="Duplicate"
                          onClick={() => onDuplicate(c)}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="8" y="8" width="12" height="12" rx="2.5" />
                            <path d="M16 8V5.5A2.5 2.5 0 0 0 13.5 3h-8A2.5 2.5 0 0 0 3 5.5v8A2.5 2.5 0 0 0 5.5 16H8" />
                          </svg>
                        </button>
                        <button
                          className="action-icon del"
                          aria-label="Delete"
                          title="Delete"
                          onClick={() => onDelete(c)}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}