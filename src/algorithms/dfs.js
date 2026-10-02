import { createGraphApi, calculatePathCost } from '../utils/graphUtils.js';

export const dfsPseudocode = [
  'function DFS(graph, source, destination):',
  '  visited = {}',
  '  path = []',
  '',
  '  function explore(node):',
  '    visited.add(node)',
  '    path.push(node)',
  '    if node == destination: return true',
  '',
  '    for each neighbor n of node:',
  '      if n not in visited:',
  '        if explore(n): return true',
  '',
  '    path.pop()',
  '    return false',
  '',
  '  explore(source)',
  '  return path or NO_PATH_FOUND',
];

export function dfs(graph, source, destination) {
  const started = performance.now();
  const api = createGraphApi(graph);
  const visited = new Set();
  const path = [];
  const steps = [];
  function explore(node) {
    visited.add(node);
    path.push(node);
    steps.push({ type: 'VISIT', node, currentPath: [...path], message: `DFS enters ${node}.`, pseudocodeLine: 5, algorithmId: 'dfs' });
    if (node === destination) {
      steps.push({ type: 'FOUND', node, path: [...path], message: `DFS found a route to ${destination}.`, pseudocodeLine: 7, algorithmId: 'dfs' });
      return true;
    }
    for (const { neighbor } of api.getNeighbors(node)) {
      if (!visited.has(neighbor)) {
        steps.push({ type: 'EXPLORE', edge: { from: node, to: neighbor }, currentPath: [...path, neighbor], message: `DFS explores ${node}->${neighbor}.`, pseudocodeLine: 10, algorithmId: 'dfs' });
        if (explore(neighbor)) return true;
      }
    }
    path.pop();
    steps.push({ type: 'BACKTRACK', node, currentPath: [...path], message: `DFS backtracks from ${node}.`, pseudocodeLine: 13, algorithmId: 'dfs' });
    return false;
  }
  const found = explore(source);
  const finalPath = found ? [...path] : [];
  return { algorithmId: 'dfs', found, path: finalPath, pathCost: found ? calculatePathCost(graph, finalPath) : Infinity, hopCount: Math.max(0, finalPath.length - 1), nodesVisited: visited.size, executionTime: performance.now() - started, steps };
}
