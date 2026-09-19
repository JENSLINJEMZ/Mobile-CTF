import type { AnalyticsKpiPoint, AnalyticsKpis as AnalyticsKpisType } from "@ctf/shared";
import { generateSparkline, numFmt } from "./format";
import {
  ACTIVE_USERS_ICON,
  CHALLENGES_ICON,
  DOWN_ARROW,
  POINTS_ICON,
  SOLVES_ICON,
  SUBMISSIONS_ICON,
  UP_ARROW,
  USERS_ICON,
} from "./icons";

interface KpiCardProps {
  variant: "purple" | "blue" | "red" | "green" | "yellow" | "pink";
  iconSvg: string;
  label: string;
  data: AnalyticsKpiPoint;
  formatFn?: (n: number) => string;
}

function KpiCard({ variant, iconSvg, label, data, formatFn = numFmt }: KpiCardProps) {
  const isUp = data.changePct >= 0;
  const { linePath, areaPath } = generateSparkline(data.sparkline);
  const strokeColor =
    variant === "purple"
      ? "#a78bfa"
      : variant === "blue"
        ? "#60a5fa"
        : variant === "red"
          ? "#f87171"
          : variant === "green"
            ? "#4ade80"
            : variant === "yellow"
              ? "#facc15"
              : "#f472b6";

  return (
    <div className={`kpi ${variant}`}>
      <div className="kpi-top">
        <span
          className="kpi-icon"
          dangerouslySetInnerHTML={{
            __html: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconSvg}</svg>`,
          }}
        />
      </div>
      <div className="kpi-value">{formatFn(data.value)}</div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-foot">
        <span className={`kpi-change ${isUp ? "up" : "down"}`}>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            dangerouslySetInnerHTML={{ __html: isUp ? UP_ARROW : DOWN_ARROW }}
          />
          {Math.abs(data.changePct)}%
        </span>
        <svg className="kpi-spark" viewBox="0 0 76 26" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`grad-${variant}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.35" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill={`url(#grad-${variant})`} />
          <path
            d={linePath}
            fill="none"
            stroke={strokeColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}

export function AnalyticsKpis({ kpis }: { kpis: AnalyticsKpisType }) {
  return (
    <div className="kpi-row">
      <KpiCard
        variant="purple"
        iconSvg={USERS_ICON}
        label="Total Users"
        data={kpis.totalUsers}
      />
      <KpiCard
        variant="blue"
        iconSvg={ACTIVE_USERS_ICON}
        label="Active Users"
        data={kpis.activeUsers}
      />
      <KpiCard
        variant="red"
        iconSvg={SUBMISSIONS_ICON}
        label="Total Submissions"
        data={kpis.totalSubmissions}
      />
      <KpiCard
        variant="green"
        iconSvg={SOLVES_ICON}
        label="Correct Submissions"
        data={kpis.correctSubmissions}
      />
      <KpiCard
        variant="yellow"
        iconSvg={POINTS_ICON}
        label="Points Awarded"
        data={kpis.pointsAwarded}
      />
      <KpiCard
        variant="pink"
        iconSvg={CHALLENGES_ICON}
        label="Challenges"
        data={kpis.challenges}
      />
    </div>
  );
}
