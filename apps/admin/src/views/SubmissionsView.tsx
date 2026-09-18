import type {
  SubmissionAdminRowDto,
  SubmissionOverviewDto,
  SubmissionResultKey,
} from "@ctf/shared";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { Session } from "../adminApi";
import * as adminApi from "../adminApi";
import { SubmissionKpis } from "./submissions/SubmissionKpis";
import { SubmissionTable } from "./submissions/SubmissionTable";
import { SubmissionPanels } from "./submissions/SubmissionPanels";
import { SubmissionRail } from "./submissions/SubmissionRail";
import { CARET, SEARCH, SLIDERS, SVG } from "./teams/TeamIcons";

const PAGE_SIZE = 10;

export function SubmissionsView({ session }: { session: Session }) {
  const [overview, setOverview] = useState<SubmissionOverviewDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [items, setItems] = useState<SubmissionAdminRowDto[]>([]);
  const [total, setTotal] = useState(0);
  const [rowsLoading, setRowsLoading] = useState(false);
  const [page, setPage] = useState(1);

  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SubmissionResultKey>("all");
  const [challengeId, setChallengeId] = useState<number | undefined>(undefined);
  const [userId, setUserId] = useState<number | undefined>(undefined);
  const [teamId, setTeamId] = useState<number | undefined>(undefined);

  const [toast, setToast] = useState<string | null>(null);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOverview(await adminApi.getSubmissionOverview(session));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load submissions");
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const debouncedQuery = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, result, challengeId, userId, teamId]);

  const loadRows = useCallback(async () => {
    setRowsLoading(true);
    try {
      const res = await adminApi.listAdminSubmissions(session, {
        page,
        limit: PAGE_SIZE,
        search: debouncedQuery.length > 0 ? debouncedQuery : undefined,
        result,
        challengeId,
        userId,
        teamId,
      });
      setItems(res.items);
      setTotal(res.meta.total);
    } catch {
      setItems([]);
      setTotal(0);
    } finally {
      setRowsLoading(false);
    }
  }, [session, page, debouncedQuery, result, challengeId, userId, teamId]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const handleView = (row: SubmissionAdminRowDto) => {
    notify(`Submission #${row.id} context arrives in a later milestone.`);
  };

  const options = overview?.filters;

  return (
    <div className="sub">
      <div className="page-head">
        <div>
          <div className="breadcrumbs">
            <span>Dashboard</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 6 6 6-6 6" />
            </svg>
            <span className="active">Submissions</span>
          </div>
          <h1 className="page-title">Submissions</h1>
          <p className="page-sub">
            View and analyze all flag submissions. Monitor attempts, correct solves, and user activity.
          </p>
        </div>
        <div className="page-actions">
          <p className="page-quote">"Some try. Few persist.<br />Legends submit."</p>
        </div>
      </div>

      {error ? <div className="sub-banner">Failed to load submissions: {error}</div> : null}

      {loading && !overview ? (
        <div className="sub-loading">Loading submissions…</div>
      ) : overview ? (
        <div className="sub-grid">
          <div className="left-col">
            <SubmissionKpis kpis={overview.kpis} byDay={overview.byDay} />

            <div className="filter-bar">
              <label className="filter-search">
                <SVG d={SEARCH} size={14} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by user, challenge, flag…"
                />
              </label>
              <label className="filter-select">
                <select
                  value={challengeId ?? ""}
                  onChange={(e) =>
                    setChallengeId(e.target.value ? Number(e.target.value) : undefined)
                  }
                >
                  <option value="">All Challenges</option>
                  {options?.challenges.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
                <SVG d={CARET} size={11} />
              </label>
              <label className="filter-select">
                <select
                  value={userId ?? ""}
                  onChange={(e) =>
                    setUserId(e.target.value ? Number(e.target.value) : undefined)
                  }
                >
                  <option value="">All Users</option>
                  {options?.users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.label}
                    </option>
                  ))}
                </select>
                <SVG d={CARET} size={11} />
              </label>
              <label className="filter-select">
                <select
                  value={teamId ?? ""}
                  onChange={(e) =>
                    setTeamId(e.target.value ? Number(e.target.value) : undefined)
                  }
                >
                  <option value="">All Teams</option>
                  {options?.teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <SVG d={CARET} size={11} />
              </label>
              <label className="filter-select">
                <select
                  value={result}
                  onChange={(e) => setResult(e.target.value as SubmissionResultKey)}
                >
                  <option value="all">All Results</option>
                  <option value="correct">Correct</option>
                  <option value="incorrect">Incorrect</option>
                </select>
                <SVG d={CARET} size={11} />
              </label>
              <button className="filter-btn" type="button" onClick={() => notify("Filters applied.")}>
                <SVG d={SLIDERS} size={13} />
                Filter
              </button>
            </div>

            <SubmissionTable
              items={items}
              total={total}
              page={page}
              pageSize={PAGE_SIZE}
              loading={rowsLoading}
              onPage={setPage}
              onView={handleView}
            />

            <div className="sub-bottom-row-wrap">
              <SubmissionPanels overview={overview} />
            </div>
          </div>

          <SubmissionRail overview={overview} />
        </div>
      ) : null}

      {toast ? (
        <div className="sub-toast">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="m5 12 4 4L19 6" />
          </svg>
          {toast}
        </div>
      ) : null}
    </div>
  );
}