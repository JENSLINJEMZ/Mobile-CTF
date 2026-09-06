import type {
  EventChallengeDto,
  EventSummaryDto,
  UnlockRuleDto,
  UnlockRuleType,
} from "@ctf/shared";
import { Badge, Button, Card, Text } from "@ctf/ui";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { Session } from "../adminApi";
import * as adminApi from "../adminApi";

const inputStyle: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  fontSize: 14,
  boxSizing: "border-box",
};

function field(
  label: string,
  key: string,
  props?: React.InputHTMLAttributes<HTMLInputElement>,
) {
  return { label, key, props };
}

const EVENT_FIELDS = [
  field("Title", "title", { placeholder: "CTF Summer Sprint" }),
  field("Slug", "slug", { placeholder: "ctf-summer-sprint" }),
  field("Starts at (local)", "startsAt", { type: "datetime-local" }),
  field("Ends at (local)", "endsAt", { type: "datetime-local" }),
];

function eventBadgeTone(
  status: EventSummaryDto["status"],
): "success" | "danger" | "neutral" | "info" {
  switch (status) {
    case "RUNNING":
      return "success";
    case "ENDED":
      return "danger";
    case "SCHEDULED":
      return "info";
    default:
      return "neutral";
  }
}

const RULE_LABELS: Record<string, string> = {
  ALWAYS: "Always (no gate)",
  TIME: "Unlock at time",
  PREREQUISITE: "Requires challenge",
  SCORE: "Requires score",
};

function toLocalInput(value?: string): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
}

function fromLocalInput(value: string): string {
  return new Date(value).toISOString();
}

interface RuleEditorProps {
  rule: UnlockRuleDto | null;
  candidates: EventChallengeDto[];
  onSave: (rule: UnlockRuleDto | null) => void;
  busy: boolean;
}

function RuleEditor({ rule, candidates, onSave, busy }: RuleEditorProps) {
  const [type, setType] = useState<UnlockRuleType>(rule?.type ?? "ALWAYS");
  const [unlockAt, setUnlockAt] = useState(
    rule?.unlockAt ? toLocalInput(rule.unlockAt) : "",
  );
  const [requireChallengeIds, setRequireChallengeIds] = useState<number[]>(
    rule?.requireChallengeIds ?? [],
  );
  const [minScore, setMinScore] = useState<string>(
    rule?.minScore != null ? String(rule.minScore) : "",
  );

  const build = useCallback((): UnlockRuleDto | null => {
    if (type === "ALWAYS") return null;
    if (type === "TIME") {
      if (!unlockAt) return null;
      return { type, unlockAt: fromLocalInput(unlockAt) };
    }
    if (type === "PREREQUISITE") {
      if (requireChallengeIds.length === 0) return null;
      return { type, requireChallengeIds };
    }
    const score = Number(minScore);
    if (!Number.isInteger(score) || score < 0) return null;
    return { type, minScore: score };
  }, [type, unlockAt, requireChallengeIds, minScore]);

  const togglePrereq = useCallback((challengeId: number) => {
    setRequireChallengeIds((prev) =>
      prev.includes(challengeId)
        ? prev.filter((id) => id !== challengeId)
        : [...prev, challengeId],
    );
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: "100%",
      }}
    >
      <select
        value={type}
        onChange={(e) => {
          const next = e.target.value as UnlockRuleType;
          setType(next);
          if (next === "ALWAYS") onSave(null);
        }}
        style={inputStyle}
      >
        {(Object.keys(RULE_LABELS) as (keyof typeof RULE_LABELS)[]).map(
          (key) => (
            <option key={key} value={key}>
              {RULE_LABELS[key]}
            </option>
          ),
        )}
      </select>

      {type === "TIME" ? (
        <input
          type="datetime-local"
          value={unlockAt}
          onChange={(e) => setUnlockAt(e.target.value)}
          style={inputStyle}
        />
      ) : null}

      {type === "PREREQUISITE" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {candidates.map((c) => (
            <label
              key={c.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 14,
              }}
            >
              <input
                type="checkbox"
                checked={requireChallengeIds.includes(c.challengeId)}
                onChange={() => togglePrereq(c.challengeId)}
              />
              {c.title}
            </label>
          ))}
          {candidates.length === 0 ? (
            <Text tone="secondary" size="xs">
              No other challenges in this event yet.
            </Text>
          ) : null}
        </div>
      ) : null}

      {type === "SCORE" ? (
        <input
          type="number"
          min={0}
          step={1}
          value={minScore}
          onChange={(e) => setMinScore(e.target.value)}
          placeholder="Minimum score"
          style={inputStyle}
        />
      ) : null}

      {type !== "ALWAYS" ? (
        <Button
          size="sm"
          disabled={busy || !build()}
          onClick={() => onSave(build())}
        >
          Save rule
        </Button>
      ) : null}
    </div>
  );
}

