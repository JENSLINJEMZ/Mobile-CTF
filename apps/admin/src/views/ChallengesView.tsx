import type {
  AuditLogDto,
  ChallengeSummaryDto,
  Difficulty,
} from "@ctf/shared";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { Session } from "../adminApi";
import * as adminApi from "../adminApi";
import {
  ChallengeModal,
  type ChallengeAdminPayload,
  type EditingChallenge,
} from "./challenges/ChallengeModal";
import { CategoriesPanel } from "./challenges/CategoriesPanel";
import { ChallengesGrid } from "./challenges/ChallengesGrid";
import { ChallengesTable } from "./challenges/ChallengesTable";
import {
  DIFF_LABEL,
  exportChallengesCsv,
  matchesQuery,
} from "./challenges/format";
import { KpiCards } from "./challenges/KpiCards";
import { QuickActions } from "./challenges/QuickActions";
import { RecentActivity } from "./challenges/RecentActivity";

type ViewMode = "list" | "grid";
type SortKey = "newest" | "oldest" | "solves" | "points";
type StatusKey = "all" | "published" | "draft";

interface Filters {
  cat: string;
  diff: string;
  status: StatusKey;
  sort: SortKey;
}

const PER_PAGE = 10;

function sortRows(rows: ChallengeSummaryDto[], sort: SortKey) {
  const copy = [...rows];
  switch (sort) {
    case "newest":
      copy.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      break;
    case "oldest":
      copy.sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
      break;
    case "solves":
      copy.sort((a, b) => b.solvedCount - a.solvedCount);
      break;
    case "points":
      copy.sort((a, b) => b.basePoints - a.basePoints);
      break;
    default:
      break;
  }
  return copy;
}

