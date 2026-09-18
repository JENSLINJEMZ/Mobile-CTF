import type {
  EventChallengeDto,
  EventSummaryDto,
  UnlockRuleDto,
} from "@ctf/shared";
import { Text } from "@ctf/ui";
import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  EventLeaderboardRow,
  Session,
} from "../adminApi";
import * as adminApi from "../adminApi";
import { EventCard } from "./events/EventCard";
import {
  EventDetails,
  type EventsSubTab,
} from "./events/EventDetails";
import { EventModal, type EventAdminPayload } from "./events/EventModal";
import { EventKpis, type EventKpiValues } from "./events/EventKpis";
import { matchesEvent, sortEvents, type SortKey } from "./events/sort";
import { ChallengesTab, ParticipantsTab } from "./events/SubTabs";
import { CARET, CHEV_R, QUILL, SEARCH, SLIDERS } from "./events/EventThumbs";
import type { EventCardMeta } from "./events/format";

type TabKey = "all" | "RUNNING" | "SCHEDULED" | "ENDED" | "DRAFT";

const TABS: [TabKey, string][] = [
  ["all", "All Events"],
  ["RUNNING", "Running"],
  ["SCHEDULED", "Scheduled"],
  ["ENDED", "Completed"],
  ["DRAFT", "Drafts"],
];

