import type { TeamAdminDto } from "@ctf/shared";

import {
  joinedDate,
  joinedTime,
  pageWindow,
  pointsFmt,
} from "./format";
import {
  Avatar,
  BACK,
  CARET,
  EYE,
  FORWARD,
  PENCIL,
  SVG,
  TeamBadge,
  TRASH,
} from "./TeamIcons";

const BADGE_COLORS: [string, string, string][] = [
  ["#a78bfa", "rgba(167,139,250,.16)", "rgba(167,139,250,.5)"],
  ["#f43f5e", "rgba(244,63,94,.16)", "rgba(244,63,94,.5)"],
  ["#60a5fa", "rgba(96,165,250,.16)", "rgba(96,165,250,.5)"],
  ["#4ade80", "rgba(74,222,128,.16)", "rgba(74,222,128,.5)"],
  ["#f87171", "rgba(248,113,113,.16)", "rgba(248,113,113,.5)"],
  ["#fb923c", "rgba(251,146,60,.16)", "rgba(251,146,60,.5)"],
  ["#facc15", "rgba(250,204,21,.16)", "rgba(250,204,21,.5)"],
  ["#f472b6", "rgba(244,114,182,.16)", "rgba(244,114,182,.5)"],
];

export function teamSeed(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) {
    h = (Math.imul(31, h) + name.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function teamColors(name: string): [string, string, string] {
  return BADGE_COLORS[teamSeed(name) % BADGE_COLORS.length] ?? BADGE_COLORS[0] ?? ["#a78bfa", "rgba(167,139,250,.16)", "rgba(167,139,250,.5)"];
}

function MemberStack({ team }: { team: TeamAdminDto }) {
  const more = Math.max(0, team.memberCount - 1);
  return (
    <div className="member-stack">
      <div className="stack-avs">
        {team.leaderUsername ? (
          <span className="stack-av">
            <Avatar name={team.leaderUsername} seed={team.id} />
          </span>
        ) : null}
        {more > 0 ? <span className="stack-more">+{more}</span> : null}
      </div>
      <span className="stack-count">{team.memberCount}</span>
    </div>
  );
}

export function TeamTable({
  teams,
  total,
  page,
  pageSize,
  selectedId,
  loading,
  onPage,
  onSelect,
  onEdit,
  onDelete,
}: {
  teams: TeamAdminDto[];
  total: number;
  page: number;
  pageSize: number;
  selectedId: number | null;
  loading: boolean;
  onPage: (page: number) => void;
  onSelect: (team: TeamAdminDto) => void;
  onEdit: (team: TeamAdminDto) => void;
  onDelete: (team: TeamAdminDto) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const window = pageWindow(page, totalPages);

  return (
    <>
      <div className="table-wrap">
        <div className="table-scroll">
          <table className="team-table">
            <thead>
              <tr>
                <th>#</th>
                <th>ID</th>
                <th>Team</th>
                <th>Tagline</th>
                <th>Members</th>
                <th>Points</th>
                <th>Solves</th>
                <th>Status</th>
                <th>Joined</th>
                <th className="th-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {teams.map((team) => {
                const [tc, tbg, tline] = teamColors(team.name);
                const isSel = team.id === selectedId;
                return (
                  <tr
                    key={team.id}
                    className={isSel ? "is-selected" : ""}
                    onClick={() => onSelect(team)}
                  >
                    <td className="cell-rank">{team.rank}</td>
                    <td className="cell-hash">
                      {String(team.id).padStart(3, "0")}
                    </td>
                    <td>
                      <div className="cell-team">
                        <span
                          className="team-badge"
                          style={
                            {
                              "--tc": tc,
                              "--tc-bg": tbg,
                              "--tc-line": tline,
                            } as React.CSSProperties
                          }
                        >
                          <TeamBadge name={team.name} seed={team.id} />
                        </span>
                        <span className="team-info">
                          <span className="team-name">{team.name}</span>
                          <span className="team-handle">@{team.slug}</span>
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="cell-tagline">
                        {team.description && team.description.length > 50
                          ? `${team.description.slice(0, 50)}…`
                          : team.description || "No tagline yet"}
                      </span>
                    </td>
                    <td>
                      <MemberStack team={team} />
                    </td>
                    <td>
                      <span className="cell-num-val points">
                        {pointsFmt(team.points)}
                      </span>
                    </td>
                    <td>
                      <span className="cell-num-val solves">{team.solves}</span>
                    </td>
                    <td>
                      <span className={`status-pill ${team.status}`}>
                        <span className="dot" />
                        {team.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div className="cell-date">
                        <span className="d">{joinedDate(team.createdAt)}</span>
                        <span className="t">{joinedTime(team.createdAt)}</span>
                      </div>
                    </td>
                    <td>
                      <div className="cell-actions">
                        <button
                          className="action-icon view"
                          aria-label="View team"
                          title="View team"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelect(team);
                          }}
                        >
                          <SVG d={EYE} size={12} />
                        </button>
                        <button
                          className="action-icon edit"
                          aria-label="Edit team"
                          title="Edit team"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(team);
                          }}
                        >
                          <SVG d={PENCIL} size={12} />
                        </button>
                        <button
                          className="action-icon del"
                          aria-label="Delete team"
                          title="Delete team"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(team);
                          }}
                        >
                          <SVG d={TRASH} size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {teams.length === 0 ? (
                <tr className="empty-row">
                  <td colSpan={10}>
                    {loading
                      ? "Loading teams…"
                      : "No teams match your filters"}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="pagination">
        <div className="page-info">
          Showing <b>{from}</b> to <b>{to}</b> of <b>{total}</b> teams
        </div>
        <div className="page-controls">
          <button
            className="page-btn"
            aria-label="Previous"
            disabled={page <= 1}
            onClick={() => onPage(page - 1)}
          >
            <SVG d={BACK} size={12} />
          </button>
          {window.map((item, i) =>
            item === "..." ? (
              <span className="page-ellipsis" key={`e${i}`}>
                …
              </span>
            ) : (
              <button
                key={item}
                className={`page-btn${item === page ? " is-active" : ""}`}
                onClick={() => onPage(item)}
              >
                {item}
              </button>
            ),
          )}
          <button
            className="page-btn"
            aria-label="Next"
            disabled={page >= totalPages}
            onClick={() => onPage(page + 1)}
          >
            <SVG d={FORWARD} size={12} />
          </button>
        </div>
        <div className="per-page">
          {pageSize} per page
          <SVG d={CARET} size={10} />
        </div>
      </div>
    </>
  );
}