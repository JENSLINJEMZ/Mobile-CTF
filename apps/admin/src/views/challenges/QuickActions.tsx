export function QuickActions({
  onNew,
  onTemplate,
}: {
  onNew: () => void;
  onTemplate: () => void;
}) {
  return (
    <div className="panel chx-panel">
      <div className="panel-head">
        <span className="panel-title">Quick Actions</span>
      </div>
      <div className="chx-panel-body">
        <button className="qa-primary" onClick={onNew}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Challenge
        </button>

        <div className="qa-grid">
          <button className="qa-btn" onClick={onTemplate}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
              <path d="M14 3v5h5" />
            </svg>
            <span>Import from Template</span>
          </button>
          <button className="qa-btn" title="Bulk import planned">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="5" cy="12" r="1.6" fill="currentColor" />
              <circle cx="12" cy="12" r="1.6" fill="currentColor" />
              <circle cx="19" cy="12" r="1.6" fill="currentColor" />
            </svg>
            <span>Bulk Actions</span>
            <svg className="qa-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </div>

        <div className="qa-list">
          <button className="qa-item" title="Manage challenge categories">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h6l3 3h7v13H4z" />
              <path d="M4 4v16" />
            </svg>
            Manage Categories
          </button>
          <button className="qa-item" title="Challenge templates not yet available">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1.8" />
              <rect x="14" y="3" width="7" height="7" rx="1.8" />
              <rect x="3" y="14" width="7" height="7" rx="1.8" />
              <rect x="14" y="14" width="7" height="7" rx="1.8" />
            </svg>
            Challenge Templates
          </button>
          <button className="qa-item" title="Trash is not enabled yet">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            </svg>
            View Trash
          </button>
        </div>
      </div>
    </div>
  );
}