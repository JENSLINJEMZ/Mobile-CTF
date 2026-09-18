import type { EventChallengeDto } from "@ctf/shared";

import type { ReactNode } from "react";

import type { EventCardMeta } from "./format";
import {
  durationDays,
  fullDate,
  monthLabel,
  timeLabel,
  STATUS_LABEL,
} from "./format";
import { EventIcon, EventThumb, QUILL, SVG } from "./EventThumbs";

export type EventsSubTab = "overview" | "challenges" | "participants" | "settings";

interface TimelineNode {
  label: string;
  date: string;
  state: "done" | "current" | "pending";
}

export function buildTimeline(event: EventCardMeta, now: Date): TimelineNode[] {
  const start = new Date(event.startsAt);
  const end = new Date(event.endsAt);
  const created = event.createdAt ? new Date(event.createdAt) : null;
  const status = event.status;
  const nodes: TimelineNode[] = [];
  if (created && !Number.isNaN(created.getTime())) {
    nodes.push({
      label: "Event Created",
      date: `${monthLabel(created)} ${created.getDate()}`,
      state: "done",
    });
  } else {
    nodes.push({ label: "Event Created", date: "—", state: "done" });
  }
  const regState: TimelineNode["state"] =
    status === "DRAFT" ? "pending" : now < start ? "current" : "done";
  nodes.push({
    label: "Registration Open",
    date:
      now < start
        ? `${monthLabel(start)} ${start.getDate()}`
        : "Opened",
    state: regState,
  });
  nodes.push({
    label: "Event Starts",
    date: `${monthLabel(start)} ${start.getDate()}`,
    state: status === "RUNNING" ? "current" : now < start ? "pending" : "done",
  });
  nodes.push({
    label: "Event Ends",
    date: `${monthLabel(end)} ${end.getDate()}`,
    state: status === "ENDED" ? "done" : status === "RUNNING" ? "pending" : "pending",
  });
  nodes.push({
    label: "Results",
    date: `${monthLabel(end)} ${end.getDate()}`,
    state: status === "ENDED" ? "current" : "pending",
  });
  return nodes;
}

