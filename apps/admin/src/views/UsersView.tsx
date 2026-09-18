import type { Role, TeamAdminDto, UserAdminDto } from "@ctf/shared";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { Session } from "../adminApi";
import * as adminApi from "../adminApi";
import type { QuickActionKey } from "./users/UserAnalytics";
import { UserAnalytics } from "./users/UserAnalytics";
import { UserKpis, type UserKpiValues } from "./users/UserKpis";
import { UserModal, type UserModalSubmit } from "./users/UserModal";
import { UserTable } from "./users/UserTable";
import {
  type UserSortKey,
  type UserStatusKey,
  type UserTabKey,
  downloadCsv,
  filterUsers,
  sortUsers,
} from "./users/format";

const LIMIT = 100;

export function UsersView({
  session,
  onNavigate,
}: {
  session: Session;
  onNavigate: (view: string) => void;
}) {
  const [users, setUsers] = useState<UserAdminDto[]>([]);
  const [teams, setTeams] = useState<TeamAdminDto[]>([]);
  const [gearing, setGearing] = useState<{ total: number; active: number }>({
    total: 0,
    active: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState<UserTabKey>("all");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<"all" | Role>("all");
  const [status, setStatus] = useState<UserStatusKey>("all");
  const [sort, setSort] = useState<UserSortKey>("newest");
  const [view, setView] = useState<"list" | "grid">("list");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAdminDto | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [userRes, overviewRes, teamRes] = await Promise.all([
        adminApi.listAdminUsers(session, { limit: LIMIT }),
        adminApi.getAnalyticsOverview(session),
        adminApi.listAdminTeams(session, { limit: LIMIT }),
      ]);
      setUsers(userRes.items);
      setTeams(
        [...teamRes.items].sort((a, b) => b.memberCount - a.memberCount),
      );
      setGearing({
        total: overviewRes.totalUsers,
        active: overviewRes.activeUsers,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  const filtered = useMemo(
    () => filterUsers(users, { tab, role, status, query }),
    [users, tab, role, status, query],
  );
  const sorted = useMemo(() => sortUsers(filtered, sort), [filtered, sort]);
  const visible = useMemo(() => {
    const from = (page - 1) * pageSize;
    return sorted.slice(from, from + pageSize);
  }, [sorted, page, pageSize]);

  const kpiValues: UserKpiValues = useMemo(
    () => ({
      total: gearing.total,
      active: gearing.active,
      disabled: Math.max(0, gearing.total - gearing.active),
      teams: teams.length,
    }),
    [gearing, teams],
  );

  const resetPage = () => setPage(1);

  const handleCreate = async (input: UserModalSubmit) => {
    setSaving(true);
    setError(null);
    try {
      await adminApi.createAdminUser(session, {
        email: input.email,
        username: input.username,
        password: input.password,
        role: input.role,
      });
      setModalOpen(false);
      notify(`${input.username} created.`);
      void load();
      resetPage();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
      return;
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (input: UserModalSubmit) => {
    if (!editingUser) return;
    setSaving(true);
    setError(null);
    try {
      await adminApi.updateUser(session, editingUser.id, {
        role: input.role,
        isActive: input.isActive,
      });
      setModalOpen(false);
      notify(`${editingUser.username} updated.`);
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
      return;
    } finally {
      setSaving(false);
    }
  };

  const handleCopyEmail = async (u: UserAdminDto) => {
    try {
      await navigator.clipboard.writeText(u.email);
      notify(`Copied ${u.email} to clipboard.`);
    } catch {
      notify("Couldn't access the clipboard.");
    }
  };

  const handleToggleActive = async (u: UserAdminDto) => {
    setSaving(true);
    setError(null);
    try {
      await adminApi.updateUser(session, u.id, { isActive: !u.isActive });
      notify(u.isActive ? `${u.username} disabled.` : `${u.username} enabled.`);
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = (input: UserModalSubmit) => {
    if (editingUser) return handleUpdate(input);
    return handleCreate(input);
  };

  const handleQuick = (action: QuickActionKey) => {
    switch (action) {
      case "export":
        downloadCsv(
          "mobile-ctf-users.csv",
          [
            ["Username", "Email", "Role", "Status", "Solves", "Points", "Joined", "Last Active"],
            ...sorted.map((u) => [
              u.username,
              u.email,
              u.role,
              u.isActive ? "active" : "disabled",
              String(u.solveCount),
              String(u.totalScore),
              u.createdAt,
              u.lastLoginAt ?? "never",
            ]),
          ],
        );
        notify("Exported current users to CSV.");
        break;
      case "audit":
        onNavigate("Audit Log");
        break;
      case "announce":
        onNavigate("Announcements");
        break;
      case "invite":
        notify("Invite emails are wired up when SMTP lands. Until then, use Add User.");
        break;
      case "reset":
        notify("Password resets need email delivery — coming in a later milestone.");
        break;
      case "roles":
        notify("Roles are managed inline from each user's row.");
        break;
    }
  };

  return (
    <div className="usr">
      <div className="page-head">
        <div>
          <div className="breadcrumbs">
            <span>Dashboard</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 6 6 6-6 6" />
            </svg>
            <span className="active">Users</span>
          </div>
          <h1 className="page-title">Users</h1>
          <p className="page-sub">
            Everyone with an account on your platform — manage roles, access and activity.
          </p>
        </div>
        <div className="page-actions">
          <span className="page-quote">“Hackers aren't born, they're registered.”</span>
        </div>
      </div>

      <UserKpis v={kpiValues} users={users} topTeams={teams.slice(0, 8)} />

      {error ? <div className="usr-banner">Failed to load: {error}</div> : null}

      <div className="usr-layout">
        <div className="usr-main">
          <UserTable
            rows={visible}
            total={filtered.length}
            loading={loading}
            empty="No users match the current filters."
            tab={tab}
            onTab={(t) => {
              setTab(t);
              resetPage();
            }}
            query={query}
            onQuery={setQuery}
            role={role}
            onRole={(r) => {
              setRole(r);
              resetPage();
            }}
            status={status}
            onStatus={(s) => {
              setStatus(s);
              resetPage();
            }}
            sort={sort}
            onSort={(s) => {
              setSort(s);
              resetPage();
            }}
            view={view}
            onView={setView}
            page={page}
            pageSize={pageSize}
            onPage={setPage}
            onPageSize={(n) => {
              setPageSize(n);
              resetPage();
            }}
            onAdd={() => {
              setEditingUser(null);
              setModalOpen(true);
            }}
            onEdit={(u) => {
              setEditingUser(u);
              setModalOpen(true);
            }}
            onCopy={(u) => void handleCopyEmail(u)}
            onToggleActive={(u) => void handleToggleActive(u)}
          />
        </div>

        <div className="usr-rail">
          <UserAnalytics
            users={users}
            teams={teams}
            onQuick={(a) => handleQuick(a)}
          />
        </div>
      </div>

      <UserModal
        open={modalOpen}
        user={editingUser}
        saving={saving}
        error={error}
        onSubmit={(input) => handleSubmit(input)}
        onClose={() => setModalOpen(false)}
      />

      {toast ? (
        <div className="usr-toast">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12 4 4L19 6" />
          </svg>
          {toast}
        </div>
      ) : null}
    </div>
  );
}