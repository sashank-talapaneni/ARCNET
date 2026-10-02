import { Trophy } from 'lucide-react';
import AskButton from '../ai/AskButton.jsx';
import { algorithmDefinitions } from '../../algorithms/index.js';
import { createGraphApi } from '../../utils/graphUtils.js';
import { determineWinner, resultAverages } from '../../utils/metricsUtils.js';

function resultSet(state) {
  return Object.fromEntries(Object.entries(state.algorithms).map(([id, cfg]) => [id, cfg.results]).filter(([, result]) => result));
}

function pathBreakdown(graph, path) {
  const api = createGraphApi(graph);
  let cumulative = 0;
  return path.slice(0, -1).map((from, index) => {
    const to = path[index + 1];
    const weight = api.getWeight(from, to);
    cumulative += weight;
    return { edge: `${from} → ${to}`, weight, cumulative };
  });
}

function countSteps(result, types) {
  return (result.steps || []).filter((step) => types.includes(step.type)).length;
}

function behaviorNote(result, results) {
  if (!result.found) return 'No valid path found under current network conditions.';
  const found = Object.values(results).filter((item) => item?.found);
  const minCost = Math.min(...found.map((item) => item.pathCost));
  const minHops = Math.min(...found.map((item) => item.hopCount));
  if (result.pathCost === minCost) return 'Found the globally optimal path.';
  if (result.hopCount === minHops) return 'Found the minimum hop path.';
  return null;
}

function explorationNote(result, totalNodes) {
  if (!result.found) return 'No valid path found under current network conditions.';
  const ratio = totalNodes ? result.nodesVisited / totalNodes : 0;
  if (ratio > 0.8) return 'Explored most of the network before finding the path.';
  if (ratio < 0.3) return 'Found path efficiently with minimal exploration.';
  return 'Balanced exploration with a complete route under current network conditions.';
}

function percentDelta(value, baseline) {
  if (!baseline) return { amount: 0, label: 'same as' };
  const delta = ((value - baseline) / baseline) * 100;
  return { amount: Math.abs(delta), label: delta <= 0 ? 'faster' : 'slower' };
}

function idealUseCase(graph, results, winnerId) {
  const weights = graph.edges.map((edge) => Number(edge.weight)).filter(Number.isFinite);
  const average = weights.reduce((sum, weight) => sum + weight, 0) / Math.max(weights.length, 1);
  const variance = weights.reduce((sum, weight) => sum + ((weight - average) ** 2), 0) / Math.max(weights.length, 1);
  const density = graph.nodes.length > 1 ? graph.edges.length / (graph.nodes.length * (graph.nodes.length - 1)) : 0;
  const uniform = weights.every((weight) => weight === weights[0]);
  if (winnerId === 'backtrack' || Object.values(results).some((result) => countSteps(result, ['REJECT']) > 0)) return 'Backtracking demonstrated constraint satisfaction unavailable in other algorithms.';
  if (uniform) return 'BFS optimal - weight-agnostic traversal matches weighted algorithms with lower overhead.';
  if (density > 0.35) return 'Floyd-Warshall justified - all-pairs computation amortizes cost across dense connections.';
  if (variance > average) return 'Dijkstra ideal - greedy approach excels when edge weight variance is high.';
  return 'Dijkstra ideal - weighted shortest-path scoring fits this network structure.';
}

function Bar({ label, value, max }) {
  const width = max ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div className="score-bar-row">
      <span>{label}</span>
      <div className="score-bar"><i style={{ width: `${width}%` }} /></div>
      <b>{value.toFixed(1)}/{max}</b>
    </div>
  );
}

