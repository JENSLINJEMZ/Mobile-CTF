import { Difficulty, type ChallengeSummaryDto } from "@ctf/shared";

import { DIFF_LABEL } from "./format";

const G = (d: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

interface CardDef {
  key: string;
  tone: string;
  icon: string;
  label: string;
}

const CARDS: CardDef[] = [
  {
    key: "total",
    tone: "blue",
    icon: G(
      '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>',
    ),
    label: "Total Challenges",
  },
  {
    key: "published",
    tone: "green",
    icon: G(
      '<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.4 2.4L16 9.8"/>',
    ),
    label: "Published",
  },
  {
    key: "drafts",
    tone: "yellow",
    icon: G(
      '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    ),
    label: "Drafts",
  },
  {
    key: "categories",
    tone: "purple",
    icon: G(
      '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    ),
    label: "Categories",
  },
  {
    key: "solves",
    tone: "pink",
    icon: G(
      '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
    ),
    label: "Total Solves",
  },
  {
    key: "points",
    tone: "orange",
    icon: G(
      '<path d="M8 5h8v4.6a4 4 0 0 1-8 0z"/><path d="M8 6.2H5.6a1.8 1.8 0 0 0 .2 3.6H8M16 6.2h2.4a1.8 1.8 0 0 1-.2 3.6H16"/><path d="M12 13.6v-3M9.4 18.5h5.2M10.4 15.6h3.2"/>',
    ),
    label: "Total Points",
  },
];

function barsPath(
  values: number[],
  width: number,
  height: number,
): { rects: Array<{ x: number; y: number; w: number; h: number }>; max: number } {
  if (values.length === 0) return { rects: [], max: 0 };
  const max = Math.max(...values, 0.0001);
  const n = values.length;
  const step = width / n;
  const bw = Math.max(3, Math.min(7, step * 0.55));
  const inner = height - 4;
  const rects = values.map((v, i) => {
    const h = Math.max(3, (v / max) * (inner - 3));
    const x = i * step + (step - bw) / 2;
    const y = height - h - 2;
    return { x, y, w: bw, h };
  });
  return { rects, max };
}

function Bars({
  id,
  values,
  color,
  segmentColors,
}: {
  id: string;
  values: number[];
  color: string;
  segmentColors?: string[];
}) {
  if (segmentColors) {
    const total = Math.max(values.reduce((a, b) => a + b, 0), 0.0001);
    let acc = 0;
    return (
      <svg
        viewBox="0 0 76 26"
        preserveAspectRatio="none"
        style={{ width: "100%", height: "100%" }}
      >
        {values.map((v, i) => {
          const x = (acc / total) * 76;
          acc += v;
          const w = (v / total) * 76;
          if (w <= 0) return null;
          const width = i === values.length - 1 ? w : w - 1;
          return (
            <rect
              key={i}
              x={x}
              y={5}
              width={width}
              height={16}
              rx={1.5}
              fill={segmentColors[i] ?? color}
            />
          );
        })}
      </svg>
    );
  }
  const { rects } = barsPath(values, 76, 26);
  const grad = `kbg-${id}`;
  return (
    <svg
      viewBox="0 0 76 26"
      preserveAspectRatio="none"
      style={{ width: "100%", height: "100%" }}
    >
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.95" />
          <stop offset="1" stopColor={color} stopOpacity="0.4" />
        </linearGradient>
      </defs>
      {rects.map((r, i) => (
        <rect
          key={i}
          x={r.x}
          y={r.y}
          width={r.w}
          height={r.h}
          rx={1.6}
          fill={`url(#${grad})`}
        />
      ))}
    </svg>
  );
}

export interface KpiValues {
  total: number;
  published: number;
  drafts: number;
  categories: number;
  solves: number;
  points: number;
}

function pct(part: number, whole: number): string {
  if (whole <= 0) return "0%";
  return `${Math.round((part / whole) * 100)}%`;
}

export function KpiCards({
  v,
  challenges,
  categories,
}: {
  v: KpiValues;
  challenges: ChallengeSummaryDto[];
  categories: ChallengeSummaryDto["category"][];
}) {
  const scroll = () =>
    document.getElementById("chxTable")?.scrollIntoView({ behavior: "smooth" });

  const dotColors = ["#8b5cf6", "#22d3ee", "#6366f1", "#ec4899", "#f5a524", "#22c55e"];

  const byCat = (pred: (c: ChallengeSummaryDto) => boolean) =>
    categories.map((c) => challenges.filter((x) => pred(x) && x.category.slug === c.slug).length);

  const catCounts = byCat(() => true);
  const pubCounts = byCat((c) => c.published);
  const draftCounts = byCat((c) => !c.published);

  const diffSolves = (Object.values(Difficulty) as Difficulty[]).map(
    (d) => challenges.filter((c) => c.difficulty === d).reduce((a, c) => a + c.solvedCount, 0),
  );
  const diffPoints = (Object.values(Difficulty) as Difficulty[]).map(
    (d) => challenges.filter((c) => c.difficulty === d).reduce((a, c) => a + c.basePoints, 0),
  );

  const GRAPH: Record<string, { values: number[]; colors?: string[]; delta: string }> = {
    total: {
      values: catCounts,
      delta: `${v.published} pub · ${v.drafts} draft`,
    },
    published: {
      values: pubCounts,
      delta: `${pct(v.published, v.total)} of total`,
    },
    drafts: {
      values: draftCounts,
      delta: `${pct(v.drafts, v.total)} of total`,
    },
    categories: {
      values: catCounts,
      colors: categories.map((_, i) => dotColors[i % dotColors.length] ?? "#8b5cf6"),
      delta: `${categories.length} active`,
    },
    solves: {
      values: diffSolves,
      delta:
        v.total > 0
          ? `avg ${Math.round(v.solves / v.total).toLocaleString()}/ch`
          : "no solves",
    },
    points: {
      values: diffPoints,
      delta: "by difficulty",
    },
  };

  return (
    <div className="kpi-row chx-kpis">
      {CARDS.map((c) => {
        const g = GRAPH[c.key]!;
        const accent =
          {
            blue: "#3b82f6",
            green: "#22c55e",
            yellow: "#eab308",
            purple: "#a78bfa",
            pink: "#ec4899",
            orange: "#f59e0b",
          }[c.tone] ?? "#a78bfa";
        return (
          <div key={c.key} className={`kpi ${c.tone}`} onClick={scroll}>
            <span className="kpi-icon" dangerouslySetInnerHTML={{ __html: c.icon }} />
            <div className="kpi-value">{v[c.key as keyof KpiValues].toLocaleString()}</div>
            <div className="kpi-label">{c.label}</div>
            <div className="kpi-foot">
              <span className="kpi-change">{g.delta}</span>
              <span className="kpi-spark">
                <Bars id={c.key} values={g.values} color={accent} segmentColors={g.colors} />
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}