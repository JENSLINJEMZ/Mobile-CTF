import type { EventCardMeta } from "./format";
import { dateRange, dayLabel, STATUS_LABEL } from "./format";
import { EventThumb, SVG } from "./EventThumbs";

export function EventCard({
  event,
  selected,
  onSelect,
}: {
  event: EventCardMeta;
  selected: boolean;
  onSelect: (id: number) => void;
}) {
  const running = event.status === "RUNNING";
  const draft = event.status === "DRAFT";
  return (
    <article
      className={`event-card${selected ? " is-selected" : ""}`}
      onClick={() => onSelect(event.id)}
    >
      <div className="ev-thumb">
        <EventThumb event={event} />
        <span className={`ev-thumb-badge ${event.status.toLowerCase()}`}>
          {running ? <span className="d"></span> : null}
          {STATUS_LABEL[event.status]}
        </span>
      </div>
      <div className="ev-body">
        <div className="ev-title-row">
          <h3 className="ev-title">{event.title}</h3>
        </div>
        <p className="ev-desc">{event.description}</p>
        <div className="ev-meta">
          <span className={`ev-meta-item${draft ? " muted" : ""}`}>
            <SVG path="M3 5.5h18V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM7 3.5v4M17 3.5v4" />
            <b>{draft ? "TBA" : dateRange(event.startsAt, event.endsAt)}</b>
          </span>
          <span className={`ev-meta-item${draft ? " muted" : ""}`}>
            <SVG path="M16 20.5v-1.8a3.6 3.6 0 0 0-3.6-3.6H6.6A3.6 3.6 0 0 0 3 18.7v1.8" />
            <b>
              {event.participantCount.toLocaleString()}{" "}
              {draft ? "registered" : "participants"}
            </b>
          </span>
          <span className={`ev-meta-item${draft ? " muted" : ""}`}>
            <SVG path="m12 2.6 8.4 4.7v9.4L12 21.4 3.6 16.7V7.3z" />
            <b>
              {event.challengeCount} challenge{event.challengeCount === 1 ? "" : "s"}
            </b>
          </span>
        </div>
        {event.updatedAt ? (
          <div className="ev-tags">
            <span className="tag">
              Updated {dayLabel(new Date(event.updatedAt))}
            </span>
          </div>
        ) : null}
      </div>
      <div className="ev-options">
        <button
          aria-label="More options"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(event.id);
          }}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="5" cy="12" r="1.4" fill="currentColor" />
            <circle cx="12" cy="12" r="1.4" fill="currentColor" />
            <circle cx="19" cy="12" r="1.4" fill="currentColor" />
          </svg>
        </button>
      </div>
    </article>
  );
}