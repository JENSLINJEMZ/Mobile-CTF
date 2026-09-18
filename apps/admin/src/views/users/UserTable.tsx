import type { Role, UserAdminDto } from "@ctf/shared";
import { useMemo, useState } from "react";

import type {
  UserSortKey,
  UserStatusKey,
  UserTabKey,
} from "./format";
import {
  ROLE_LABEL,
  TABS,
  joinedDate,
  relativeTime,
  roleClass,
  statusLabel,
  userIdLabel,
  userStatus,
} from "./format";
import {
  CARET,
  COPY,
  FORWARD,
  BACK,
  GRID_VIEW,
  KEBAB,
  LIST_VIEW,
  PENCIL,
  PLUS,
  SEARCH,
  SLIDERS,
  SVG,
  Avatar,
  RoleIcon,
} from "./UserIcons";

const PAGE_SIZES = [10, 25, 50];

function pageWindow(page: number, totalPages: number): (number | "…")[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const items: (number | "…")[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);
  if (start > 2) items.push("…");
  for (let i = start; i <= end; i++) items.push(i);
  if (end < totalPages - 1) items.push("…");
  items.push(totalPages);
  return items;
}

function MoreMenu({
  user,
  busy,
  onEdit,
  onCopy,
  onToggleActive,
}: {
  user: UserAdminDto;
  busy: boolean;
  onEdit: (u: UserAdminDto) => void;
  onCopy: (u: UserAdminDto) => void;
  onToggleActive: (u: UserAdminDto) => void;
}) {
  return (
    <div className="usr-more-menu" onClick={(e) => e.stopPropagation()}>
      <button disabled={busy} onClick={() => onEdit(user)}>
        <SVG d={PENCIL} />
        Edit user
      </button>
      <button disabled={busy} onClick={() => onCopy(user)}>
        <SVG d={COPY} />
        Copy email
      </button>
      <button
        disabled={busy}
        onClick={() => onToggleActive(user)}
        className={user.isActive ? "danger" : "success"}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14" />
        </svg>
        {user.isActive ? "Disable user" : "Enable user"}
      </button>
    </div>
  );
}

