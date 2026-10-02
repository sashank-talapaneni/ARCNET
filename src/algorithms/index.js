import { dijkstra, dijkstraPseudocode } from './dijkstra.js';
import { floydWarshall, floydWarshallPseudocode } from './floydWarshall.js';
import { bfs, bfsPseudocode } from './bfs.js';
import { dfs, dfsPseudocode } from './dfs.js';
import { backtrackingRoute, backtrackingPseudocode } from './backtracking.js';

export const algorithmDefinitions = {
  dijkstra: { id: 'dijkstra', name: 'Dijkstra', colorVar: 'var(--algo-dijkstra)', run: dijkstra, pseudocode: dijkstraPseudocode },
  floyd: { id: 'floyd', name: 'Floyd-Warshall', colorVar: 'var(--algo-floyd)', run: floydWarshall, pseudocode: floydWarshallPseudocode },
  bfs: { id: 'bfs', name: 'BFS', colorVar: 'var(--algo-bfs)', run: bfs, pseudocode: bfsPseudocode },
  dfs: { id: 'dfs', name: 'DFS', colorVar: 'var(--algo-dfs)', run: dfs, pseudocode: dfsPseudocode },
  backtrack: { id: 'backtrack', name: 'Backtracking', colorVar: 'var(--algo-backtrack)', run: backtrackingRoute, pseudocode: backtrackingPseudocode },
};

export function runAlgorithm(id, graph, source, destination, threshold) {
  const definition = algorithmDefinitions[id];
  if (!definition) throw new Error(`Unknown algorithm: ${id}`);
  return id === 'backtrack'
    ? definition.run(graph, source, destination, threshold)
    : definition.run(graph, source, destination);
}
