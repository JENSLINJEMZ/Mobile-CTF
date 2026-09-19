import type { AnalyticsTopTeamRow } from "@ctf/shared";
import { numFmt } from "./format";
import { EXTERNAL_LINK, SHIELD_ICON } from "./icons";

interface Props {
  teams?: AnalyticsTopTeamRow[];
  onViewAll?: () => void;
}

const TEAM_COLORS = ["#f43f5e", "#a78bfa", "#60a5fa", "#4ade80", "#c4b5fd"];

export function TopTeamsTable({ teams, onViewAll }: Props) {
  const list = (teams ?? []).slice(0, 5);

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">Top Teams</span>
        {onViewAll ? (
          <button
            type="button"
            className="panel-link"
            onClick={onViewAll}
            style={{ background: "none", border: "none", cursor: "pointer" }}
          >
            View All{" "}
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              dangerouslySetInnerHTML={{ __html: EXTERNAL_LINK }}
            />
          </button>
        ) : (
          <span className="panel-sub">Active Squads</span>
        )}
      </div>

      <table className="mini-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Team</th>
            <th className="right">Members</th>
            <th className="right">Points</th>
          </tr>
        </thead>
        <tbody>
          {list.length > 0 ? (
            list.map((t, idx) => {
              const color = TEAM_COLORS[idx % TEAM_COLORS.length] ?? "#a78bfa";
              return (
                <tr key={t.teamId}>
                  <td>
                    <span className="mini-rank">{t.rank}</span>
                  </td>
                  <td>
                    <div className="cell-team-cell">
                      <span
                        className="cell-team-icon"
                        style={{
                          backgroundColor: `${color}22`,
                          borderColor: `${color}55`,
                          color,
                        }}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          dangerouslySetInnerHTML={{ __html: SHIELD_ICON }}
                        />
                      </span>
                      <span className="cell-team-name">{t.name}</span>
                    </div>
                  </td>
                  <td>
                    <span className="cell-mono">{numFmt(t.members)}</span>
                  </td>
                  <td>
                    <span className="cell-mono">{numFmt(t.points)}</span>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={4} style={{ textAlign: "center", color: "var(--text-3)", padding: 16 }}>
                No teams registered.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
