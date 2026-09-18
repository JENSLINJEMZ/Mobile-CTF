import type { ChallengeSummaryDto } from "@ctf/shared";

import { DIFF_CLASS, DIFF_LABEL, fmtWhen, toneFor } from "./format";

export function ChallengesGrid({
  rows,
  onEdit,
  onToggle,
}: {
  rows: ChallengeSummaryDto[];
  onEdit: (c: ChallengeSummaryDto) => void;
  onToggle: (c: ChallengeSummaryDto) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="table-wrap">
        <div className="chx-grid-empty">No challenges match your filters.</div>
      </div>
    );
  }
  return (
    <div className="chx-grid">
      {rows.map((c) => {
        const tone = toneFor(c.category.slug);
        const when = fmtWhen(c.updatedAt);
        return (
          <div
            key={c.id}
            className={`chx-card${c.published ? "" : " draft"}`}
            onClick={() => onEdit(c)}
          >
            <div className="chx-card-top">
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
              <span className={`diff ${DIFF_CLASS[c.difficulty]}`}>
                {DIFF_LABEL[c.difficulty]}
              </span>
            </div>
            <div className="chx-card-name">{c.title}</div>
            <div className="chx-card-slug">
              {c.category.name} · {c.slug}
            </div>
            <div className="cell-tags" style={{ marginTop: 8 }}>
              {c.tags.slice(0, 3).map((t) => (
                <span key={t.id} className="tag gray">
                  {t.name}
                </span>
              ))}
            </div>
            <div className="chx-card-foot">
              <div className="chx-card-nums">
                <div>
                  <b className="cell-num-val">{c.basePoints.toLocaleString()}</b>
                  <span className="chx-num-label">pts</span>
                </div>
                <div>
                  <b className="cell-num-val muted">{c.solvedCount.toLocaleString()}</b>
                  <span className="chx-num-label">solves</span>
                </div>
              </div>
              <button
                className={`toggle${c.published ? " is-on" : ""}`}
                aria-label="Toggle status"
                title={c.published ? "Unpublish" : "Publish"}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggle(c);
                }}
              />
            </div>
            <div className="chx-card-date">
              Updated {when.d} · {when.t}
            </div>
          </div>
        );
      })}
    </div>
  );
}