import type { EventCardMeta } from "./format";
import { STATUS_LABEL, fullDate } from "./format";

function G(d: string) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
}

const CARDS = [
  {
    key: "total",
    tone: "purple",
    icon: G(
      '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M8 3v4M16 3v4M3 10h18"/>',
    ),
    label: "Total Events",
  },
  {
    key: "running",
    tone: "green",
    icon: G('<path d="M3 12h4l2-7 4 14 3-7h5"/>'),
    label: "Running",
  },
  {
    key: "scheduled",
    tone: "yellow",
    icon: G('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
    label: "Scheduled",
  },
  {
    key: "completed",
    tone: "purple-2",
    icon: G('<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.4 2.4L16 9.8"/>'),
    label: "Completed",
  },
  {
    key: "participants",
    tone: "blue",
    icon: G(
      '<path d="M16 20.5v-1.8a3.6 3.6 0 0 0-3.6-3.6H6.6A3.6 3.6 0 0 0 3 18.7v1.8"/><circle cx="9.5" cy="8" r="3.4"/><path d="M21 20.5v-1.8a3.6 3.6 0 0 0-2.7-3.5"/><path d="M15.5 4.7a3.6 3.6 0 0 1 0 6.7"/>',
    ),
    label: "Total Participants",
  },
  {
    key: "challenges",
    tone: "pink",
    icon: G(
      '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>',
    ),
    label: "Event Challenges",
  },
];

function barsPath(
  values: number[],
  width: number,
  height: number,
): Array<{ x: number; y: number; w: number; h: number }> {
  if (values.length === 0) return [];
  const max = Math.max(...values, 0.0001);
  const n = values.length;
  const step = width / n;
  const bw = Math.max(3, Math.min(7, step * 0.55));
  const inner = height - 4;
  return values.map((v, i) => {
    const h = Math.max(3, (v / max) * (inner - 3));
    const x = i * step + (step - bw) / 2;
    const y = height - h - 2;
    return { x, y, w: bw, h };
  });
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
          if (v <= 0) return null;
          const w = (v / total) * 76;
          return (
            <rect
              key={i}
              x={x}
              y={5}
              width={i === values.length - 1 ? w : Math.max(w - 1, 0)}
              height={16}
              rx={1.5}
              fill={segmentColors[i] ?? color}
            />
          );
        })}
      </svg>
    );
  }
  const rects = barsPath(values, 76, 26);
  const grad = `evtkg-${id}`;
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

export interface EventKpiValues {
  total: number;
  running: number;
  scheduled: number;
  completed: number;
  drafts: number;
  participants: number;
  challenges: number;
}

function pct(part: number, whole: number): string {
  if (whole <= 0) return "0%";
  return `${Math.round((part / whole) * 100)}%`;
}

export function EventKpis({
  v,
  events,
}: {
  v: EventKpiValues;
  events: EventCardMeta[];
}) {
  const byStatus = (s: string) => events.filter((e) => e.status === s);
  const upcoming = (f: (e: EventCardMeta) => boolean) =>
    events.filter(f);

  const runningEvents = byStatus("RUNNING");
  const scheduledEvents = byStatus("SCHEDULED");
  const completedEvents = byStatus("ENDED");

  const parts = (list: EventCardMeta[], take: number) =>
    list.slice(-take).map((e) => e.participantCount);

  const GRAPH: Record<
    string,
    { values: number[]; colors?: string[]; delta: string }
  > = {
    total: {
      values: [v.drafts, v.scheduled, v.running, v.completed],
      colors: ["#6b6b85", "#f5a524", "#22c55e", "#a78bfa"],
      delta: `${v.drafts} draft · ${v.scheduled} sched`,
    },
    running: {
      values: parts(runningEvents, 8),
      delta: v.running > 0 ? `${pct(v.running, v.total)} of total` : "not running",
    },
    scheduled: {
      values: parts(scheduledEvents, 8),
      delta: upcoming(
        (e) => e.status === "SCHEDULED" && e.startsAt !== "",
      ).length
        ? "upcoming"
        : "none scheduled",
    },
    completed: {
      values: parts(completedEvents, 8),
      delta: `${pct(v.completed, v.total)} of total`,
    },
    participants: {
      values: events.slice(-8).map((e) => e.participantCount),
      delta: events.length > 0 ? `across ${v.total} events` : "no events",
    },
    challenges: {
      values: events.slice(-8).map((e) => e.challengeCount),
      delta: events.length > 0 ? `across ${v.total} events` : "no events",
    },
  };

  const ACCENT: Record<string, string> = {
    blue: "#60a5fa",
    green: "#22c55e",
    yellow: "#eab308",
    purple: "#a78bfa",
    "purple-2": "#c084fc",
    pink: "#ec4899",
  };

  const scroll = () =>
    document.getElementById("evtList")?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="kpi-row evt-kpis">
      {CARDS.map((c) => {
        const g = GRAPH[c.key]!;
        const accent = ACCENT[c.tone] ?? "#a78bfa";
        return (
          <div key={c.key} className={`kpi ${c.tone}`} onClick={scroll}>
            <span
              className="kpi-icon"
              dangerouslySetInnerHTML={{ __html: c.icon }}
            />
            <div className="kpi-value">
              {v[c.key as keyof EventKpiValues].toLocaleString()}
            </div>
            <div className="kpi-label">{c.label}</div>
            <div className="kpi-foot">
              <span className="kpi-change">{g.delta}</span>
              <span className="kpi-spark">
                <Bars
                  id={c.key}
                  values={g.values}
                  color={accent}
                  segmentColors={g.colors}
                />
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function nextEventLabel(events: EventCardMeta[]): string {
  const upcoming = events
    .filter((e) => e.status === "SCHEDULED")
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  if (upcoming.length === 0) return "No upcoming events";
  const next = upcoming[0]!;
  return `${next.title} · ${fullDate(new Date(next.startsAt))}`;
}

export { STATUS_LABEL };