function toMeta(e: EventSummaryDto): EventCardMeta {
  return {
    id: e.id,
    slug: e.slug,
    title: e.title,
    description: e.description,
    status: e.status,
    startsAt: e.startsAt,
    endsAt: e.endsAt,
    participantCount: e.participantCount,
    teamCount: e.teamCount,
    challengeCount: e.challengeCount ?? 0,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

export function EventsView({ session }: { session: Session }) {
  const [events, setEvents] = useState<EventCardMeta[]>([]);
  const [challengeRows, setChallengeRows] = useState<Record<number, EventChallengeDto[]>>({});
  const [leaderboard, setLeaderboard] = useState<Record<number, EventLeaderboardRow[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [allChallenges, setAllChallenges] = useState<{ id: number; title: string }[]>([]);

  const [tab, setTab] = useState<TabKey>("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [subTab, setSubTab] = useState<EventsSubTab>("overview");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Omit<EventAdminPayload, "id"> | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const items = await adminApi.listAdminEvents(session);
      const challenges = await adminApi.listAllChallenges(session);
      setEvents(items.map(toMeta));
      setAllChallenges(challenges.map((c) => ({ id: c.id, title: c.title })));
      const first = items[0];
      if (first) {
        setSelectedId((prev) =>
          prev != null && items.some((e) => e.id === prev) ? prev : first.id,
        );
      } else {
        setSelectedId(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load events");
    }
  }, [session]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadChallenges = useCallback(
    async (eventId: number) => {
      try {
        const rows = await adminApi.listAdminEventChallenges(session, eventId);
        setChallengeRows((prev) => ({ ...prev, [eventId]: rows }));
      } catch {
        setChallengeRows((prev) => ({ ...prev, [eventId]: [] }));
      }
    },
    [session],
  );

  const loadLeaderboard = useCallback(
    async (eventId: number) => {
      try {
        const data = await adminApi.listEventLeaderboard(session, eventId, "participants", 100);
        setLeaderboard((prev) => ({ ...prev, [eventId]: data.entries }));
      } catch {
        setLeaderboard((prev) => ({ ...prev, [eventId]: [] }));
      }
    },
    [session],
  );

  useEffect(() => {
    if (selectedId != null) {
      void loadChallenges(selectedId);
      void loadLeaderboard(selectedId);
    }
  }, [selectedId, loadChallenges, loadLeaderboard]);

  const filtered = useMemo(() => {
    let rows = events.filter(
      (e) =>
        matchesEvent(e, query) &&
        (tab === "all" || e.status === tab),
    );
    rows = sortEvents(rows, sort);
    return rows;
  }, [events, query, tab, sort]);

  const kpis = useMemo<EventKpiValues>(() => {
    const counts = { total: events.length, running: 0, scheduled: 0, completed: 0, drafts: 0 };
    let participants = 0;
    let challenges = 0;
    for (const e of events) {
      if (e.status === "RUNNING") counts.running++;
      else if (e.status === "SCHEDULED") counts.scheduled++;
      else if (e.status === "ENDED") counts.completed++;
      else counts.drafts++;
      participants += e.participantCount;
      challenges += e.challengeCount;
    }
    return { ...counts, participants, challenges };
  }, [events]);

  const selected = events.find((e) => e.id === selectedId) ?? null;

  const openCreate = useCallback(() => {
    setEditing(null);
    setEditingId(null);
    setModalError(null);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((e: EventCardMeta | EventSummaryDto) => {
    setEditing({
      title: e.title,
      slug: e.slug,
      description: e.description,
      status: e.status,
      startsAt: e.startsAt,
      endsAt: e.endsAt,
    });
    setEditingId(e.id);
    setModalError(null);
    setModalOpen(true);
  }, []);

  const refreshSelected = useCallback(async () => {
    if (selectedId == null) return;
    try {
      const items = await adminApi.listAdminEvents(session);
      const updated = items.map(toMeta);
      setEvents(updated);
      if (selectedId != null) void loadChallenges(selectedId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to refresh");
    }
  }, [session, selectedId, loadChallenges]);

  const save = useCallback(
    async (p: EventAdminPayload) => {
      setSaving(true);
      setModalError(null);
      try {
        if (editingId != null) {
          await adminApi.updateEvent(session, editingId, p);
        } else {
          await adminApi.createEvent(session, p);
        }
        setModalOpen(false);
        setEditing(null);
        setEditingId(null);
        await load();
      } catch (err) {
        setModalError(err instanceof Error ? err.message : "Save failed");
      } finally {
        setSaving(false);
      }
    },
    [session, editingId, load],
  );

  const onDelete = useCallback(
    async (id: number) => {
      if (
        !globalThis.confirm(
          "Delete this event? This cannot be undone.",
        )
      )
        return;
      setBusy(true);
      setError(null);
      try {
        await adminApi.deleteEvent(session, id);
        if (selectedId === id) {
          setSelectedId(null);
          setSubTab("overview");
        }
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Delete failed");
      } finally {
        setBusy(false);
      }
    },
    [session, selectedId, load],
  );

  const onDuplicate = useCallback(
    async (e: EventCardMeta) => {
      setBusy(true);
      setError(null);
      try {
        await adminApi.createEvent(session, {
          title: `${e.title} (copy)`,
          slug: `${e.slug}-copy`,
          description: e.description,
          status: "DRAFT",
          startsAt: e.startsAt,
          endsAt: e.endsAt,
        });
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Duplicate failed");
      } finally {
        setBusy(false);
      }
    },
    [session, load],
  );

  const onAddChallenge = useCallback(
    async (eventId: number, challengeId: number) => {
      setBusy(true);
      setError(null);
      try {
        const rows = challengeRows[eventId] ?? [];
        await adminApi.addEventChallenge(session, eventId, {
          challengeId,
          sortOrder: rows.length,
        });
        await loadChallenges(eventId);
        await refreshSelected();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to add challenge");
      } finally {
        setBusy(false);
      }
    },
    [session, challengeRows, loadChallenges, refreshSelected],
  );

  const onUpdateChallenge = useCallback(
    async (ec: EventChallengeDto, rule: UnlockRuleDto | null) => {
      setBusy(true);
      setError(null);
      try {
        await adminApi.updateEventChallenge(session, ec.id, { unlock: rule });
        if (selectedId != null) await loadChallenges(selectedId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save rule");
      } finally {
        setBusy(false);
      }
    },
    [session, selectedId, loadChallenges],
  );

  const onRemoveChallenge = useCallback(
    async (ec: EventChallengeDto) => {
      setBusy(true);
      setError(null);
      try {
        await adminApi.removeEventChallenge(session, ec.id);
        if (selectedId != null) {
          await loadChallenges(selectedId);
          await refreshSelected();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to remove challenge");
      } finally {
        setBusy(false);
      }
    },
    [session, selectedId, loadChallenges, refreshSelected],
  );

  const subExtra = useMemo(() => {
    if (selected == null) return null;
    const rows = challengeRows[selected.id] ?? [];
    const inEvent = new Set(rows.map((r) => r.challengeId));
    const addable = allChallenges.filter((c) => !inEvent.has(c.id));
    if (subTab === "challenges") {
      return (
        <ChallengesTab
          eventId={selected.id}
          challenges={rows}
          addable={addable}
          busy={busy}
          onAdd={onAddChallenge}
          onUpdate={onUpdateChallenge}
          onRemove={onRemoveChallenge}
        />
      );
    }
    if (subTab === "participants") {
      return (
        <ParticipantsTab
          entries={leaderboard[selected.id] ?? []}
          loading={busy}
          onRefresh={() => void loadLeaderboard(selected.id)}
        />
      );
    }
    if (subTab === "settings") {
      return (
        <div className="evt-subtab">
          <p className="evt-settings-note">
            Edit this event&apos;s details. This opens the same editor used to
            create events.
          </p>
          <button className="evt-edit-btn" onClick={() => openEdit(selected)}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={QUILL} />
            </svg>
            Edit Event
          </button>
        </div>
      );
    }
    return null;
  }, [
    selected,
    subTab,
    challengeRows,
    allChallenges,
    busy,
    onAddChallenge,
    onUpdateChallenge,
    onRemoveChallenge,
    leaderboard,
    loadLeaderboard,
    openEdit,
  ]);

  const quickAction = useCallback(
    (action: string) => {
      switch (action) {
        case "challenges":
          setSubTab("challenges");
          break;
        case "participants":
          setSubTab("participants");
          break;
        case "leaderboard":
          setSubTab("participants");
          break;
        case "edit":
          if (selected) openEdit(selected);
          break;
        case "duplicate":
          if (selected) void onDuplicate(selected);
          break;
        case "delete":
          if (selected) void onDelete(selected.id);
          break;
        default:
          break;
      }
    },
    [selected, openEdit, onDuplicate, onDelete],
  );

  return (
    <div className="evt">
      {/* ---------- page head ---------- */}
      <div className="page-head">
        <div>
          <div className="breadcrumbs">
            <span>Dashboard</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d={CHEV_R} />
            </svg>
            <span className="active">Events</span>
          </div>
          <h1 className="page-title">Events</h1>
          <p className="page-sub">
            Create, schedule and manage CTF events. Control challenges,
            timelines and participant experience.
          </p>
        </div>
        <div className="page-actions">
          <p className="page-quote">
            “Events create moments.
            <br />
            Moments create hackers.”
          </p>
          <button className="btn btn-primary" onClick={openCreate}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Create Event
          </button>
        </div>
      </div>

      {error ? <div className="sbx-error">{error}</div> : null}

      <div className="evt-grid-layout">
        {/* ---------- left column ---------- */}
        <div className="left-col" id="evtList">
          <EventKpis v={kpis} events={events} />

          {/* tabs + filter */}
          <div className="tabs-row">
            <div className="tabs">
              {TABS.map(([key, label]) => (
                <button
                  key={key}
                  className={`tab${tab === key ? " is-active" : ""}`}
                  onClick={() => setTab(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="tabs-actions">
              <label className="filter-search-sm">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={SEARCH} />
                </svg>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search events..."
                />
              </label>
              <label className="filter-select evt-sort-select">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortKey)}
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="participants">Most Participants</option>
                  <option value="challenges">Most Challenges</option>
                </select>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d={CARET} />
                </svg>
              </label>
              <button className="filter-btn" onClick={() => setQuery("")}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={SLIDERS} />
                </svg>
                Reset
              </button>
            </div>
          </div>

          {/* event list */}
          <div className="event-list">
            {filtered.length === 0 ? (
              <div className="evt-empty">
                {events.length === 0
                  ? "No events yet. Create your first event to get started."
                  : "No events match the current filter."}
              </div>
            ) : (
              filtered.map((e) => (
                <EventCard
                  key={e.id}
                  event={e}
                  selected={e.id === selectedId}
                  onSelect={(id) => {
                    setSelectedId(id);
                    setSubTab("overview");
                  }}
                />
              ))
            )}
          </div>

          {/* footer */}
          <div className="footer">
            <span>“Capture Knowledge. Release Potential.”</span>
            <div className="footer-brand">
              <svg className="fm-logo" viewBox="0 0 40 28" fill="none">
                <defs>
                  <linearGradient id="evt-foot-grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#c4b5fd" />
                    <stop offset="55%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#6d28d9" />
                  </linearGradient>
                </defs>
                <path d="M2 26 L12 2 L20 13.5 L28 2 L38 26 L29 26 L24.5 15.5 L20 22 L15.5 15.5 L11 26 Z" fill="url(#evt-foot-grad)" />
              </svg>
              <b>Mobile CTF</b>
              <span className="sep"></span>
              <span>Admin Console</span>
            </div>
          </div>
        </div>

        {/* ---------- right column ---------- */}
        <div className="right-col">
          {selected ? (
            <EventDetails
              event={selected}
              challenges={challengeRows[selected.id] ?? []}
              subTab={subTab}
              onSubTab={setSubTab}
              onEdit={() => openEdit(selected)}
              onQuickAction={quickAction}
              extra={subExtra}
            />
          ) : (
            <div className="panel evt-empty-panel">
              <Text tone="secondary" size="sm">
                Select an event to manage its challenges, participants and
                settings.
              </Text>
            </div>
          )}
        </div>
      </div>

      <EventModal
        open={modalOpen}
        editing={editing}
        busy={saving}
        error={modalError}
        onClose={() => setModalOpen(false)}
        onSave={(p) => void save(p)}
      />
    </div>
  );
}