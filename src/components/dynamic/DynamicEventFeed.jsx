function formatTime(ms) {
  const s = Math.floor((ms || 0) / 1000);
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

const colors = {
  SESSION_START: 'var(--success)',
  PATH_RESTORED: 'var(--success)',
  NODE_RECOVERY: 'var(--success)',
  LINK_RECOVERY: 'var(--success)',
  NODE_CRASH: 'var(--failure)',
  REROUTE_FAILED: 'var(--failure)',
  PATH_BROKEN: 'var(--failure)',
  LINK_SPIKE: 'var(--congestion)',
  REROUTE_SUCCESS: 'var(--accent-cyan)',
  OPTIMIZATION: 'var(--accent-cyan)',
  PATH_UNAFFECTED: 'var(--text-muted)',
  SESSION_END: 'var(--text-secondary)',
};

export default function DynamicEventFeed({ state }) {
  const algorithmColor = state.algorithms[state.dynamicSession.selectedAlgorithm]?.color;
  return (
    <div className="dynamic-feed">
      {state.dynamicSession.eventFeed.length === 0 && <p className="event-empty">No dynamic events yet.</p>}
      {state.dynamicSession.eventFeed.map((entry) => (
        <div key={entry.id} className={`feed-entry ${entry.type === 'PATH_UNAFFECTED' ? 'muted' : ''}`}>
          <time>{formatTime(entry.timestamp)}</time>
          <div>
            <b style={{ color: entry.algorithmColor ? algorithmColor : colors[entry.type] || 'var(--text-primary)' }}><span>●</span>{entry.headline}</b>
            {entry.detail && <p>{entry.detail}</p>}
            {entry.detail2 && <p className="mono">{entry.detail2}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}
