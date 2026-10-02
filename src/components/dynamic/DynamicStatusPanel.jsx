import { algorithmDefinitions } from '../../algorithms/index.js';

function scoreColor(score) {
  if (score >= 80) return 'var(--success)';
  if (score >= 50) return 'var(--congestion)';
  return 'var(--failure)';
}

export default function DynamicStatusPanel({ state }) {
  const session = state.dynamicSession;
  const algorithm = algorithmDefinitions[session.selectedAlgorithm];
  const score = session.resilienceScore ?? 0;
  const color = scoreColor(score);
  return (
    <div className="dynamic-status">
      <header style={{ '--algo-color': algorithm.colorVar }}>
        <span className="dot" />
        <div><b>{algorithm.name}</b><small>{session.status}</small></div>
      </header>
      <section>
        <div className="label">Current Route</div>
        {session.currentPath.length ? (
          <>
            <div className="route-pills">{session.currentPath.map((node, index) => <span key={`${node}-${index}`}><b>{node}</b>{index < session.currentPath.length - 1 && <em>to</em>}</span>)}</div>
            <div className="report-grid">
              <div><span>Cost</span><b>{session.currentPathCost}</b></div>
              <div><span>Hops</span><b>{session.currentPathHops}</b></div>
            </div>
          </>
        ) : <p className="route-warning">No valid path is currently available.</p>}
      </section>
      <section>
        <div className="label">Active Failures</div>
        <div className="failure-pills">
          {session.activeFailures.nodes.map((id) => <span key={id} className="node-failure">{id}</span>)}
          {session.activeFailures.links.map((link) => <span key={link.edgeId} className="link-spike">{`${link.edgeId}: ${link.originalWeight}->${link.newWeight}`}</span>)}
          {!session.activeFailures.nodes.length && !session.activeFailures.links.length && <p>- No active failures</p>}
        </div>
      </section>
      <section>
        <div className="label">Live Stats</div>
        <div className="report-grid">
          <div><span>Events</span><b>{session.stats.totalEvents}</b></div>
          <div><span>Reroutes</span><b>{session.stats.successfulReroutes}/{session.stats.totalEvents}</b></div>
          <div><span>Path changes</span><b>{session.stats.pathChanges}</b></div>
          <div><span>Disconnected</span><b>{(session.stats.disconnectedMs / 1000).toFixed(1)}s</b></div>
        </div>
      </section>
      <section>
        <div className="score-header"><span className="label">Resilience Score</span><b style={{ color }}>{score}/100</b></div>
        <div className="resilience-bar"><i style={{ width: `${score}%`, background: color }} /></div>
      </section>
    </div>
  );
}
