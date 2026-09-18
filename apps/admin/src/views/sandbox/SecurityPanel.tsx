import { Svg } from "./miniIcons";

const D_CHECK = "<path d='m5 12.5 4.5 4.5L19 7'/>";

const SECURITY = [
  "Containers run in isolated network",
  "No access to host system",
  "Resource limits enforced (CPU, RAM, Storage)",
  "Outbound traffic restricted (allowlist)",
  "Automatic cleanup after session",
  "Read-only base filesystem",
  "No privileged containers",
];

export function SecurityPanel() {
  return (
    <div className="panel">
      <div className="panel-head">
        <span className="panel-title">Security &amp; Isolation</span>
      </div>
      <div className="sec-list">
        {SECURITY.map((item) => (
          <div key={item} className="sec-item">
            <span className="sec-check">
              <Svg d={D_CHECK} size={10} />
            </span>
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}