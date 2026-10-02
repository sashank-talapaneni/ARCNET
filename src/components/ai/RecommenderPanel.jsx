import { Trophy } from 'lucide-react';
import { algorithmDefinitions } from '../../algorithms/index.js';
import { getWinner, scoreResults } from '../../utils/metricsUtils.js';
import AskButton from './AskButton.jsx';

export default function RecommenderPanel({ state, ai }) {
  const results = Object.fromEntries(Object.entries(state.algorithms).map(([id, cfg]) => [id, cfg.results]).filter(([, result]) => result));
  const winner = getWinner(results);
  const scores = scoreResults(results);
  const winnerResult = results[winner];
  const rows = Object.entries(results).filter(([id]) => algorithmDefinitions[id]);

  return (
    <div className="recommender">
      <section className="winner">
        <Trophy size={20} />
        <span className="label">Best For This Network</span>
        <h3 style={{ color: algorithmDefinitions[winner]?.colorVar }}>{algorithmDefinitions[winner]?.name || 'No winner'}</h3>
        <AskButton onAsk={(event) => ai.explain('AUTO_RECOMMEND', { results, triggerRect: event.currentTarget.getBoundingClientRect() })} />
      </section>
      {ai.autoRecommendationLoading && <p>Analyzing recommendation...</p>}
      <p>{ai.autoRecommendation || (winnerResult ? `${algorithmDefinitions[winner]?.name || winner} leads with cost ${winnerResult.pathCost}, ${winnerResult.hopCount} hops, and ${winnerResult.nodesVisited} visited nodes on this topology.` : 'No successful route is available yet. Run a simulation or restore connectivity to unlock recommendations.')}</p>
      <table>
        <thead><tr><th>Algorithm</th><th>Cost</th><th>Hops</th><th>Time</th><th>Score</th></tr></thead>
        <tbody>
          {rows.map(([id, result]) => (
            <tr key={id}><td>{algorithmDefinitions[id].name}</td><td>{result.found ? result.pathCost : 'No path'}</td><td>{result.found ? result.hopCount : '-'}</td><td>{Number(result.executionTime || 0).toFixed(2)}</td><td>{scores[id] || 0}</td></tr>
          ))}
          {rows.length === 0 && <tr><td colSpan="5">No completed algorithm results yet.</td></tr>}
        </tbody>
      </table>
      <details open>
        <summary>When To Use Each</summary>
        <p>Dijkstra: weighted shortest paths. Floyd-Warshall: all-pairs analysis. BFS: fewest hops. DFS: reachability tracing. Backtracking: hard congestion constraints.</p>
      </details>
    </div>
  );
}
