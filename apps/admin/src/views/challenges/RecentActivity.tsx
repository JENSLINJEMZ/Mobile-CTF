import type { AuditLogDto } from "@ctf/shared";

import { relTime } from "./format";

function activityMeta(a: AuditLogDto) {
  const details = (a.details ?? {}) as Record<string, unknown>;
  const title =
    typeof details.title === "string"
      ? details.title
      : typeof details.slug === "string"
        ? details.slug
        : null;

  switch (a.action) {
    case "challenge.create":
      return {
        text: `created a new challenge`,
        target: title ?? `#${a.entityId}`,
        color: "#a78bfa",
        glyph:
          '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
      };
    case "challenge.update":
      return {
        text:
          details.published === true
            ? "published challenge"
            : details.published === false
              ? "unpublished challenge"
              : "updated challenge",
        target: title ?? `#${a.entityId}`,
        color: "#3b82f6",
        glyph:
          '<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.4 2.4L16 9.8"/>',
      };
    case "challenge.delete":
      return {
        text: `deleted challenge`,
        target: title ?? `#${a.entityId}`,
        color: "#ef4444",
        glyph:
          '<path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>',
      };
    default:
      return null;
  }
}

export function RecentActivity({ items }: { items: AuditLogDto[] }) {
  const shown = items
    .map((a) => ({ a, meta: activityMeta(a) }))
    .filter((x): x is { a: AuditLogDto; meta: NonNullable<ReturnType<typeof activityMeta>> } => x.meta !== null)
    .slice(0, 6);

  return (
    <div className="panel chx-panel">
      <div className="panel-head">
        <span className="panel-title">Recent Activity</span>
        <span className="panel-sub">{items.length} events</span>
      </div>
      <div className="activity-list chx-activity">
        {shown.length === 0 ? (
          <div className="act-empty">No challenge activity yet.</div>
        ) : (
          shown.map(({ a, meta }) => (
            <div key={a.id} className="act-item">
              <span
                className="act-ic"
                style={
                  {
                    "--ac": meta.color,
                    "--ac-soft": `${meta.color}22`,
                    "--ac-line": `${meta.color}55`,
                  } as React.CSSProperties
                }
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  dangerouslySetInnerHTML={{ __html: meta.glyph }}
                />
              </span>
              <div className="act-body">
                <div className="act-text">
                  <b>{a.actorUsername ?? "system"}</b> {meta.text}{" "}
                  <span className="ch-name-ink">{meta.target}</span>
                </div>
                <div className="act-time">{relTime(a.createdAt)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}