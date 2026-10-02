import { createGraphApi, reconstructPath, calculatePathCost } from '../utils/graphUtils.js';

export const bfsPseudocode = [
  'function BFS(graph, source, destination):',
  '  queue = [source]',
  '  visited = {source}',
  '  parent = {}',
  '',
  '  while queue is not empty:',
  '    node = queue.dequeue()',
  '    if node == destination:',
  '      return reconstructPath(parent, destination)',
  '',
  '    for each neighbor n of node:',
  '      if n not in visited:',
  '        visited.add(n)',
  '        parent[n] = node',
  '        queue.enqueue(n)',
  '',
  '  return NO_PATH_FOUND',
];

export function bfs(graph, source, destination) {
  const started = performance.now();
  const api = createGraphApi(graph);
  const queue = [source];
  const visited = new Set([source]);
  const parent = {};
  const steps = [{ type: 'ENQUEUE', node: source, message: `BFS enqueues ${source}.`, pseudocodeLine: 1, algorithmId: 'bfs' }];
  while (queue.length) {
    const node = queue.shift();
    steps.push({ type: 'DEQUEUE', node, message: `Dequeued ${node}.`, pseudocodeLine: 6, algorithmId: 'bfs' });
    if (node === destination) {
      const path = reconstructPath(parent, source, destination);
      steps.push({ type: 'FOUND', node, path, message: `Minimum-hop route found in ${path.length - 1} hops.`, pseudocodeLine: 8, algorithmId: 'bfs' });
      return { algorithmId: 'bfs', found: true, path, pathCost: calculatePathCost(graph, path), hopCount: path.length - 1, nodesVisited: visited.size, executionTime: performance.now() - started, steps };
    }
    api.getNeighbors(node).forEach(({ neighbor }) => {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        parent[neighbor] = node;
        queue.push(neighbor);
        steps.push({ type: 'VISIT', node: neighbor, edge: { from: node, to: neighbor }, path: reconstructPath(parent, source, neighbor), message: `BFS discovers ${neighbor} from ${node}.`, pseudocodeLine: 12, algorithmId: 'bfs' });
      }
    });
  }
  steps.push({ type: 'NO_PATH', message: `No minimum-hop route reaches ${destination}.`, pseudocodeLine: 16, algorithmId: 'bfs' });
  return { algorithmId: 'bfs', found: false, path: [], pathCost: Infinity, hopCount: 0, nodesVisited: visited.size, executionTime: performance.now() - started, steps };
}
