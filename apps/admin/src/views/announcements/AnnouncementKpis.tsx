import type { AnnouncementKpiDto } from "@ctf/shared";

import { numFmt } from "../submissions/format";
import { MEGA, PIN } from "./icons";
import { CAL, SVG, USERS } from "../teams/TeamIcons";

type Tone = "purple" | "green" | "blue" | "red";

function Change({ up, pct }: { up: boolean; pct: number }) {
  return (
    <span className={`an-change ${up ? "up" : "down"}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d={up ? "M12 19V5" : "M12 5v14"} />
        <path d={up ? "m5 12 7-7 7 7" : "m5 12 7 7 7-7"} />
      </svg>
      {Math.abs(pct)}%
    </span>
  );
}

function Card({
  tone,
  icon,
  value,
  label,
  change,
}: {
  tone: Tone;
  icon: string;
  value: string;
  label: string;
  change: number | null;
}) {
  return (
    <div className={`an-kpi ${tone}`}>
      <div className="an-kpi-top">
        <span className="an-kpi-icon">
          <SVG d={icon} size={16} />
        </span>
      </div>
      <div className="an-kpi-value">{value}</div>
      <div className="an-kpi-label">{label}</div>
      <div className="an-kpi-foot">
        {change != null ? <Change up={change >= 0} pct={change} /> : null}
      </div>
    </div>
  );
}

export function AnnouncementKpis({ kpis }: { kpis: AnnouncementKpiDto }) {
  return (
    <div className="an-kpi-row">
      <Card
        tone="purple"
        icon={MEGA}
        value={numFmt(kpis.total)}
        label="Total Announcements"
        change={kpis.totalChangePct}
      />
      <Card
        tone="green"
        icon={PIN}
        value={numFmt(kpis.pinned)}
        label="Pinned Announcements"
        change={kpis.pinnedChangePct}
      />
      <Card
        tone="blue"
        icon={CAL}
        value={numFmt(kpis.last7)}
        label="Last 7 Days"
        change={kpis.last7ChangePct}
      />
      <Card
        tone="red"
        icon={USERS}
        value={numFmt(kpis.authors)}
        label="Update Authors"
        change={kpis.authorsChangePct}
      />
    </div>
  );
}