export function UserTable({
  rows,
  total,
  loading,
  empty,
  tab,
  onTab,
  query,
  onQuery,
  role,
  onRole,
  status,
  onStatus,
  sort,
  onSort,
  view,
  onView,
  page,
  pageSize,
  onPage,
  onPageSize,
  onAdd,
  onEdit,
  onCopy,
  onToggleActive,
}: {
  rows: UserAdminDto[];
  total: number;
  loading: boolean;
  empty: string;
  tab: UserTabKey;
  onTab: (t: UserTabKey) => void;
  query: string;
  onQuery: (q: string) => void;
  role: "all" | Role;
  onRole: (r: "all" | Role) => void;
  status: UserStatusKey;
  onStatus: (s: UserStatusKey) => void;
  sort: UserSortKey;
  onSort: (s: UserSortKey) => void;
  view: "list" | "grid";
  onView: (v: "list" | "grid") => void;
  page: number;
  pageSize: number;
  onPage: (p: number) => void;
  onPageSize: (n: number) => void;
  onAdd: () => void;
  onEdit: (u: UserAdminDto) => void;
  onCopy: (u: UserAdminDto) => void;
  onToggleActive: (u: UserAdminDto) => void;
}) {
  const [moreFor, setMoreFor] = useState<number | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const pages = useMemo(() => pageWindow(page, totalPages), [page, totalPages]);

  const resetFilters = () => {
    onQuery("");
    onRole("all");
    onStatus("all");
    onTab("all");
  };

  return (
    <>
      {/* tabs + actions */}
      <div className="tabs-row">
        <div className="tabs">
          {TABS.map(([key, label]) => (
            <button
              key={key}
              className={`tab${tab === key ? " is-active" : ""}`}
              onClick={() => onTab(key)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="tabs-actions">
          <button className="btn btn-secondary" disabled title="Select rows to run bulk actions">
            Bulk Actions
            <SVG className="chev" d={CARET} />
          </button>
          <button className="btn btn-secondary" disabled title="Importing users is not available yet">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
              <path d="M14 3v5h5" />
              <path d="M12 11v6M9 14h6" />
            </svg>
            Import Users
          </button>
          <button className="btn btn-primary" onClick={onAdd}>
            <SVG d={PLUS} />
            Add User
          </button>
        </div>
      </div>

      {/* filter bar */}
      <div className="filter-bar">
        <label className="filter-search">
          <SVG d={SEARCH} />
          <input
            type="text"
            placeholder="Search by username, email or ID..."
            value={query}
            onChange={(e) => onQuery(e.target.value)}
          />
        </label>
        <label className="filter-select">
          <select value={role} onChange={(e) => onRole(e.target.value as "all" | Role)}>
            <option value="all">All Roles</option>
            {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
          <SVG d={CARET} />
        </label>
        <label className="filter-select">
          <select value={status} onChange={(e) => onStatus(e.target.value as UserStatusKey)}>
            <option value="all">All Status</option>
            <option value="online">Online</option>
            <option value="idle">Idle</option>
            <option value="offline">Offline</option>
          </select>
          <SVG d={CARET} />
        </label>
        <label className="filter-select">
          <select value={sort} onChange={(e) => onSort(e.target.value as UserSortKey)}>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="solves">Most Solves</option>
            <option value="points">Most Points</option>
          </select>
          <SVG d={CARET} />
        </label>
        <button className="filter-btn" onClick={resetFilters}>
          <SVG d={SLIDERS} />
          Reset
        </button>
        <div className="view-toggle">
          <button
            className={view === "list" ? "is-active" : ""}
            aria-label="List view"
            onClick={() => onView("list")}
          >
            <SVG d={LIST_VIEW} />
          </button>
          <button
            className={view === "grid" ? "is-active" : ""}
            aria-label="Grid view"
            onClick={() => onView("grid")}
          >
            <SVG d={GRID_VIEW} />
          </button>
        </div>
      </div>

      {loading ? <div className="usr-empty">Loading users…</div> : null}
      {!loading && total === 0 ? <div className="usr-empty">{empty}</div> : null}

      {!loading && total > 0 && view === "list" ? (
        <div className="table-wrap">
          <div className="table-scroll">
            <table className="user-table">
              <thead>
                <tr>
                  <th className="cell-check" />
                  <th>#</th>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Solves</th>
                  <th>Points</th>
                  <th>Joined</th>
                  <th>Last Active</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u, i) => (
                  <tr key={u.id}>
                    <td className="cell-check">
                      <input type="checkbox" aria-label={`Select ${u.username}`} />
                    </td>
                    <td className="cell-num">{from + i}</td>
                    <td>
                      <div className="cell-user">
                        <span className="user-avatar-sm">
                          <Avatar name={u.username} seed={u.id} />
                        </span>
                        <span className="user-info-cell">
                          <span className="user-display">{u.username}</span>
                          <span className="user-id">{userIdLabel(u)}</span>
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className="cell-email">{u.email}</span>
                    </td>
                    <td>
                      <span className={`role-pill ${roleClass(u.role)}`}>
                        <RoleIcon role={u.role} />
                        {ROLE_LABEL[u.role]}
                      </span>
                    </td>
                    <td>
                      <span className={`status-cell ${userStatus(u)}`}>
                        <span className="status-dot" />
                        {statusLabel(userStatus(u))}
                      </span>
                    </td>
                    <td>
                      <span className="cell-num-val">{u.solveCount}</span>
                    </td>
                    <td>
                      <span className="cell-num-val">{u.totalScore.toLocaleString()}</span>
                    </td>
                    <td>
                      <span className="cell-date">{joinedDate(u.createdAt)}</span>
                    </td>
                    <td>
                      <span className="cell-active">{relativeTime(u.lastLoginAt)}</span>
                    </td>
                    <td>
                      <div className="cell-actions">
                        <button className="action-icon edit" aria-label="Edit" onClick={() => onEdit(u)}>
                          <SVG d={PENCIL} />
                        </button>
                        <button className="action-icon copy" aria-label="Copy" onClick={() => onCopy(u)}>
                          <SVG d={COPY} />
                        </button>
                        <div className="usr-more-wrap">
                          <button
                            className={`action-icon more${moreFor === u.id ? " is-open" : ""}`}
                            aria-label="More"
                            onClick={() => setMoreFor(moreFor === u.id ? null : u.id)}
                          >
                            <SVG d={KEBAB} />
                          </button>
                          {moreFor === u.id ? (
                            <MoreMenu
                              user={u}
                              busy={loading}
                              onEdit={(x) => {
                                onEdit(x);
                                setMoreFor(null);
                              }}
                              onCopy={(x) => {
                                onCopy(x);
                                setMoreFor(null);
                              }}
                              onToggleActive={(x) => {
                                onToggleActive(x);
                                setMoreFor(null);
                              }}
                            />
                          ) : null}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {!loading && total > 0 && view === "grid" ? (
        <div className="usr-grid">
          {rows.map((u) => (
            <div key={u.id} className="usr-card">
              <div className="usr-card-top">
                <span className="user-avatar-sm usr-card-avatar">
                  <Avatar name={u.username} seed={u.id} />
                </span>
                <span className={`role-pill usr-card-role ${roleClass(u.role)}`}>
                  <RoleIcon role={u.role} />
                  {ROLE_LABEL[u.role]}
                </span>
              </div>
              <div className="usr-card-name">{u.username}</div>
              <div className="usr-card-id">{userIdLabel(u)}</div>
              <div className="usr-card-email">{u.email}</div>
              <div className="usr-card-foot">
                <span className={`status-cell ${userStatus(u)}`}>
                  <span className="status-dot" />
                  {statusLabel(userStatus(u))}
                </span>
                <div className="usr-card-stats">
                  <span>
                    <b>{u.solveCount}</b> solves
                  </span>
                  <span>
                    <b>{u.totalScore.toLocaleString()}</b> pts
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* pagination */}
      {total > 0 ? (
        <div className="pagination">
          <div className="page-info">
            Showing <b>{from}</b> to <b>{to}</b> of <b>{total.toLocaleString()}</b> users
          </div>
          <div className="page-controls">
            <button
              className="page-btn"
              aria-label="Previous"
              disabled={page <= 1}
              onClick={() => onPage(page - 1)}
            >
              <SVG d={BACK} />
            </button>
            {pages.map((p, i) =>
              p === "…" ? (
                <span key={`e-${i}`} className="page-ellipsis">
                  …
                </span>
              ) : (
                <button
                  key={p}
                  className={`page-btn${page === p ? " is-active" : ""}`}
                  onClick={() => onPage(p)}
                >
                  {p}
                </button>
              ),
            )}
            <button
              className="page-btn"
              aria-label="Next"
              disabled={page >= totalPages}
              onClick={() => onPage(page + 1)}
            >
              <SVG d={FORWARD} />
            </button>
          </div>
          <label className="per-page">
            <select value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))}>
              {PAGE_SIZES.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            per page
            <SVG d={CARET} />
          </label>
        </div>
      ) : null}
    </>
  );
}