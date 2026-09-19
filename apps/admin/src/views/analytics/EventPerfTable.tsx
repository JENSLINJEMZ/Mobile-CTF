import type { AnalyticsEventPerfRow } from "@ctf/shared";
import { numFmt } from "./format";
import { CHEVRON_DOWN } from "./icons";

interface Props {
  events?: AnalyticsEventPerfRow[];
}

export function EventPerfTable({ events }: Props) {
  const list = events ?? [];

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">Event Performance</span>
        <button className="select-sm">
          All Events{" "}
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            dangerouslySetInnerHTML={{ __html: CHEVRON_DOWN }}
          />
        </button>
      </div>

      <table className="mini-table">
        <thead>
          <tr>
            <th>Event</th>
            <th>Start</th>
            <th>End</th>
            <th className="right">Participants</th>
            <th className="right">Solves</th>
          </tr>
        </thead>
        <tbody>
          {list.length > 0 ? (
            list.map((e) => (
              <tr key={e.id}>
                <td>
                  <span className="ev-perf-name" title={e.name}>
                    {e.name}
                  </span>
                </td>
                <td>
                  <span className="ev-perf-date">{e.start}</span>
                </td>
                <td>
                  <span className="ev-perf-date">{e.end}</span>
                </td>
                <td>
                  <span className="cell-mono">{numFmt(e.participants)}</span>
                </td>
                <td>
                  <span className="cell-mono">{numFmt(e.solves)}</span>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={5} style={{ textAlign: "center", color: "var(--text-3)", padding: 16 }}>
                No active events found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