export function AlgorithmDetailedReport({ id, result, state, results, expanded, onToggle, ai }) {
  if (!result) return null;
  const definition = algorithmDefinitions[id];
  const rows = result.found ? pathBreakdown(state.graph, result.path) : [];
  const averages = resultAverages(results);
  const winner = determineWinner(results);
  const totalNodes = state.graph.nodes.length;
  const visitedPercent = totalNodes ? Math.round((result.nodesVisited / totalNodes) * 100) : 0;
  const avgDelta = percentDelta(result.executionTime, averages.executionTime);
  const winnerResult = results[winner.winnerId];
  const winnerDelta = percentDelta(result.executionTime, winnerResult?.executionTime || result.executionTime);
  const note = behaviorNote(result, results) || explorationNote(result, totalNodes);
  const otherResultsSummary = Object.entries(results)
    .filter(([otherId]) => otherId !== id)
    .map(([otherId, other]) => `${algorithmDefinitions[otherId]?.name || otherId}: cost=${other.found ? other.pathCost : 'No path'}, hops=${other.hopCount}, time=${Number(other.executionTime || 0).toFixed(2)}ms`)
    .join('; ');

  return (
    <section className={`detail-report ${expanded ? 'expanded' : ''}`} style={{ '--algo-color': definition.colorVar }}>
      <div className="detail-report-header">
        <button type="button" onClick={onToggle}>{definition.name} Detailed Report</button>
        {result.routeUnaffected && <b>= Route Unchanged</b>}
        <AskButton
          label="AI"
          onAsk={(event) => {
            ai.explain('ALGORITHM_PERFORMANCE', {
              topologyName: state.activePreset,
              nodeCount: state.graph.nodes.length,
              edgeCount: state.graph.edges.length,
              algorithmName: definition.name,
              path: result.path,
              cost: result.pathCost,
              hops: result.hopCount,
              time: Number(result.executionTime || 0).toFixed(2),
              nodesVisited: result.nodesVisited,
              otherResultsSummary,
              triggerRect: event.currentTarget.getBoundingClientRect(),
            });
          }}
        />
      </div>
      {expanded && (
        <div className="detail-report-body">
          <div className="label">Route Taken</div>
          <div className="route-pills">
            {result.found ? result.path.map((node, index) => (
              <span key={`${id}-${node}-${index}`}><b>{node}</b>{index < result.path.length - 1 && <i>→</i>}</span>
            )) : <em>No valid path</em>}
          </div>
          <div className="label">Path Breakdown</div>
          <table className="report-table"><thead><tr><th>Edge</th><th>Weight</th><th>Cumulative</th></tr></thead><tbody>
            {rows.map((row) => <tr key={row.edge}><td>{row.edge}</td><td>{row.weight}</td><td>{row.cumulative}</td></tr>)}
            <tr><td>Total</td><td>-</td><td>{result.found ? result.pathCost : 'No path'}</td></tr>
          </tbody></table>
          <div className="report-grid">
            <div><span>Nodes Visited</span><b>{result.nodesVisited} of {totalNodes} ({visitedPercent}%)</b></div>
            <div><span>Edges Explored</span><b>{countSteps(result, ['RELAX', 'VISIT', 'EXPLORE', 'TRY'])}</b></div>
            <div><span>Edges Rejected</span><b>{countSteps(result, ['REJECT'])}{id === 'backtrack' ? ` (threshold ${state.routing.congestionThreshold})` : ''}</b></div>
            {id === 'backtrack' && <div><span>Backtrack Count</span><b>{countSteps(result, ['BACKTRACK'])}</b></div>}
            {id === 'backtrack' && <div><span>Dead Ends Hit</span><b>{countSteps(result, ['BACKTRACK'])}</b></div>}
            <div><span>Execution Time</span><b>{Number(result.executionTime || 0).toFixed(2)}ms</b></div>
            <div><span>vs Network Avg</span><b>{avgDelta.amount.toFixed(1)}% {avgDelta.label} than avg</b></div>
            <div><span>vs Winner</span><b>{winnerDelta.amount.toFixed(1)}% {winnerDelta.label} than winner</b></div>
          </div>
          <p className="behavior-note">{note}</p>
        </div>
      )}
    </section>
  );
}