export function ChallengesView({ session }: { session: Session }) {
  const [challenges, setChallenges] = useState<ChallengeSummaryDto[]>([]);
  const [categories, setCategories] = useState<
    ChallengeSummaryDto["category"][]
  >([]);
  const [activity, setActivity] = useState<AuditLogDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busySet, setBusySet] = useState<Set<number>>(new Set());

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>({
    cat: "all",
    diff: "all",
    status: "all",
    sort: "newest",
  });
  const [page, setPage] = useState(1);
  const [view, setView] = useState<ViewMode>("list");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<EditingChallenge | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [list, cats, log] = await Promise.all([
        adminApi.listAdminChallenges(session),
        adminApi.listCategories(session),
        adminApi.listAuditLog(session, { limit: 100 }),
      ]);
      setChallenges(list.items);
      setCategories(cats);
      setActivity(
        log.items.filter(
          (a) =>
            a.entityType === "challenge" || a.action.startsWith("challenge."),
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load challenges");
    }
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  const markBusy = useCallback((id: number, on: boolean) => {
    setBusySet((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }, []);

  const filtered = useMemo(() => {
    let rows = challenges.filter(
      (c) =>
        matchesQuery(c, query) &&
        (filters.cat === "all" || c.category.slug === filters.cat) &&
        (filters.diff === "all" || c.difficulty === filters.diff) &&
        (filters.status === "all" ||
          (filters.status === "published" ? c.published : !c.published)),
    );
    rows = sortRows(rows, filters.sort);
    return rows;
  }, [challenges, query, filters]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, pageCount);
  const pageRows = useMemo(
    () => filtered.slice((safePage - 1) * PER_PAGE, safePage * PER_PAGE),
    [filtered, safePage],
  );

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const kpis = useMemo(
    () => ({
      total: challenges.length,
      published: challenges.filter((c) => c.published).length,
      drafts: challenges.filter((c) => !c.published).length,
      categories: categories.length,
      solves: challenges.reduce((acc, c) => acc + c.solvedCount, 0),
      points: challenges.reduce((acc, c) => acc + c.basePoints, 0),
    }),
    [challenges, categories],
  );

  const openCreate = useCallback(() => {
    setEditing(null);
    setModalError(null);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback(
    async (c: ChallengeSummaryDto) => {
      setModalError(null);
      try {
        const detail = await adminApi.getChallengeDetail(session, c.id);
        setEditing({ ...c, description: detail.description });
        setModalOpen(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load challenge");
      }
    },
    [session],
  );

  const closeModal = useCallback(() => {
    if (saving) return;
    setModalOpen(false);
    setEditing(null);
    setModalError(null);
  }, [saving]);

  const save = useCallback(
    async (p: ChallengeAdminPayload) => {
      setSaving(true);
      setModalError(null);
      try {
        if (editing) {
          await adminApi.updateChallenge(session, editing.id, p);
        } else {
          await adminApi.createChallenge(session, p);
        }
        setModalOpen(false);
        setEditing(null);
        await load();
      } catch (err) {
        setModalError(err instanceof Error ? err.message : "Save failed");
      } finally {
        setSaving(false);
      }
    },
    [session, editing, load],
  );

  const togglePublish = useCallback(
    async (c: ChallengeSummaryDto) => {
      if (busySet.has(c.id)) return;
      markBusy(c.id, true);
      setError(null);
      try {
        const detail = await adminApi.getChallengeDetail(session, c.id);
        await adminApi.updateChallenge(session, c.id, {
          title: c.title,
          slug: c.slug,
          description: detail.description,
          categoryId: c.category.id,
          difficulty: c.difficulty,
          basePoints: c.basePoints,
          published: !c.published,
        });
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to toggle publish");
      } finally {
        markBusy(c.id, false);
      }
    },
    [session, load, busySet, markBusy],
  );

  const duplicate = useCallback(
    async (c: ChallengeSummaryDto) => {
      if (busySet.has(c.id)) return;
      markBusy(c.id, true);
      setError(null);
      try {
        const detail = await adminApi.getChallengeDetail(session, c.id);
        await adminApi.createChallenge(session, {
          title: `${c.title} (copy)`,
          slug: `${c.slug}-copy`,
          description: detail.description,
          categoryId: c.category.id,
          difficulty: c.difficulty,
          basePoints: c.basePoints,
          published: false,
        });
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Duplicate failed");
      } finally {
        markBusy(c.id, false);
      }
    },
    [session, load, busySet, markBusy],
  );

  const remove = useCallback(
    async (c: ChallengeSummaryDto) => {
      if (busySet.has(c.id)) return;
      if (
        !globalThis.confirm(
          `Delete challenge "${c.title}"? This cannot be undone.`,
        )
      )
        return;
      markBusy(c.id, true);
      setError(null);
      try {
        await adminApi.deleteChallenge(session, c.id);
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed");
      } finally {
        markBusy(c.id, false);
      }
    },
    [session, load, busySet, markBusy],
  );

  return (
    <div className="chx">
      {/* ---------- page head ---------- */}
      <div className="page-head">
        <div>
          <div className="breadcrumbs">
            <span>Dashboard</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 6 6 6-6 6" />
            </svg>
            <span className="active">Challenges</span>
          </div>
          <h1 className="page-title">Challenges</h1>
          <p className="page-sub">
            Create, manage and organize challenges for events. Build unique experiences
            for players.
          </p>
        </div>
        <div className="page-actions">
          <p className="page-quote">“Good challenges create better hackers.”</p>
          <button className="btn btn-primary" onClick={openCreate}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Create Challenge
          </button>
        </div>
      </div>

      {error ? <div className="sbx-error">{error}</div> : null}

      <div className="chx-grid-layout">
        {/* ---------- left column ---------- */}
        <div className="left-col">
          <KpiCards v={kpis} challenges={challenges} categories={categories} />

          {/* filter bar */}
          <div className="filter-bar chx-filter-bar">
            <label className="filter-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m20.5 20.5-3.6-3.6" />
              </svg>
              <input
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search challenges, categories or tags…"
              />
            </label>

            <label className="filter-select chx-filter-select">
              <select
                value={filters.cat}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, cat: e.target.value }));
                  setPage(1);
                }}
              >
                <option value="all">All Categories</option>
                {[...categories]
                  .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                  .map((c) => (
                    <option key={c.id} value={c.slug}>
                      {c.name}
                    </option>
                  ))}
              </select>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </label>

            <label className="filter-select chx-filter-select">
              <select
                value={filters.diff}
                onChange={(e) => {
                  setFilters((f) => ({ ...f, diff: e.target.value }));
                  setPage(1);
                }}
              >
                <option value="all">All Difficulties</option>
                {(Object.keys(DIFF_LABEL) as Difficulty[]).map((d) => (
                  <option key={d} value={d}>
                    {DIFF_LABEL[d]}
                  </option>
                ))}
              </select>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </label>

            <label className="filter-select chx-filter-select">
              <select
                value={filters.status}
                onChange={(e) => {
                  setFilters((f) => ({
                    ...f,
                    status: e.target.value as StatusKey,
                  }));
                  setPage(1);
                }}
              >
                <option value="all">All Status</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
              </select>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </label>

            <label className="filter-select chx-filter-select">
              <select
                value={filters.sort}
                onChange={(e) =>
                  setFilters((f) => ({
                    ...f,
                    sort: e.target.value as SortKey,
                  }))
                }
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="solves">Most Solved</option>
                <option value="points">Highest Points</option>
              </select>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </label>

            <button
              className="filter-btn"
              onClick={() => {
                setQuery("");
                setFilters({ cat: "all", diff: "all", status: "all", sort: "newest" });
                setPage(1);
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 5h18M6 12h12M10 19h4" />
              </svg>
              Clear
            </button>

            <div className="view-toggle">
              <button
                className={view === "list" ? "is-active" : ""}
                aria-label="List view"
                title="List view"
                onClick={() => setView("list")}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <button
                className={view === "grid" ? "is-active" : ""}
                aria-label="Grid view"
                title="Grid view"
                onClick={() => setView("grid")}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1.8" />
                  <rect x="14" y="3" width="7" height="7" rx="1.8" />
                  <rect x="3" y="14" width="7" height="7" rx="1.8" />
                  <rect x="14" y="14" width="7" height="7" rx="1.8" />
                </svg>
              </button>
            </div>
          </div>

          <div className="export-row">
            <button
              className="btn-export"
              onClick={() => exportChallengesCsv(filtered)}
              disabled={filtered.length === 0}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3.5v11" />
                <path d="m7 10 5 5 5-5" />
                <path d="M5 19.5h14" />
              </svg>
              Export ({filtered.length})
            </button>
          </div>

          {view === "list" ? (
            <ChallengesTable
              rows={pageRows}
              start={(safePage - 1) * PER_PAGE}
              onEdit={(c) => void openEdit(c)}
              onDuplicate={(c) => void duplicate(c)}
              onDelete={(c) => void remove(c)}
              onToggle={(c) => void togglePublish(c)}
              busy={busySet}
            />
          ) : (
            <ChallengesGrid
              rows={pageRows}
              onEdit={(c) => void openEdit(c)}
              onToggle={(c) => void togglePublish(c)}
            />
          )}

          {/* pagination */}
          <div className="pagination">
            <div className="page-info">
              Showing{" "}
              <b>
                {filtered.length === 0 ? 0 : (safePage - 1) * PER_PAGE + 1}
              </b>{" "}
              to <b>{Math.min(safePage * PER_PAGE, filtered.length)}</b> of{" "}
              <b>{filtered.length}</b> challenges
            </div>
            <div className="page-controls">
              <button
                className="page-btn"
                aria-label="Previous"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </button>
              {Array.from({ length: pageCount }, (_, i) => i + 1)
                .filter((p) => p <= 7 || Math.abs(p - safePage) <= 1)
                .map((p) => (
                  <button
                    key={p}
                    className={`page-btn${p === safePage ? " is-active" : ""}`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                ))}
              <button
                className="page-btn"
                aria-label="Next"
                disabled={safePage >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </button>
            </div>
            <div className="per-page">
              {PER_PAGE} per page
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
          </div>
        </div>

        {/* ---------- right column ---------- */}
        <div className="right-col">
          <QuickActions onNew={openCreate} onTemplate={openCreate} />
          <CategoriesPanel
            categories={categories}
            challenges={challenges}
            activeSlug={filters.cat === "all" ? null : filters.cat}
            onPick={(slug) => {
              setFilters((f) => ({ ...f, cat: slug ?? "all" }));
              setPage(1);
            }}
          />
          <RecentActivity items={activity} />
        </div>
      </div>

      <ChallengeModal
        open={modalOpen}
        editing={editing}
        categories={categories}
        busy={saving}
        error={modalError}
        onClose={closeModal}
        onSave={(p) => void save(p)}
      />
    </div>
  );
}