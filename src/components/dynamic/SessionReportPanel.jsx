import AskButton from '../ai/AskButton.jsx';
import { algorithmDefinitions } from '../../algorithms/index.js';
import ExplanationDisplayBlock from '../shared/ExplanationDisplayBlock.jsx';

function formatTime(ms) {
  const s = Math.floor((ms || 0) / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function rating(score) {
  if (score >= 90) return 'Excellent - near-perfect dynamic routing';
  if (score >= 70) return 'Good - handled most events effectively';
  if (score >= 50) return 'Fair - adapted under significant network stress';
  return 'Needs Review - high disruption, worth inspecting the event history';
}

function reason(entry) {
  if (entry.reason === 'DISCONNECTED' || !entry.path?.length) {
    return <span style={{ color: 'var(--failure)', fontStyle: 'italic', fontSize: '11px' }}>No path</span>;
  }
  if (entry.reason === 'REROUTE' && entry.costChange > 0) return `+ ${entry.costChange}`;
  if (entry.reason === 'REROUTE' && entry.costChange < 0) return `${entry.costChange}`;
  if (entry.reason === 'REROUTE') return 'unchanged';
  if (entry.reason === 'OPTIMIZATION') return 'optimized';
  return entry.reason;
}

export default function SessionReportPanel({ state, ai, explanation, onGenerateExplanation }) {
  const report = state.dynamicSession.sessionReport;
  if (!report) return <div className="dynamic-report"><p className="event-empty">Preparing session report...</p></div>;
  const algorithm = algorithmDefinitions[report.algorithmId];
  const score = report.resilienceScore;
  const color = score >= 80 ? 'var(--success)' : (score >= 50 ? 'var(--congestion)' : 'var(--failure)');
  return (
    <div className="dynamic-report">
      <header style={{ '--algo-color': algorithm.colorVar }}>
        <div><span className="dot" /><b>{report.algorithmName}</b><small>{report.topologyName} · Session: {report.durationSeconds}s</small></div>
        <AskButton label="AI" onAsk={(event) => ai.explain('DYNAMIC_SESSION', { ...report, triggerRect: event.currentTarget.getBoundingClientRect() })} />
      </header>
      <section>
        <h3>Network Events</h3>
        <p><b>{report.eventCounts.total} events fired</b></p>
        <p>{report.eventCounts.crashes} node crash(es), {report.eventCounts.spikes} link spike(s), {report.eventCounts.recoveries} recovery event(s)</p>
      </section>
      <section>
        <h3>Routing Performance</h3>
        <div className="report-grid">
          <div><span>Successful reroutes</span><b>{report.stats.successfulReroutes}/{report.eventCounts.total}</b></div>
          <div><span>Failed reroutes</span><b>{report.stats.failedReroutes}</b></div>
          <div><span>Total disconnected</span><b>{(report.stats.disconnectedMs / 1000).toFixed(1)}s</b></div>
          <div><span>Path changes</span><b>{report.stats.pathChanges}</b></div>
        </div>
      </section>
      <section>
        <h3>Path History</h3>
        <table className="report-table path-history-table">
          <thead><tr><th>Time</th><th>Route</th><th>Cost</th><th>Reason</th></tr></thead>
          <tbody>
            {report.pathHistory.map((entry, index) => {
              const route = entry.path?.length ? entry.path.join(' → ') : '[ DISCONNECTED ]';
              return <tr key={index} className={`reason-${entry.reason.toLowerCase()}`}><td>{formatTime(entry.timestamp)}</td><td>{route.length > 28 ? `${route.slice(0, 28)}...` : route}</td><td>{entry.cost ?? '-'}</td><td>{reason(entry)}</td></tr>;
            })}
          </tbody>
        </table>
      </section>
      <section>
        <h3>Algorithm Assessment</h3>
        <p>{report.assessment}</p>
      </section>
      <section>
        <div className="score-header"><span className="label">Resilience Score</span><b style={{ color }}>{score}/100</b></div>
        <div className="resilience-bar"><i style={{ width: `${score}%`, background: color }} /></div>
        <p><em>{rating(score)}</em></p>
      </section>
      <section className="explanation-section">
        <h3>Explanation</h3>
        <ExplanationDisplayBlock mode="dynamic" explanation={explanation} onGenerate={onGenerateExplanation} />
      </section>
    </div>
  );
}