function Timeline({ event, now }: { event: EventCardMeta; now: Date }) {
  const nodes = buildTimeline(event, now);
  return (
    <div className="timeline">
      {nodes.map((n) => (
        <div key={n.label} className="tl-item">
          <span className={`tl-dot${n.state === "done" ? " done" : n.state === "current" ? " current" : ""}`}></span>
          <div className="tl-body">
            <span className="tl-label">{n.label}</span>
            <span className="tl-date">{n.date}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function Donut({ pct1, pct2, pct3 }: { pct1: number; pct2: number; pct3: number }) {
  const C = 251.33;
  const a = Math.max(0, pct1);
  const b = Math.max(0, pct2);
  const c = Math.max(0, pct3);
  const arcPct = (p: number) => (C * p) / 100;
  return (
    <svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id="evt-donut-1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="evt-donut-2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ec4899" />
          <stop offset="100%" stopColor="#be185d" />
        </linearGradient>
        <linearGradient id="evt-donut-3" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#15803d" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="40" fill="none" stroke="#1a1a30" strokeWidth="12" />
      <circle
        cx="50"
        cy="50"
        r="40"
        fill="none"
        stroke="url(#evt-donut-1)"
        strokeWidth="12"
        strokeDasharray={`${arcPct(a)} ${C}`}
        strokeDashoffset="0"
      />
      <circle
        cx="50"
        cy="50"
        r="40"
        fill="none"
        stroke="url(#evt-donut-2)"
        strokeWidth="12"
        strokeDasharray={`${arcPct(b)} ${C}`}
        strokeDashoffset={-arcPct(a)}
      />
      <circle
        cx="50"
        cy="50"
        r="40"
        fill="none"
        stroke="url(#evt-donut-3)"
        strokeWidth="12"
        strokeDasharray={`${arcPct(c)} ${C}`}
        strokeDashoffset={-arcPct(a) - arcPct(b)}
      />
    </svg>
  );
}

export function EventDetails({
  event,
  challenges,
  subTab,
  onSubTab,
  onEdit,
  onQuickAction,
  extra,
}: {
  event: EventCardMeta;
  challenges: EventChallengeDto[];
  subTab: EventsSubTab;
  onSubTab: (t: EventsSubTab) => void;
  onEdit: () => void;
  onQuickAction: (action: string) => void;
  extra: ReactNode;
}) {
  const now = new Date();
  const start = new Date(event.startsAt);
  const end = new Date(event.endsAt);
  const validStart = !Number.isNaN(start.getTime());

  const totalSolves = challenges.reduce(
    (acc, c) => acc + (c.solvedCount ?? 0),
    0,
  );
  const pointsAwarded = challenges.reduce(
    (acc, c) => acc + (c.solvedCount ?? 0) * c.basePoints,
    0,
  );
  const n = challenges.length;
  const attempted = challenges.filter((c) => (c.solvedCount ?? 0) > 0).length;
  const completed = challenges.filter(
    (c) => (c.solvedCount ?? 0) >= event.participantCount,
  ).length;
  const pct = (p: number) => (n > 0 ? (p / n) * 100 : 0);

  const legend = [
    { key: "s1", label: "Solved at least once", p: pct(attempted) },
    { key: "s2", label: "Fully completed", p: pct(completed) },
    { key: "s3", label: "Unattempted", p: pct(n - attempted) },
  ];

  return (
    <div className="panel">
      <div className="selected-head">
        <span className="selected-icon">
          <EventIcon name="shield" />
        </span>
        <div className="selected-body">
          <div className="selected-title-row">
            <span className="selected-title">{event.title}</span>
            <span className={`selected-badge${event.status === "RUNNING" ? "" : " static"}`}>
              {event.status === "RUNNING" ? <span className="d"></span> : null}
              {STATUS_LABEL[event.status]}
            </span>
          </div>
          <div className="selected-desc">{event.description}</div>
        </div>
        <button className="btn-edit-sm" onClick={onEdit}>
          <SVG path={QUILL} />
          Edit Event
        </button>
      </div>

      <div className="sub-tabs">
        {(
          [
            ["overview", "Overview"],
            ["challenges", "Challenges"],
            ["participants", "Participants"],
            ["settings", "Settings"],
          ] as [EventsSubTab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            className={`sub-tab${subTab === key ? " is-active" : ""}`}
            onClick={() => onSubTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {subTab === "overview" ? (
        <>
          <div className="hero-banner">
            <EventThumb event={event} variant="hero" />
          </div>

          <div className="meta-grid">
            <div className="meta-tile">
              <span className="meta-ic purple">
                <EventIcon name="calendar" />
              </span>
              <span className="meta-label">Start</span>
              <span className="meta-value">
                {validStart ? fullDate(start) : "—"}
                <small>{validStart ? timeLabel(start) : ""}</small>
              </span>
            </div>
            <div className="meta-tile">
              <span className="meta-ic pink">
                <EventIcon name="calendar" />
              </span>
              <span className="meta-label">End</span>
              <span className="meta-value">
                {validStart ? fullDate(end) : "—"}
                <small>{validStart ? timeLabel(end) : ""}</small>
              </span>
            </div>
            <div className="meta-tile">
              <span className="meta-ic cyan">
                <EventIcon name="clock" />
              </span>
              <span className="meta-label">Duration</span>
              <span className="meta-value">
                {validStart ? durationDays(event.startsAt, event.endsAt) : "TBA"}
              </span>
            </div>
            <div className="meta-tile">
              <span className="meta-ic blue">
                <EventIcon name="users" />
              </span>
              <span className="meta-label">Participants</span>
              <span className="meta-value">
                {event.participantCount.toLocaleString()}
              </span>
            </div>
            <div className="meta-tile">
              <span className="meta-ic orange">
                <EventIcon name="sword" />
              </span>
              <span className="meta-label">Challenges</span>
              <span className="meta-value">{event.challengeCount}</span>
            </div>
          </div>

          <div className="section-label">
            <span className="t">Description</span>
          </div>
          <p className="desc-text teamverse-desc">{event.description}</p>

          <div className="section-label">
            <span className="t">Event Timeline</span>
          </div>
          <Timeline event={event} now={now} />

          <div className="section-label">
            <span className="t">Quick Actions</span>
          </div>
          <div className="qa-grid-2x3">
            <button className="qa-btn" onClick={() => onQuickAction("challenges")}>
              <EventIcon name="puzzle" />
              <span>Add Challenges</span>
            </button>
            <button className="qa-btn" onClick={() => onQuickAction("participants")}>
              <EventIcon name="users" />
              <span>Manage Participants</span>
            </button>
            <button className="qa-btn" onClick={() => onQuickAction("edit")}>
              <EventIcon name="stars" />
              <span>Edit Event Details</span>
            </button>
            <button className="qa-btn" onClick={() => onQuickAction("duplicate")}>
              <EventIcon name="key" />
              <span>Duplicate Event</span>
            </button>
            <button className="qa-btn" onClick={() => onQuickAction("leaderboard")}>
              <EventIcon name="trophy" />
              <span>View Leaderboard</span>
            </button>
            <button className="qa-btn danger" onClick={() => onQuickAction("delete")}>
              <EventIcon name="lock" />
              <span>Delete Event</span>
            </button>
          </div>

          <div className="section-label">
            <span className="t">Event Statistics</span>
          </div>
          <div className="stats-row">
            <div className="donut">
              <Donut pct1={legend[0]!.p} pct2={legend[1]!.p} pct3={legend[2]!.p} />
              <div className="donut-center">
                <span className="donut-value">
                  {event.participantCount.toLocaleString()}
                </span>
                <span className="donut-label">Participants</span>
              </div>
            </div>
            <div className="donut-legend">
              {legend.map((l) => (
                <div key={l.key} className="legend-row">
                  <span
                    className="swatch"
                    style={{
                      background:
                        l.key === "s1"
                          ? "#8b5cf6"
                          : l.key === "s2"
                            ? "#ec4899"
                            : "#22c55e",
                    }}
                  ></span>
                  <span className="n">{l.label}</span>
                  <span className="p">
                    {l.p > 0 ? `${Math.round(l.p)}%` : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="stat-summary">
            <div className="summary-item">
              <span className="summary-icon blue">
                <EventIcon name="users" />
              </span>
              <span className="summary-value">{event.teamCount}</span>
              <span className="summary-label">Active Teams</span>
            </div>
            <div className="summary-item">
              <span className="summary-icon green">
                <EventIcon name="check" />
              </span>
              <span className="summary-value">{totalSolves.toLocaleString()}</span>
              <span className="summary-label">Total Solves</span>
            </div>
            <div className="summary-item">
              <span className="summary-icon orange">
                <EventIcon name="sword" />
              </span>
              <span className="summary-value">
                {pointsAwarded.toLocaleString()}
              </span>
              <span className="summary-label">Points Awarded</span>
            </div>
          </div>
        </>
      ) : null}

      {subTab !== "overview" ? <div className="evt-subtab-extra">{extra}</div> : null}
    </div>
  );
}