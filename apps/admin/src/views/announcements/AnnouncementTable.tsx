import type {
  AnnouncementAdminListResult,
  AnnouncementAdminRowDto,
} from "@ctf/shared";

import { pageWindow, numFmt } from "../submissions/format";
import { anDate, anTime, thumbSeed } from "./format";
import { MEGA } from "./icons";
import { Avatar, BACK, CARET, COPY, FORWARD, PENCIL, SVG, TRASH } from "../teams/TeamIcons";

export function AnnouncementTable({
  items,
  meta,
  page,
  pageSize,
  loading,
  onPage,
  onEdit,
  onCopy,
  onDelete,
}: {
  items: AnnouncementAdminRowDto[];
  meta: AnnouncementAdminListResult["meta"];
  page: number;
  pageSize: number;
  loading: boolean;
  onPage: (page: number) => void;
  onEdit: (row: AnnouncementAdminRowDto) => void;
  onCopy: (row: AnnouncementAdminRowDto) => void;
  onDelete: (row: AnnouncementAdminRowDto) => void;
}) {
  const { total, totalPages } = meta;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const window = pageWindow(page, totalPages);

  return (
    <>
      <div className="an-table-wrap">
        <div className="an-table-scroll">
          <table className="an-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Title</th>
                <th>State</th>
                <th>Created By</th>
                <th>Published At</th>
                <th className="th-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row, i) => {
                const t = thumbSeed(row.id);
                return (
                  <tr key={row.id}>
                    <td className="an-cell-num">{(page - 1) * pageSize + i + 1}</td>
                    <td>
                      <div className="an-title-cell">
                        <span
                          className="an-thumb"
                          style={{ background: `linear-gradient(135deg,${t.from},${t.to})` }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.85)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <g dangerouslySetInnerHTML={{ __html: MEGA }} />
                          </svg>
                        </span>
                        <span className="an-title-body">
                          <span className="an-title">{row.title}</span>
                          <span className="an-excerpt">{row.excerpt}</span>
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`an-state ${row.pinned ? "pinned" : "live"}`}>
                        <span className="dot" />
                        {row.pinned ? "Pinned" : "Live"}
                      </span>
                    </td>
                    <td>
                      <div className="an-cell-user">
                        <span className="an-user-avatar-sm">
                          <Avatar name={row.authorUsername} seed={row.authorId} />
                        </span>
                        <span className="an-user-handle">@{row.authorUsername}</span>
                      </div>
                    </td>
                    <td>
                      <span className="an-cell-date">
                        {anDate(row.createdAt)}
                        <span className="an-cell-time">{anTime(row.createdAt)}</span>
                      </span>
                    </td>
                    <td>
                      <div className="cell-actions">
                        <button
                          className="action-icon"
                          aria-label="Edit announcement"
                          title="Edit"
                          onClick={() => onEdit(row)}
                        >
                          <SVG d={PENCIL} size={12} />
                        </button>
                        <button
                          className="action-icon"
                          aria-label="Copy announcement"
                          title="Copy to clipboard"
                          onClick={() => onCopy(row)}
                        >
                          <SVG d={COPY} size={12} />
                        </button>
                        <button
                          className="action-icon danger"
                          aria-label="Delete announcement"
                          title="Delete"
                          onClick={() => onDelete(row)}
                        >
                          <SVG d={TRASH} size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 ? (
                <tr className="empty-row">
                  <td colSpan={6}>
                    {loading ? "Loading announcements…" : "No announcements match your filters"}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="an-pagination">
        <div className="page-info">
          Showing <b>{from}</b> to <b>{to}</b> of <b>{numFmt(total)}</b> announcements
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