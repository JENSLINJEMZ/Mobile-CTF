import type { SandboxActivityDto } from "@ctf/shared";

import { ActivityFeed } from "./ActivityFeed";

export function LogsTab({
  activity,
  live,
}: {
  activity: SandboxActivityDto[];
  live: boolean;
}) {
  return (
    <div className="tab-pane">
      <ActivityFeed activity={activity} live={live} />
    </div>
  );
}