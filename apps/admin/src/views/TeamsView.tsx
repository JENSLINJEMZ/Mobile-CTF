import type {
  TeamAdminDetailDto,
  TeamAdminDto,
} from "@ctf/shared";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { Session } from "../adminApi";
import * as adminApi from "../adminApi";
import { TeamDetail } from "./teams/TeamDetail";
import { TeamKpis, type TeamKpiValues } from "./teams/TeamKpis";
import { TeamModal, type TeamModalSubmit } from "./teams/TeamModal";
import { TeamTable } from "./teams/TeamTable";
import {
  type TeamSortKey,
  type TeamStatusKey,
  type TeamTabKey,
  TABS,
  SORT_OPTIONS,
  STATUS_OPTIONS,
  filterTeams,
  sortTeams,
} from "./teams/format";
import { PLUS, SEARCH, SVG } from "./teams/TeamIcons";

const LIMIT = 100;

export function TeamsView({ session }: { session: Session }) {
  const [teams, setTeams] = useState<TeamAdminDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [tab, setTab] = useState<TeamTabKey>("all");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<TeamStatusKey>("all");
  const [sort, setSort] = useState<TeamSortKey>("points");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<TeamAdminDetailDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TeamAdminDto | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.listAdminTeams(session, { limit: LIMIT });
      setTeams(res.items);
      setTotal(res.meta.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load teams");
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

  const refreshSelected = useCallback(async () => {
    if (selectedId === null) return;
    setDetailLoading(true);
    setDetailError(null);
    try {
      setDetail(await adminApi.getAdminTeamDetail(session, selectedId));
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : "Failed to load team");
    } finally {
      setDetailLoading(false);
    }
  }, [session, selectedId]);

  const handleSelect = useCallback(
    (team: TeamAdminDto) => {
      setSelectedId(team.id);
      if (detail?.team.id === team.id) return;
      setDetailLoading(true);
      setDetailError(null);
      adminApi
        .getAdminTeamDetail(session, team.id)
        .then((d) => setDetail(d))
        .catch((err) =>
          setDetailError(err instanceof Error ? err.message : "Failed to load team"),
        )
        .finally(() => setDetailLoading(false));
    },
    [session, detail],
  );

  const resetPage = () => setPage(1);

  const filtered = useMemo(
    () => filterTeams(teams, { tab, status, query }),
    [teams, tab, status, query],
  );
  const sorted = useMemo(() => sortTeams(filtered, sort), [filtered, sort]);
  const visible = useMemo(() => {
    const from = (page - 1) * pageSize;
    return sorted.slice(from, from + pageSize);
  }, [sorted, page, pageSize]);

  const kpi: TeamKpiValues = useMemo(
    () => ({
      total,
      members: teams.reduce((acc, t) => acc + t.memberCount, 0),
      active: teams.filter((t) => t.status === "active").length,
      top: teams.filter((t) => t.points >= 1000).length,
    }),
    [total, teams],
  );

  const handleSubmit = async (input: TeamModalSubmit) => {
    setSaving(true);
    setError(null);
    setDetailError(null);
    try {
      if (editing) {
        const updated = await adminApi.updateAdminTeam(session, editing.id, {
          name: input.name,
          description: input.description,
        });
        setModalOpen(false);
        notify(`${updated.name} updated.`);
      } else {
        const created = await adminApi.createAdminTeam(session, {
          name: input.name,
          description: input.description,
        });
        setModalOpen(false);
        notify(`${created.name} created.`);
        await load();
        handleSelect(created);
        resetPage();
        return;
      }
      await load();
      await refreshSelected();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save team");
      return;
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (team: TeamAdminDto) => {
    if (!globalThis.confirm(`Delete "${team.name}"? This can't be undone.`)) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await adminApi.deleteAdminTeam(session, team.id);
      notify(`${team.name} deleted.`);
      if (selectedId === team.id) {
        setSelectedId(null);
        setDetail(null);
      }
      await load();
      resetPage();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setSaving(false);
    }
  };

  const handleView = (team: TeamAdminDto) => {
    notify(`Public team page for ${team.name} arrives in a later milestone.`);
  };

  const handleManage = (team: TeamAdminDto) => {
    notify(`Member management for ${team.name} arrives in a later milestone.`);
  };

  return (
    <div className="tm">
      <div className="page-head">
        <div>
          <div className="breadcrumbs">
            <span>Dashboard</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 6 6 6-6 6" />
            </svg>
            <span className="active">Teams</span>
          </div>
          <h1 className="page-title">Teams</h1>
          <p className="page-sub">
            Manage teams, members, and team settings. Build a stronger CTF community.
          </p>
        </div>
        <div className="page-actions">
          <button
            className="btn btn-primary"
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <SVG d={PLUS} size={13} />
            New Team
          </button>
        </div>
      </div>

      <TeamKpis teams={teams} v={kpi} />

      {error ? <div className="tm-banner">Failed to load teams: {error}</div> : null}

      <div className="tm-grid">
        <div className="tm-main">
          <div className="tm-toolbar">
            <div className="tabs">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  className={`tab${tab === t.key ? " is-active" : ""}`}
                  onClick={() => {
                    setTab(t.key);
                    resetPage();
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="tm-toolbar-right">
              <label className="tm-search">
                <SVG d={SEARCH} size={13} />
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    resetPage();
                  }}
                  placeholder="Search teams, members, codes…"
                />
              </label>
              <label className="tm-select">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M6 12h12M10 18h4" />
                </svg>
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value as TeamStatusKey);
                    resetPage();
                  }}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="tm-select">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12h10M18 12h2M14 8l-2 4 2 4" />
                </svg>
                <select
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value as TeamSortKey);
                    resetPage();
                  }}
                >
                  {SORT_OPTIONS.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <TeamTable
            teams={visible}
            total={filtered.length}
            page={page}
            pageSize={pageSize}
            selectedId={selectedId}
            loading={loading}
            onPage={setPage}
            onSelect={(t) => handleSelect(t)}
            onEdit={(t) => {
              setEditing(t);
              setModalOpen(true);
            }}
            onDelete={(t) => void handleDelete(t)}
          />
        </div>

        <TeamDetail
          detail={detail}
          loading={detailLoading}
          error={detailError}
          onEdit={(t) => {
            setEditing(t);
            setModalOpen(true);
          }}
          onView={(t) => handleView(t)}
          onManage={(t) => handleManage(t)}
          onRetry={() => void refreshSelected()}
        />
      </div>

      <TeamModal
        open={modalOpen}
        team={editing}
        saving={saving}
        error={error}
        onSubmit={(input) => void handleSubmit(input)}
        onClose={() => setModalOpen(false)}
      />

      {toast ? (
        <div className="tm-toast">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12 4 4L19 6" />
          </svg>
          {toast}
        </div>
      ) : null}
    </div>
  );
}