import type {
  AnnouncementAdminListResult,
  AnnouncementAdminRowDto,
  AnnouncementOverviewDto,
} from "@ctf/shared";
import { useCallback, useEffect, useRef, useState } from "react";

import type { Session } from "../adminApi";
import * as adminApi from "../adminApi";
import { AnnouncementForm, type AnnouncementDraft } from "./announcements/AnnouncementForm";
import { AnnouncementKpis } from "./announcements/AnnouncementKpis";
import { AnnouncementRail } from "./announcements/AnnouncementRail";
import { AnnouncementTable } from "./announcements/AnnouncementTable";
import { CARET, PLUS, SEARCH, SLIDERS, SVG, CHECK } from "./teams/TeamIcons";

const PAGE_SIZE = 10;
const EMPTY_DRAFT: AnnouncementDraft = { title: "", body: "", pinned: false };

type TabKey = "all" | "pinned" | "recent";

export function AnnouncementsView({ session }: { session: Session }) {
  const [overview, setOverview] = useState<AnnouncementOverviewDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [result, setResult] = useState<AnnouncementAdminListResult>({
    items: [],
    meta: { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1, hasNext: false, hasPrev: false },
  });
  const [rowsLoading, setRowsLoading] = useState(false);
  const [page, setPage] = useState(1);

  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<TabKey>("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");

  const [draft, setDraft] = useState<AnnouncementDraft>(EMPTY_DRAFT);
  const [editing, setEditing] = useState<AnnouncementAdminRowDto | null>(null);
  const [busy, setBusy] = useState(false);
  const [focusKey, setFocusKey] = useState(0);

  const [toast, setToast] = useState<string | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOverview(await adminApi.getAnnouncementOverview(session));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load announcements");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    setPage(1);
  }, [query, tab, sort]);

  const loadRows = useCallback(async () => {
    setRowsLoading(true);
    try {
      const res = await adminApi.listAdminAnnouncements(session, {
        page,
        limit: PAGE_SIZE,
        search: query.trim().length > 0 ? query.trim() : undefined,
        pinned: tab === "pinned" ? true : undefined,
        recent: tab === "recent" ? true : undefined,
        sort,
      });
      setResult(res);
      setPage(res.meta.page);
    } catch {
      setResult({
        items: [],
        meta: { page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1, hasNext: false, hasPrev: false },
      });
    } finally {
      setRowsLoading(false);
    }
  }, [session, page, query, tab, sort]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadOverview(), loadRows()]);
  }, [loadOverview, loadRows]);

  const focusForm = useCallback(() => {
    setFocusKey((k) => k + 1);
    window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }, []);

  const handleNew = useCallback(() => {
    setEditing(null);
    setDraft({ ...EMPTY_DRAFT });
    setError(null);
    focusForm();
  }, [focusForm]);

  const handleEdit = useCallback(
    (row: AnnouncementAdminRowDto) => {
      setEditing(row);
      setDraft({ title: row.title, body: row.body, pinned: row.pinned });
      setError(null);
      focusForm();
    },
    [focusForm],
  );

  const handleCopy = useCallback(
    async (row: AnnouncementAdminRowDto) => {
      const text = `${row.title}\n\n${row.body}`;
      try {
        await navigator.clipboard.writeText(text);
        notify(`Copied announcement #${row.id} to clipboard.`);
      } catch {
        notify("Could not copy to clipboard.");
      }
    },
    [notify],
  );

  const handleDelete = useCallback(
    async (row: AnnouncementAdminRowDto) => {
      if (!window.confirm(`Delete announcement "${row.title}"? This cannot be undone.`)) return;
      setBusy(true);
      setError(null);
      try {
        await adminApi.deleteAnnouncement(session, row.id);
        if (editing?.id === row.id) {
          setEditing(null);
          setDraft({ ...EMPTY_DRAFT });
        }
        await refreshAll();
        notify(`Announcement #${row.id} deleted.`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete announcement");
      } finally {
        setBusy(false);
      }
    },
    [session, editing, refreshAll, notify],
  );

  const handleSubmit = useCallback(async () => {
    if (busy || !draft.title.trim() || !draft.body.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const payload: adminApi.AnnouncementPayload = {
        title: draft.title.trim(),
        body: draft.body.trim(),
        pinned: draft.pinned,
      };
      if (editing) {
        await adminApi.updateAnnouncement(session, editing.id, payload);
        notify(`Announcement #${editing.id} updated.`);
      } else {
        await adminApi.createAnnouncement(session, payload);
        notify("Announcement published.");
      }
      setEditing(null);
      setDraft({ ...EMPTY_DRAFT });
      await refreshAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish announcement");
    } finally {
      setBusy(false);
    }
  }, [busy, draft, editing, session, refreshAll, notify]);

  const handleReset = useCallback(() => {
    setEditing(null);
    setDraft({ ...EMPTY_DRAFT });
    setError(null);
    setFocusKey((k) => k + 1);
  }, []);

  const tabs: { key: TabKey; label: string }[] = [
    { key: "all", label: "All Announcements" },
    { key: "pinned", label: "Pinned" },
    { key: "recent", label: "Recent" },
  ];

  return (
    <div className="an">
      <div className="page-head">
        <div>
          <div className="breadcrumbs">
            <span>Dashboard</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 6 6 6-6 6" />
            </svg>
            <span className="active">Announcements</span>
          </div>
          <h1 className="page-title">Announcements</h1>
          <p className="page-sub">
            Keep your community informed. Share updates, rules, maintenance notices, and more.
          </p>
        </div>
        <div className="page-actions">
          <p className="an-page-quote">"Information today.<br />Innovators tomorrow."</p>
          <button className="btn btn-primary" type="button" onClick={handleNew}>
            <SVG d={PLUS} size={13} />
            New Announcement
          </button>
        </div>
      </div>

      {error ? <div className="an-banner">Failed to load announcements: {error}</div> : null}

      {loading && !overview ? (
        <div className="an-loading">Loading announcements…</div>
      ) : overview ? (
        <div className="an-grid" ref={formRef}>
          <div className="left-col">
            <AnnouncementKpis kpis={overview.kpis} />

            <div className="tabs-row">
              <div className="tabs">
                {tabs.map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    className={`tab${tab === t.key ? " is-active" : ""}`}
                    onClick={() => setTab(t.key)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <span className="an-clip-count">
                {result.meta.total.toLocaleString("en-US")} announcement
                {result.meta.total === 1 ? "" : "s"}
              </span>
            </div>

            <div className="filter-bar">
              <label className="filter-search">
                <SVG d={SEARCH} size={14} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search announcements..."
                />
              </label>
              <label className="filter-select">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as "newest" | "oldest")}
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
                <SVG d={CARET} size={11} />
              </label>
              <button className="filter-btn" type="button" onClick={() => notify("Filters applied.")}>
                <SVG d={SLIDERS} size={13} />
                Filter
              </button>
            </div>

            <AnnouncementTable
              items={result.items}
              meta={result.meta}
              page={page}
              pageSize={PAGE_SIZE}
              loading={rowsLoading}
              onPage={setPage}
              onEdit={handleEdit}
              onCopy={(row) => void handleCopy(row)}
              onDelete={(row) => void handleDelete(row)}
            />

            <div className="an-footer">
              <span>"Communicate clearly. Compete fairly. Grow together."</span>
              <div className="an-footer-brand">
                <b>Mobile CTF</b>
                <span className="sep" />
                <span>Admin Console</span>
                <span className="sep" />
                <span>v2.1.0</span>
              </div>
            </div>
          </div>

          <div className="right-col">
            <AnnouncementForm
              editing={editing}
              value={draft}
              busy={busy}
              focusKey={focusKey}
              onChange={setDraft}
              onSubmit={() => void handleSubmit()}
              onCancel={handleReset}
              onReset={handleNew}
            />
            <AnnouncementRail overview={overview} />
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="sub-toast">
          <SVG d={CHECK} size={14} />
          {toast}
        </div>
      ) : null}
    </div>
  );
}