export function WinnerAnalysis({ state, ai }) {
  const results = resultSet(state);
  const winner = determineWinner(results);
  if (state.mode !== 'ANALYZE' || !winner.winnerId) return null;
  const winnerResult = results[winner.winnerId];
  const winnerDefinition = algorithmDefinitions[winner.winnerId];
  const averages = resultAverages(results);
  const bestCostDelta = averages.pathCost ? ((averages.pathCost - winnerResult.pathCost) / averages.pathCost) * 100 : 0;
  const timeRank = winner.rows.slice().sort((a, b) => a.result.executionTime - b.result.executionTime).findIndex((row) => row.id === winner.winnerId) + 1;
  const ideal = idealUseCase(state.graph, results, winner.winnerId);

  return (
    <section className="winner-analysis">
      <header>
        <Trophy size={18} />
        <h3>Winner: {winnerDefinition.name}</h3>
        <AskButton label="AI" onAsk={(event) => ai.explain('WINNER', { winner: winner.winnerId, results, topologyName: state.activePreset, scoringBreakdown: winner.breakdown, triggerRect: event.currentTarget.getBoundingClientRect() })} />
      </header>
      <div className="composite-score">Composite Score: <b>{winner.scores[winner.winnerId]}/100</b></div>
      <Bar label="Path Cost" value={winner.breakdown[winner.winnerId].pathCostPoints} max={40} />
      <Bar label="Hop Count" value={winner.breakdown[winner.winnerId].hopCountPoints} max={25} />
      <Bar label="Exec Speed" value={winner.breakdown[winner.winnerId].executionPoints} max={25} />
      <Bar label="Efficiency" value={winner.breakdown[winner.winnerId].explorationPoints} max={10} />
      <div className="report-grid">
        <div><span>Best path cost</span><b>{winnerResult.pathCost} (avg {averages.pathCost.toFixed(1)}, {Math.max(0, bestCostDelta).toFixed(1)}% better)</b></div>
        <div><span>Execution time</span><b>{Number(winnerResult.executionTime || 0).toFixed(2)}ms (ranked #{timeRank} of {winner.rows.length})</b></div>
        <div><span>Hops used</span><b>{winnerResult.hopCount}</b></div>
      </div>
      <table className="report-table comparison-table"><thead><tr><th>Algorithm</th><th>Cost</th><th>Hops</th><th>Time</th><th>Score</th><th>vs Winner</th><th /></tr></thead><tbody>
        {winner.rows.map((row) => {
          const scoreDelta = winner.scores[row.id] - winner.scores[winner.winnerId];
          return (
            <tr key={row.id} style={{ '--algo-color': algorithmDefinitions[row.id]?.colorVar || 'var(--accent-cyan)' }}>
              <td>{row.id === winner.winnerId ? '* ' : ''}{algorithmDefinitions[row.id]?.name || row.id}</td>
              <td>{row.result.pathCost}</td><td>{row.result.hopCount}</td><td>{Number(row.result.executionTime || 0).toFixed(2)}ms</td><td>{winner.scores[row.id]}</td><td>{row.id === winner.winnerId ? '-' : `${scoreDelta.toFixed(1)}%`}</td>
              <td><AskButton label="AI" onAsk={(event) => ai.explain('ALGORITHM_COMPARISON', { algorithmId: row.id, winnerId: winner.winnerId, result: row.result, winnerResult, triggerRect: event.currentTarget.getBoundingClientRect() })} /></td>
            </tr>
          );
        })}
      </tbody></table>
      <div className="ideal-use-case"><span>{ideal}</span><AskButton label="AI" onAsk={(event) => ai.explain('IDEAL_USE_CASE', { idealUseCase: ideal, winner: winner.winnerId, topologyName: state.activePreset, triggerRect: event.currentTarget.getBoundingClientRect() })} /></div>
    </section>
  );
}
