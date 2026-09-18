import type { ChallengeCategoryDto, ChallengeSummaryDto } from "@ctf/shared";

import { toneFor } from "./format";

const DOT_COLORS: Record<string, string> = {
  web: "#3b82f6",
  crypto: "#f59e0b",
  forensics: "#f97316",
  reversing: "#22d3ee",
  osint: "#a78bfa",
  misc: "#ec4899",
};

export function CategoriesPanel({
  categories,
  challenges,
  activeSlug,
  onPick,
}: {
  categories: ChallengeCategoryDto[];
  challenges: ChallengeSummaryDto[];
  activeSlug: string | null;
  onPick: (slug: string | null) => void;
}) {
  const counts = new Map<string, number>();
  for (const c of challenges) {
    counts.set(c.category.slug, (counts.get(c.category.slug) ?? 0) + 1);
  }
  const total = challenges.length || 1;
  const ordered = [...categories].sort((a, b) => (b.sortOrder ?? 0) - (a.sortOrder ?? 0));
  const C = 2 * Math.PI * 40;

  let acc = 0;
  const segs = ordered.map((cat) => {
    const n = counts.get(cat.slug) ?? 0;
    const frac = n / total;
    const dash = frac * C;
    const el = { cat, n, frac, dash, offset: -acc };
    acc += dash;
    return el;
  });

  const shown = segs.filter((s) => s.n > 0).slice(0, 6);

  return (
    <div className="panel chx-panel">
      <div className="panel-head">
        <span className="panel-title">Challenge Categories</span>
      </div>
      <div className="chx-panel-body">
        <div className="cat-list">
          {ordered.map((cat) => {
            const n = counts.get(cat.slug) ?? 0;
            const active = activeSlug === cat.slug;
            return (
              <div
                key={cat.id}
                className={`cat-item${active ? " is-active" : ""}`}
                onClick={() => onPick(active ? null : cat.slug)}
              >
                <span
                  className="cat-dot"
                  style={{
                    background: DOT_COLORS[cat.slug] ?? toneFor(cat.slug).color,
                    boxShadow: active
                      ? `0 0 8px ${DOT_COLORS[cat.slug] ?? toneFor(cat.slug).color}`
                      : undefined,
                  }}
                />
                <span className="cat-name">{cat.name}</span>
                {n > 0 ? <span className="cat-n">{n}</span> : null}
              </div>
            );
          })}
        </div>

        <div className="donut-wrap">
          <div className="donut">
            <svg viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="none" stroke="#1a1a30" strokeWidth="14" />
              {shown.map((s) => (
                <circle
                  key={s.cat.id}
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke={DOT_COLORS[s.cat.slug] ?? toneFor(s.cat.slug).color}
                  strokeWidth="14"
                  strokeDasharray={`${s.dash} ${C}`}
                  strokeDashoffset={s.offset}
                />
              ))}
            </svg>
            <div className="donut-center">
              <span className="donut-value">{total}</span>
              <span className="donut-label">Total</span>
            </div>
          </div>
          <div className="donut-legend">
            {shown.map((s) => (
              <div key={s.cat.id} className="legend-row">
                <span
                  className="swatch"
                  style={{
                    background: DOT_COLORS[s.cat.slug] ?? toneFor(s.cat.slug).color,
                  }}
                />
                <span className="n">{s.cat.name.split(" ")[0]}</span>
                <span className="p">{Math.round(s.frac * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}