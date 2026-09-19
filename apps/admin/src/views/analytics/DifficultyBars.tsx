import type { AnalyticsDifficultyStats } from "@ctf/shared";
import { numFmt } from "./format";
import { CHEVRON_DOWN } from "./icons";

interface Props {
  diffStats?: AnalyticsDifficultyStats;
}

export function DifficultyBars({ diffStats }: Props) {
  const easy = diffStats?.easy ?? { count: 0, solves: 0, pct: 0 };
  const medium = diffStats?.medium ?? { count: 0, solves: 0, pct: 0 };
  const hard = diffStats?.hard ?? { count: 0, solves: 0, pct: 0 };
  const expert = diffStats?.expert ?? { count: 0, solves: 0, pct: 0 };

  const maxVal = Math.max(1, easy.solves, medium.solves, hard.solves, expert.solves, easy.count, medium.count, hard.count, expert.count);

  const easyHeight = Math.max(8, Math.round(((easy.solves || easy.count) / maxVal) * 85));
  const medHeight = Math.max(8, Math.round(((medium.solves || medium.count) / maxVal) * 85));
  const hardHeight = Math.max(8, Math.round(((hard.solves || hard.count) / maxVal) * 85));
  const expHeight = Math.max(8, Math.round(((expert.solves || expert.count) / maxVal) * 85));

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">Solves by Difficulty</span>
        <button className="select-sm">
          Total Solves{" "}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            dangerouslySetInnerHTML={{ __html: CHEVRON_DOWN }}
          />
        </button>
      </div>

      <div className="diff-chart">
        <div className="diff-y-axis">
          <span>{numFmt(maxVal)}</span>
          <span>{numFmt(Math.round(maxVal * 0.75))}</span>
          <span>{numFmt(Math.round(maxVal * 0.5))}</span>
          <span>{numFmt(Math.round(maxVal * 0.25))}</span>
          <span>0</span>
        </div>

        <div className="diff-col">
          <div
            className="diff-bar easy"
            style={{ height: `${easyHeight}%` }}
            title={`Easy: ${numFmt(easy.solves)} solves (${easy.count} challenges)`}
          />
          <div className="diff-label">
            <span className="nm">Easy</span>
            <span className="val">({numFmt(easy.solves || easy.count)})</span>
          </div>
        </div>

        <div className="diff-col">
          <div
            className="diff-bar medium"
            style={{ height: `${medHeight}%` }}
            title={`Medium: ${numFmt(medium.solves)} solves (${medium.count} challenges)`}
          />
          <div className="diff-label">
            <span className="nm">Medium</span>
            <span className="val">({numFmt(medium.solves || medium.count)})</span>
          </div>
        </div>

        <div className="diff-col">
          <div
            className="diff-bar hard"
            style={{ height: `${hardHeight}%` }}
            title={`Hard: ${numFmt(hard.solves)} solves (${hard.count} challenges)`}
          />
          <div className="diff-label">
            <span className="nm">Hard</span>
            <span className="val">({numFmt(hard.solves || hard.count)})</span>
          </div>
        </div>

        <div className="diff-col">
          <div
            className="diff-bar expert"
            style={{ height: `${expHeight}%` }}
            title={`Expert: ${numFmt(expert.solves)} solves (${expert.count} challenges)`}
          />
          <div className="diff-label">
            <span className="nm">Expert</span>
            <span className="val">({numFmt(expert.solves || expert.count)})</span>
          </div>
        </div>
      </div>
    </div>
  );
}
