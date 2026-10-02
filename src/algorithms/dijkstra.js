import { createGraphApi, reconstructPath } from '../utils/graphUtils.js';

export const dijkstraPseudocode = [
  'function DIJKSTRA(graph, source, destination):',
  '  dist[source] = 0',
  '  dist[v] = infinity for all other vertices v',
  '  pq = priority queue containing (0, source)',
  '',
  '  while pq is not empty:',
  '    (cost, u) = pq.extractMin()',
  '    if u == destination: return path',
  '    if cost > dist[u]: skip',
  '',
  '    for each neighbor v of u:',
  '      newCost = dist[u] + weight(u, v)',
  '      if newCost < dist[v]:',
  '        dist[v] = newCost',
  '        pq.insert(newCost, v)',
  '        prev[v] = u',
  '',
  '  return NO_PATH_FOUND',
];

class MinHeap {
  constructor() { this.items = []; }
  push(item) {
    this.items.push(item);
    this.bubble(this.items.length - 1);
  }
  pop() {
    if (this.items.length <= 1) return this.items.pop();
    const min = this.items[0];
    this.items[0] = this.items.pop();
    this.sink(0);
    return min;
  }
  get size() { return this.items.length; }
  bubble(index) {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.items[parent].cost <= this.items[index].cost) break;
      [this.items[parent], this.items[index]] = [this.items[index], this.items[parent]];
      index = parent;
    }
  }
  sink(index) {
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      let smallest = index;
      if (left < this.items.length && this.items[left].cost < this.items[smallest].cost) smallest = left;
      if (right < this.items.length && this.items[right].cost < this.items[smallest].cost) smallest = right;
      if (smallest === index) break;
      [this.items[index], this.items[smallest]] = [this.items[smallest], this.items[index]];
      index = smallest;
    }
  }
}

export function dijkstra(graph, source, destination) {
  const started = performance.now();
  const api = createGraphApi(graph);
  const steps = [];
  const dist = {};
  const prev = {};
  api.getAllNodes().forEach((node) => { dist[node.id] = Infinity; });
  dist[source] = 0;
  const pq = new MinHeap();
  pq.push({ node: source, cost: 0 });
  steps.push({ type: 'INIT', node: source, distances: { ...dist }, message: `Dijkstra starts at ${source}.`, pseudocodeLine: 3, algorithmId: 'dijkstra' });
  let nodesVisited = 0;
  while (pq.size) {
    const { node, cost } = pq.pop();
    if (cost > dist[node]) {
      steps.push({ type: 'SKIP', node, distances: { ...dist }, message: `${node} is skipped because a cheaper route already exists.`, pseudocodeLine: 8, algorithmId: 'dijkstra' });
      continue;
    }
    nodesVisited += 1;
    steps.push({ type: 'VISIT', node, distances: { ...dist }, message: `Visiting ${node} at cost ${cost}.`, pseudocodeLine: 6, algorithmId: 'dijkstra' });
    if (node === destination) {
      const path = reconstructPath(prev, source, destination);
      steps.push({ type: 'FOUND', node, path, message: `Shortest weighted path found with cost ${dist[destination]}.`, pseudocodeLine: 7, algorithmId: 'dijkstra' });
      return { algorithmId: 'dijkstra', found: true, path, pathCost: dist[destination], hopCount: path.length - 1, nodesVisited, executionTime: performance.now() - started, steps };
    }
    api.getNeighbors(node).forEach(({ neighbor, weight }) => {
      const newCost = dist[node] + weight;
      if (newCost < dist[neighbor]) {
        dist[neighbor] = newCost;
        prev[neighbor] = node;
        pq.push({ node: neighbor, cost: newCost });
        steps.push({ type: 'RELAX', node: neighbor, edge: { from: node, to: neighbor }, distances: { ...dist }, path: reconstructPath(prev, source, neighbor), message: `Relaxed ${node}->${neighbor}; new cost is ${newCost}.`, pseudocodeLine: 12, algorithmId: 'dijkstra' });
      }
    });
  }
  steps.push({ type: 'NO_PATH', message: `No route from ${source} to ${destination}.`, pseudocodeLine: 17, algorithmId: 'dijkstra' });
  return { algorithmId: 'dijkstra', found: false, path: [], pathCost: Infinity, hopCount: 0, nodesVisited, executionTime: performance.now() - started, steps };
}
