import { createGraphApi, calculatePathCost } from '../utils/graphUtils.js';

export const floydWarshallPseudocode = [
  'function FLOYD_WARSHALL(graph):',
  '  dist[i][j] = weight(i,j) if edge exists',
  '  dist[i][j] = infinity if no direct edge',
  '  dist[i][i] = 0 for all i',
  '',
  '  for k = 0 to n-1:',
  '    for i = 0 to n-1:',
  '      for j = 0 to n-1:',
  '        if dist[i][k] + dist[k][j] < dist[i][j]:',
  '          dist[i][j] = dist[i][k] + dist[k][j]',
  '          pred[i][j] = pred[k][j]',
  '',
  'return dist, pred matrices',
  'extract path: trace pred[source][dest] backwards',
];

function extractPath(ids, pred, sourceIndex, destinationIndex) {
  if (pred[sourceIndex][destinationIndex] === null) return [];
  const path = [ids[destinationIndex]];
  let cursor = destinationIndex;
  while (cursor !== sourceIndex) {
    cursor = pred[sourceIndex][cursor];
    if (cursor === null) return [];
    path.unshift(ids[cursor]);
  }
  return path;
}

export function floydWarshall(graph, source, destination) {
  const started = performance.now();
  const api = createGraphApi(graph);
  const nodes = api.getAllNodes();
  const ids = nodes.map((node) => node.id);
  const index = new Map(ids.map((id, i) => [id, i]));
  const n = ids.length;
  const dist = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (__, j) => (i === j ? 0 : Infinity)));
  const pred = Array.from({ length: n }, () => Array.from({ length: n }, () => null));
  const steps = [{ type: 'INIT_MATRIX', message: 'Floyd-Warshall initializes distance and predecessor matrices.', pseudocodeLine: 3, algorithmId: 'floyd' }];
  api.getAllEdges().forEach((edge) => {
    const i = index.get(edge.from);
    const j = index.get(edge.to);
    dist[i][j] = Number(edge.weight);
    pred[i][j] = i;
  });
  for (let k = 0; k < n; k += 1) {
    for (let i = 0; i < n; i += 1) {
      for (let j = 0; j < n; j += 1) {
        steps.push({ type: 'ITERATE', node: ids[k], message: `Testing ${ids[i]} -> ${ids[j]} through ${ids[k]}.`, pseudocodeLine: 7, algorithmId: 'floyd' });
        if (dist[i][k] + dist[k][j] < dist[i][j]) {
          dist[i][j] = dist[i][k] + dist[k][j];
          pred[i][j] = pred[k][j];
          steps.push({ type: 'UPDATE', node: ids[j], path: extractPath(ids, pred, i, j), message: `Updated ${ids[i]} -> ${ids[j]} to ${dist[i][j]}.`, pseudocodeLine: 8, algorithmId: 'floyd' });
        }
      }
    }
  }
  const sourceIndex = index.get(source);
  const destinationIndex = index.get(destination);
  const path = sourceIndex === undefined || destinationIndex === undefined ? [] : extractPath(ids, pred, sourceIndex, destinationIndex);
  const found = path.length > 0 || source === destination;
  const finalPath = source === destination ? [source] : path;
  steps.push({ type: found ? 'EXTRACT_PATH' : 'COMPLETE', path: finalPath, message: found ? `Extracted all-pairs shortest path with cost ${calculatePathCost(graph, finalPath)}.` : `No Floyd-Warshall route reaches ${destination}.`, pseudocodeLine: 13, algorithmId: 'floyd' });
  return { algorithmId: 'floyd', found, path: finalPath, pathCost: found ? calculatePathCost(graph, finalPath) : Infinity, hopCount: Math.max(0, finalPath.length - 1), nodesVisited: n, executionTime: performance.now() - started, steps };
}