export function EventsView({ session }: { session: Session }) {
  const [events, setEvents] = useState<EventSummaryDto[]>([]);
  const [allChallenges, setAllChallenges] = useState<
    { id: number; title: string }[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [eventChallenges, setEventChallenges] = useState<EventChallengeDto[]>(
    [],
  );
  const [addChallengeId, setAddChallengeId] = useState<number | "">("");
  const [editingRowId, setEditingRowId] = useState<number | null>(null);

  const [draft, setDraft] = useState<{
    title: string;
    slug: string;
    description: string;
    startsAt: string;
    endsAt: string;
    status: EventSummaryDto["status"];
  }>({
    title: "",
    slug: "",
    description: "",
    startsAt: "",
    endsAt: "",
    status: "SCHEDULED",
  });

  const loadEvents = useCallback(async () => {
    setError(null);
    try {
      setEvents(await adminApi.listAdminEvents(session));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load events");
    }
  }, [session]);

  const loadChallenges = useCallback(async () => {
    try {
      const items = await adminApi.listAllChallenges(session);
      setAllChallenges(items.map((c) => ({ id: c.id, title: c.title })));
    } catch {
      setAllChallenges([]);
    }
  }, [session]);

  useEffect(() => {
    void loadEvents();
    void loadChallenges();
  }, [loadEvents, loadChallenges]);

  const selectEvent = useCallback(
    async (id: number | null) => {
      setSelectedId(id);
      setEditingRowId(null);
      if (id == null) {
        setEventChallenges([]);
        return;
      }
      try {
        setEventChallenges(
          await adminApi.listAdminEventChallenges(session, id),
        );
      } catch {
        setEventChallenges([]);
      }
    },
    [session],
  );

  const selected = events.find((e) => e.id === selectedId) ?? null;

  const onCreate = useCallback(async () => {
    if (busy || !draft.title || !draft.slug || !draft.startsAt || !draft.endsAt)
      return;
    setBusy(true);
    setError(null);
    try {
      await adminApi.createEvent(session, {
        ...draft,
        startsAt: fromLocalInput(draft.startsAt),
        endsAt: fromLocalInput(draft.endsAt),
      });
      setDraft({
        title: "",
        slug: "",
        description: "",
        startsAt: "",
        endsAt: "",
        status: "SCHEDULED",
      });
      await loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create event");
    } finally {
      setBusy(false);
    }
  }, [busy, draft, session, loadEvents]);

  const onAddChallenge = useCallback(async () => {
    if (busy || selectedId == null || addChallengeId === "") return;
    setBusy(true);
    setError(null);
    try {
      const added = await adminApi.addEventChallenge(session, selectedId, {
        challengeId: addChallengeId as number,
        sortOrder: eventChallenges.length,
      });
      setEventChallenges((prev) => [...prev, added]);
      setAddChallengeId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add challenge");
    } finally {
      setBusy(false);
    }
  }, [busy, selectedId, addChallengeId, eventChallenges.length, session]);

  const onSaveRule = useCallback(
    async (ec: EventChallengeDto, rule: UnlockRuleDto | null) => {
      setBusy(true);
      setError(null);
      try {
        const updated = await adminApi.updateEventChallenge(session, ec.id, {
          unlock: rule,
        });
        setEventChallenges((prev) =>
          prev.map((c) => (c.id === ec.id ? updated : c)),
        );
        setEditingRowId(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to save rule");
      } finally {
        setBusy(false);
      }
    },
    [session],
  );

  const onRemoveChallenge = useCallback(
    async (ec: EventChallengeDto) => {
      if (busy) return;
      setBusy(true);
      setError(null);
      try {
        await adminApi.removeEventChallenge(session, ec.id);
        setEventChallenges((prev) => prev.filter((c) => c.id !== ec.id));
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to remove challenge",
        );
      } finally {
        setBusy(false);
      }
    },
    [busy, session],
  );

  const onDeleteEvent = useCallback(
    async (id: number) => {
      if (busy) return;
      setBusy(true);
      setError(null);
      try {
        await adminApi.deleteEvent(session, id);
        if (selectedId === id) {
          setSelectedId(null);
          setEventChallenges([]);
        }
        await loadEvents();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete event");
      } finally {
        setBusy(false);
      }
    },
    [busy, session, selectedId, loadEvents],
  );

  const addableChallenges = useMemo(() => {
    const inEvent = new Set(eventChallenges.map((c) => c.challengeId));
    return allChallenges.filter((c) => !inEvent.has(c.id));
  }, [allChallenges, eventChallenges]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {error ? <Text tone="danger">{error}</Text> : null}

      <Card
        title="Create event"
        bodyStyle={{ display: "flex", flexDirection: "column", gap: 12 }}
      >
        <div style={gridTwo}>
          {EVENT_FIELDS.map((f) => (
            <label
              key={f.key}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                fontSize: 13,
              }}
            >
              {f.label}
              <input
                {...f.props}
                value={String(draft[f.key as keyof typeof draft])}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, [f.key]: e.target.value }))
                }
                style={inputStyle}
              />
            </label>
          ))}
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              fontSize: 13,
            }}
          >
            Status
            <select
              value={draft.status}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  status: e.target.value as EventSummaryDto["status"],
                }))
              }
              style={inputStyle}
            >
              <option value="DRAFT">DRAFT</option>
              <option value="SCHEDULED">SCHEDULED</option>
              <option value="RUNNING">RUNNING</option>
              <option value="ENDED">ENDED</option>
            </select>
          </label>
          <label
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 4,
              fontSize: 13,
              gridColumn: "1 / -1",
            }}
          >
            Description (Markdown)
            <textarea
              value={draft.description}
              onChange={(e) =>
                setDraft((d) => ({ ...d, description: e.target.value }))
              }
              rows={4}
              style={inputStyle}
            />
          </label>
        </div>
        <div>
          <Button
            disabled={
              busy ||
              !draft.title ||
              !draft.slug ||
              !draft.startsAt ||
              !draft.endsAt
            }
            onClick={() => void onCreate()}
          >
            Create event
          </Button>
        </div>
      </Card>

      <Card
        title="Events"
        bodyStyle={{ display: "flex", flexDirection: "column", gap: 10 }}
      >
        {events.length === 0 ? (
          <Text tone="secondary">No events yet.</Text>
        ) : null}
        {events.map((event) => (
          <div key={event.id} style={rowStyle}>
            <button
              onClick={() =>
                void selectEvent(selectedId === event.id ? null : event.id)
              }
              style={{
                border: "none",
                background: "none",
                cursor: "pointer",
                textAlign: "left",
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: 0,
              }}
            >
              <span style={{ fontWeight: 600 }}>{event.title}</span>
              <Badge tone={eventBadgeTone(event.status)}>{event.status}</Badge>
            </button>
            <Text tone="secondary" size="xs">
              {event.participantCount} players · {event.teamCount} teams
            </Text>
            <Button
              size="sm"
              variant="danger"
              onClick={() => void onDeleteEvent(event.id)}
            >
              Delete
            </Button>
          </div>
        ))}
      </Card>

      {selected ? (
        <Card
          title={`Manage: ${selected.title}`}
          bodyStyle={{ display: "flex", flexDirection: "column", gap: 12 }}
        >
          <Text tone="secondary" size="sm">
            {selected.description.split("\n").slice(0, 3).join(" ")}
          </Text>

          <div style={addRow}>
            <select
              value={addChallengeId}
              onChange={(e) =>
                setAddChallengeId(
                  e.target.value === "" ? "" : Number(e.target.value),
                )
              }
              style={{ ...inputStyle, flex: 1 }}
            >
              <option value="">Add a challenge…</option>
              {addableChallenges.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              disabled={busy || addChallengeId === ""}
              onClick={() => void onAddChallenge()}
            >
              Add
            </Button>
          </div>

          {eventChallenges.length === 0 ? (
            <Text tone="secondary" size="sm">
              No challenges in this event yet. Add one above, then configure its
              unlock rule.
            </Text>
          ) : (
            eventChallenges.map((ec) => {
              const busyRow = editingRowId === ec.id;
              return (
                <div
                  key={ec.id}
                  style={{ ...rowStyle, alignItems: "flex-start" }}
                >
                  <div
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <span style={{ fontWeight: 600 }}>{ec.title}</span>
                      <Badge tone="neutral">{ec.basePoints} pts</Badge>
                      <Badge tone={ec.locked ? "neutral" : "success"}>
                        {ec.locked ? "Locked" : "Open"}
                      </Badge>
                    </div>
                    <Text tone="secondary" size="xs">
                      {ec.unlockRule
                        ? `Rule: ${RULE_LABELS[ec.unlockRule.type] ?? ec.unlockRule.type}`
                        : "Rule: always open"}
                    </Text>
                    {busyRow ? (
                      <RuleEditor
                        rule={ec.unlockRule}
                        candidates={eventChallenges.filter(
                          (c) => c.challengeId !== ec.challengeId,
                        )}
                        busy={busy}
                        onSave={(rule) => void onSaveRule(ec, rule)}
                      />
                    ) : null}
                  </div>
                  <div style={rowActions}>
                    <Button
                      size="sm"
                      onClick={() => setEditingRowId(busyRow ? null : ec.id)}
                    >
                      {busyRow ? "Close" : "Edit rule"}
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => void onRemoveChallenge(ec)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </Card>
      ) : null}
    </div>
  );
}

const gridTwo: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 12,
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  background: "#f8fafc",
};

const addRow: React.CSSProperties = {
  display: "flex",
  gap: 8,
};

const rowActions: React.CSSProperties = {
  display: "flex",
  gap: 8,
};
