import AskButton from '../ai/AskButton.jsx';
import { algorithmDefinitions } from '../../algorithms/index.js';

export default function MetricsCard({ id, result, winner, onFocus, ai }) {
  const definition = algorithmDefinitions[id];
  const status = result ? (result.error ? 'ERROR' : (result.found ? (winner === id ? 'WINNER' : 'COMPLETE') : 'NO PATH')) : 'IDLE';
  return (
    <article className={`metrics-card ${winner === id ? 'winner-card' : ''} ${result && !result.found ? 'no-path-card' : ''}`} style={{ '--algo-color': definition.colorVar }} onClick={onFocus}>
      <header>
        <span className="pill metric-pill"><span className="dot" />{definition.name}</span>
        <span className="status">{status}</span>
        <AskButton onAsk={(event) => { event?.stopPropagation?.(); ai.explain('ALGORITHM_PERFORMANCE', { algorithmId: id, result, triggerRect: event.currentTarget.getBoundingClientRect() }); }} />
      </header>
      <div className="metric-row"><span>Path Cost</span><b>{result ? (result.found ? result.pathCost : 'No path') : '-'}</b></div>
      <div className="metric-row"><span>Hop Count</span><b>{result ? (result.found ? result.hopCount : 'No path') : '-'}</b></div>
      <div className="metric-row"><span>Exec Time</span><b>{result ? `${Number(result.executionTime || 0).toFixed(2)}ms` : '-'}</b></div>
      <div className="metric-row"><span>Nodes Visited</span><b>{result?.nodesVisited ?? '-'}</b></div>
      {result?.error && <div className="metric-row"><span>Error</span><b>{result.error}</b></div>}
    </article>
  );
}
