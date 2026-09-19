import type { AnalyticsPlatformHealth } from "@ctf/shared";

interface Props {
  health?: AnalyticsPlatformHealth;
}

export function PlatformHealthPanel({ health }: Props) {
  const services = health?.services ?? [
    { key: "api", name: "API", ok: true, val: "32ms" },
    { key: "database", name: "Database", ok: true, val: "18ms" },
    { key: "redis", name: "Redis", ok: true, val: "12ms" },
    { key: "storage", name: "Storage", ok: true, val: "28ms" },
    { key: "docker", name: "Docker", ok: true, val: "41ms" },
  ];

  const summary = health?.summary ?? {
    uptime: "99.98%",
    avgResponse: "1.2s",
    ramUsage: "2.4 GB",
    activeSandboxes: 1,
  };

  const allOk = services.every((s) => s.ok);

  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">Platform Health</span>
        <span className="live-indicator">
          <span className="dot" />
          {allOk ? "All Systems Operational" : "Degraded Services"}
        </span>
      </div>

      <div className="health-services">
        {services.map((s) => (
          <div key={s.key} className="health-service">
            <span
              className="hs-icon"
              style={{
                backgroundColor: s.ok ? "rgba(34,197,94,.14)" : "rgba(239,68,68,.14)",
                color: s.ok ? "#4ade80" : "#f87171",
                borderColor: s.ok ? "rgba(34,197,94,.32)" : "rgba(239,68,68,.32)",
              }}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {s.ok ? (
                  <path d="M20 6 9 17l-5-5" />
                ) : (
                  <path d="m18 6-12 12M6 6l12 12" />
                )}
              </svg>
            </span>
            <span className="hs-name">{s.name}</span>
            <span
              className="hs-val"
              style={{ color: s.ok ? "#4ade80" : "#f87171" }}
            >
              {s.val}
            </span>
          </div>
        ))}
      </div>

      <div className="health-summary">
        <div className="health-summary-item">
          <span className="hs-val">{summary.uptime}</span>
          <span className="hs-label">Uptime</span>
        </div>
        <div className="health-summary-item">
          <span className="hs-val">{summary.avgResponse}</span>
          <span className="hs-label">Avg Response</span>
        </div>
        <div className="health-summary-item">
          <span className="hs-val">{summary.ramUsage}</span>
          <span className="hs-label">RAM Usage</span>
        </div>
        <div className="health-summary-item">
          <span className="hs-val">{summary.activeSandboxes}</span>
          <span className="hs-label">Active Sandboxes</span>
        </div>
      </div>
    </div>
  );
}
