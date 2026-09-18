import type { SubmissionAdminRowDto } from "@ctf/shared";

import {
  challengeProfile,
  flagPreview,
  pageWindow,
  submissionTime,
  shortNum,
} from "./format";
import { Avatar, BACK, CARET, EYE, FORWARD, SVG } from "../teams/TeamIcons";

export function SubmissionTable({
  items,
  total,
  page,
  pageSize,
  loading,
  onPage,
  onView,
}: {
  items: SubmissionAdminRowDto[];
  total: number;
  page: number;
  pageSize: number;
  loading: boolean;
  onPage: (page: number) => void;
  onView: (row: SubmissionAdminRowDto) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const window = pageWindow(page, totalPages);

  return (
    <>
      <div className="sub-table-wrap">
        <div className="sub-table-scroll">
          <table className="sub-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Time</th>
                <th>User</th>
                <th>Team</th>
                <th>Challenge</th>
                <th>Submitted Flag</th>
                <th>Result</th>
                <th className="th-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row, i) => {
                const prof = challengeProfile(row.challenge);
                return (
                  <tr key={row.id}>
                    <td className="cell-num">{(page - 1) * pageSize + i + 1}</td>
                    <td>
                      <span className="cell-time">{submissionTime(row.time)}</span>
                    </td>
                    <td>
                      <div className="cell-user">
                        <span className="user-avatar-sm">
                          <Avatar name={row.username} seed={row.userId} />
                        </span>
                        <span className="user-handle">@{row.username}</span>
                      </div>
                    </td>
                    <td>
                      {row.teamName ? (
                        <span className="cell-team">{row.teamName}</span>
                      ) : (
                        <span className="cell-team muted">(No Team)</span>
                      )}
                    </td>
                    <td>
                      <div className="cell-challenge">
                        <span
                          className="challenge-icon"
                          style={
                            {
                              "--ch": prof.color,
                              "--ch-bg": `${prof.color}22`,
                              "--ch-line": `${prof.color}55`,
                            } as React.CSSProperties
                          }
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <g dangerouslySetInnerHTML={{ __html: prof.d }} />
                          </svg>
                        </span>
                        <span className="challenge-name">{row.challenge}</span>
                      </div>
                    </td>
                    <td>
                      <span className="cell-flag" title={row.flagHash}>
                        {flagPreview(row.flagHash)}
                      </span>
                    </td>
                    <td>
                      <span className={`result-pill ${row.correct ? "correct" : "incorrect"}`}>
                        <span className="dot" />
                        {row.correct ? "Correct" : "Incorrect"}
                      </span>
                    </td>
                    <td>
                      <div className="cell-actions">
                        <button
                          className="action-icon"
                          aria-label="View submission"
                          title="View submission"
                          onClick={() => onView(row)}
                        >
                          <SVG d={EYE} size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 ? (
                <tr className="empty-row">
                  <td colSpan={8}>
                    {loading ? "Loading submissions…" : "No submissions match your filters"}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="sub-pagination">
        <div className="page-info">
          Showing <b>{from}</b> to <b>{to}</b> of <b>{shortNum(total)}</b> submissions
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