import { createGraphApi, calculatePathCost } from '../utils/graphUtils.js';

export const backtrackingPseudocode = [
  'function BACKTRACK_ROUTE(graph, source, dest, threshold T):',
  '  visited = {}',
  '  path = []',
  '',
  '  function backtrack(node):',
  '    ADD node to path, MARK as visited',
  '',
  '    IF node == destination: RETURN path',
  '',
  '    FOR each neighbor n of node:',
  '      IF n already visited: SKIP',
  '',
  '      IF weight(node->n) > T:',
  '        REJECT edge',
  '        CONTINUE to next neighbor',
  '',
  '      TRY backtrack(n)',
  '      IF successful: RETURN path',
  '',
  '      reaching here means dead end',
  '      BACKTRACK: remove n, unmark visited',
  '',
  '    RETURN failure',
  '',
  '  RETURN backtrack(source)',
];

export function backtrackingRoute(graph, source, destination, threshold = 10) {
  const started = performance.now();
  const api = createGraphApi(graph);
  const visited = new Set();
  const path = [];
  const steps = [];
  function backtrack(node) {
    path.push(node);
    visited.add(node);
    steps.push({ type: 'VISIT', node, currentPath: [...path], message: `Backtracking visits ${node}.`, pseudocodeLine: 5, algorithmId: 'backtrack' });
    if (node === destination) {
      steps.push({ type: 'FOUND', node, path: [...path], message: `Valid constraint path found under threshold ${threshold}.`, pseudocodeLine: 7, algorithmId: 'backtrack' });
      return true;
    }
    for (const { neighbor, weight } of api.getNeighbors(node)) {
      if (visited.has(neighbor)) {
        steps.push({ type: 'SKIP', node: neighbor, edge: { from: node, to: neighbor }, currentPath: [...path], message: `${neighbor} already visited; skipping cycle.`, pseudocodeLine: 10, algorithmId: 'backtrack' });
        continue;
      }
      if (weight > threshold) {
        steps.push({ type: 'REJECT', edge: { from: node, to: neighbor }, weight, threshold, currentPath: [...path], message: `Edge ${node}->${neighbor} REJECTED: weight ${weight} exceeds threshold ${threshold}.`, pseudocodeLine: 13, algorithmId: 'backtrack' });
        continue;
      }
      steps.push({ type: 'TRY', edge: { from: node, to: neighbor }, weight, threshold, currentPath: [...path, neighbor], message: `Trying edge ${node}->${neighbor} (weight ${weight} <= threshold ${threshold}).`, pseudocodeLine: 16, algorithmId: 'backtrack' });
      if (backtrack(neighbor)) return true;
      steps.push({ type: 'BACKTRACK', edge: { from: neighbor, to: node }, currentPath: [...path], message: `No valid path through ${neighbor}. Backtracking to ${node}.`, pseudocodeLine: 20, algorithmId: 'backtrack' });
    }
    path.pop();
    visited.delete(node);
    return false;
  }
  const found = backtrack(source);
  const finalPath = found ? [...path] : [];
  return { algorithmId: 'backtrack', found, path: finalPath, steps, pathCost: found ? calculatePathCost(graph, finalPath) : Infinity, hopCount: Math.max(0, finalPath.length - 1), nodesVisited: steps.filter((step) => step.type === 'VISIT').length, executionTime: performance.now() - started };
}
