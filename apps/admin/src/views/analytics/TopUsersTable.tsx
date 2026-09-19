import type { AnalyticsTopUserRow } from "@ctf/shared";
import { getAvatarColors, numFmt } from "./format";
import { EXTERNAL_LINK } from "./icons";

interface Props {
  users?: AnalyticsTopUserRow[];
  onViewAll?: () => void;
}

function MiniAvatar({ username }: { username: string }) {
  const [c1, c2] = getAvatarColors(username);
  return (
    <svg viewBox="0 0 40 40">
      <rect width="40" height="40" fill={c2} opacity="0.4" />
      <path
        d="M20 5 Q32 8 30 22 Q28 32 20 36 Q12 32 10 22 Q8 8 20 5Z"
        fill="#0d0818"
      />
      <ellipse cx="20" cy="21" rx="7" ry="9" fill="#000" />
      <circle cx="17" cy="20" r="1.4" fill={c1} />
      <circle cx="23" cy="20" r="1.4" fill={c1} />
    </svg>
  );
}

export function TopUsersTable({ users, onViewAll }: Props) {
  const list = (users ?? []).slice(0, 5);

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">Top Users</span>
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
          <span className="panel-sub">Global Leaderboard</span>
        )}
      </div>

      <table className="mini-table">
        <thead>
          <tr>
            <th>#</th>
            <th>User</th>
            <th>Team</th>
            <th className="right">Points</th>
            <th className="right">Solves</th>
          </tr>
        </thead>
        <tbody>
          {list.length > 0 ? (
            list.map((u) => (
              <tr key={u.userId}>
                <td>
                  <span className="mini-rank">{u.rank}</span>
                </td>
                <td>
                  <div className="cell-user-cell">
                    <span className="cell-av">
                      <MiniAvatar username={u.username} />
                    </span>
                    <span className="cell-user-name">{u.username}</span>
                  </div>
                </td>
                <td>
                  <span className="cell-mono muted">{u.teamName ?? "Solo"}</span>
                </td>
                <td>
                  <span className="cell-mono">{numFmt(u.points)}</span>
                </td>
                <td>
                  <span className="cell-mono">{numFmt(u.solves)}</span>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} style={{ textAlign: "center", color: "var(--text-3)", padding: 16 }}>
                No active users found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
