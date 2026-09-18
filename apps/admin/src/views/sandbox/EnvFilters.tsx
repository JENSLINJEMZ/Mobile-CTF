import { D_CHEV, D_FILTER, D_REFRESH, D_SEARCH, Svg } from "./miniIcons";
import type { SandboxFilter } from "./useSandboxLive";

export function EnvFilters({
  filter,
  users,
  image,
  onFilter,
  onRefresh,
}: {
  filter: SandboxFilter;
  users: string[];
  image?: string | null;
  onFilter: (next: SandboxFilter) => void;
  onRefresh: () => void;
}) {
  return (
    <div className="filter-bar">
      <label className="filter-search">
        <Svg d={D_SEARCH} size={14} />
        <input
          type="text"
          value={filter.q}
          placeholder="Search by environment name, user, or container..."
          onChange={(e) => onFilter({ ...filter, q: e.target.value })}
        />
      </label>
      <button className="filter-select" title="Filter by status">
        <select
          value={filter.status}
          onChange={(e) => onFilter({ ...filter, status: e.target.value as SandboxFilter["status"] })}
        >
          <option value="all">All Status</option>
          <option value="running">Running</option>
          <option value="paused">Paused</option>
          <option value="stopped">Stopped</option>
          <option value="created">Created</option>
        </select>
        <Svg d={D_CHEV} size={11} />
      </button>
      <button className="filter-select" title="Only one sandbox image is provisioned">
        <select defaultValue={image ?? "ctf-sandbox:latest"}>
          <option>{image ?? "ctf-sandbox:latest"}</option>
        </select>
        <Svg d={D_CHEV} size={11} />
      </button>
      <button className="filter-select" title="Filter by user">
        <select
          value={filter.user}
          onChange={(e) => onFilter({ ...filter, user: e.target.value })}
        >
          <option value="all">All Users</option>
          {users.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
        <Svg d={D_CHEV} size={11} />
      </button>
      <button className="filter-btn" onClick={onRefresh}>
        <Svg d={D_FILTER} size={13} />
        Filter
      </button>
      <button className="filter-refresh" aria-label="Refresh" onClick={onRefresh}>
        <Svg d={D_REFRESH} size={14} />
      </button>
    </div>
  );
}