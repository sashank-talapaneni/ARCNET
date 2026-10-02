import assert from 'node:assert/strict';
import { dijkstra } from '../src/algorithms/dijkstra.js';
import { bfs } from '../src/algorithms/bfs.js';
import { dfs } from '../src/algorithms/dfs.js';
import { floydWarshall } from '../src/algorithms/floydWarshall.js';
import { backtrackingRoute } from '../src/algorithms/backtracking.js';
import { hasReachablePath } from '../src/utils/graphUtils.js';
import { determineWinner } from '../src/utils/metricsUtils.js';
import { buildAnalysisExplanationPrompt, buildDynamicExplanationPrompt } from '../src/utils/aiPrompts.js';

const graph = {
  nodes: ['A', 'B', 'C', 'D', 'E'].map((id) => ({ id, label: id, x: 0, y: 0 })),
  edges: [
    { id: 'ab', from: 'A', to: 'B', weight: 1 },
    { id: 'ac', from: 'A', to: 'C', weight: 5 },
    { id: 'be', from: 'B', to: 'E', weight: 9 },
    { id: 'bd', from: 'B', to: 'D', weight: 2 },
    { id: 'cd', from: 'C', to: 'D', weight: 1 },
    { id: 'de', from: 'D', to: 'E', weight: 2 },
  ],
};

const d = dijkstra(graph, 'A', 'E');
assert.equal(d.found, true);
assert.deepEqual(d.path, ['A', 'B', 'D', 'E']);
assert.equal(d.pathCost, 5);

const f = floydWarshall(graph, 'A', 'E');
assert.equal(f.found, true);
assert.deepEqual(f.path, ['A', 'B', 'D', 'E']);
assert.equal(f.pathCost, 5);

const b = bfs(graph, 'A', 'E');
assert.equal(b.found, true);
assert.deepEqual(b.path, ['A', 'B', 'E']);
assert.equal(b.hopCount, 2);

const depth = dfs(graph, 'A', 'E');
assert.equal(depth.found, true);
assert.equal(depth.path[0], 'A');
assert.equal(depth.path.at(-1), 'E');

const constrained = backtrackingRoute(graph, 'A', 'E', 4);
assert.equal(constrained.found, true);
assert.deepEqual(constrained.path, ['A', 'B', 'D', 'E']);
assert.equal(constrained.steps.some((step) => step.type === 'REJECT' && step.edge.from === 'B' && step.edge.to === 'E'), true);

const impossible = backtrackingRoute(graph, 'A', 'E', 1);
assert.equal(impossible.found, false);

assert.equal(hasReachablePath(graph, 'A', 'E'), true);
assert.equal(hasReachablePath(graph, 'E', 'A'), false);

const tiedCostResults = {
  fast: { algorithmId: 'fast', found: true, pathCost: 5, hopCount: 3, executionTime: 1, nodesVisited: 3 },
  slow: { algorithmId: 'slow', found: true, pathCost: 5, hopCount: 3, executionTime: 10, nodesVisited: 5 },
  failed: { algorithmId: 'failed', found: false, pathCost: Infinity, hopCount: 0, executionTime: 0, nodesVisited: 0 },
};
const tiedScores = determineWinner(tiedCostResults);
assert.equal(tiedScores.breakdown.fast.pathCostPoints, 40);
assert.equal(tiedScores.breakdown.slow.pathCostPoints, 40);
assert.equal(tiedScores.winnerId, 'fast');
assert.equal(tiedScores.scores.failed, 0);

const differentCostResults = {
  low: { algorithmId: 'low', found: true, pathCost: 5, hopCount: 3, executionTime: 5, nodesVisited: 4 },
  high: { algorithmId: 'high', found: true, pathCost: 10, hopCount: 3, executionTime: 5, nodesVisited: 4 },
};
const differentScores = determineWinner(differentCostResults);
assert.equal(differentScores.breakdown.low.pathCostPoints, 40);
assert.equal(differentScores.breakdown.high.pathCostPoints, 0);

globalThis.localStorage = {
  getItem: () => null,
  setItem: () => {},
};
const { appReducer, ACTIONS } = await import('../src/store/appReducer.js');
const { initialState } = await import('../src/store/initialState.js');
const timingResults = {
  dijkstra: { algorithmId: 'dijkstra', found: true, path: ['A', 'B'], steps: [{ type: 'FOUND', algorithmId: 'dijkstra', path: ['A', 'B'] }] },
  floyd: { algorithmId: 'floyd', found: true, path: ['A', 'B'], steps: [{ type: 'INIT_MATRIX', algorithmId: 'floyd' }, { type: 'EXTRACT_PATH', algorithmId: 'floyd', path: ['A', 'B'] }] },
};
const timingSteps = [
  { ...timingResults.dijkstra.steps[0], logicalIndex: 0 },
  { ...timingResults.floyd.steps[0], logicalIndex: 0 },
  { type: 'IDLE', algorithmId: 'dijkstra', logicalIndex: 1 },
  { ...timingResults.floyd.steps[1], logicalIndex: 1 },
];
let timingState = {
  ...initialState,
  algorithms: {
    dijkstra: { ...initialState.algorithms.dijkstra, active: true },
    floyd: { ...initialState.algorithms.floyd, active: true },
  },
};
timingState = appReducer(timingState, { type: ACTIONS.START_SIMULATION, results: timingResults, steps: timingSteps });
timingState = appReducer(timingState, { type: ACTIONS.APPLY_STEP });
assert.deepEqual(timingState.simulation.completedAlgorithms, ['dijkstra']);
assert.equal(timingState.mode, 'RUN');
timingState = appReducer(timingState, { type: ACTIONS.APPLY_STEP });
timingState = appReducer(timingState, { type: ACTIONS.APPLY_STEP });
assert.deepEqual(timingState.simulation.completedAlgorithms, ['dijkstra']);
timingState = appReducer(timingState, { type: ACTIONS.APPLY_STEP });
assert.deepEqual(timingState.simulation.completedAlgorithms, ['dijkstra', 'floyd']);
assert.equal(timingState.mode, 'ANALYZE');
assert.equal(timingState.simulation.running, false);

let explanationState = {
  ...initialState,
  explanation: {
    ...initialState.explanation,
    analysisContent: 'old analysis',
    dynamicContent: 'old dynamic',
  },
};
explanationState = appReducer(explanationState, {
  type: ACTIONS.SET_EXPLANATION_LOADING,
  payload: { mode: 'analysis' },
});
assert.equal(explanationState.explanation.analysisLoading, true);
assert.equal(explanationState.explanation.analysisError, null);
explanationState = appReducer(explanationState, {
  type: ACTIONS.SET_EXPLANATION_CONTENT,
  payload: { mode: 'analysis', content: 'new analysis' },
});
assert.equal(explanationState.explanation.analysisContent, 'new analysis');
assert.equal(explanationState.explanation.analysisLoading, false);
explanationState = appReducer(explanationState, {
  type: ACTIONS.SET_EXPLANATION_ERROR,
  payload: { mode: 'dynamic', error: 'proxy error' },
});
assert.equal(explanationState.explanation.dynamicError, 'proxy error');
explanationState = appReducer(explanationState, {
  type: ACTIONS.CLEAR_EXPLANATION,
  payload: { mode: 'dynamic' },
});
assert.equal(explanationState.explanation.dynamicContent, null);
assert.equal(explanationState.explanation.dynamicError, null);

const promptState = {
  ...initialState,
  activePreset: 'Campus Network',
  graph,
  routing: { source: 'A', destination: 'E', congestionThreshold: 4 },
  algorithms: {
    ...initialState.algorithms,
    dijkstra: { ...initialState.algorithms.dijkstra, active: true, results: d },
    floyd: { ...initialState.algorithms.floyd, active: true, results: f },
    bfs: { ...initialState.algorithms.bfs, active: false, results: b },
    dfs: { ...initialState.algorithms.dfs, active: false, results: depth },
    backtrack: { ...initialState.algorithms.backtrack, active: true, results: constrained },
  },
};
const analysisPrompt = buildAnalysisExplanationPrompt(promptState);
assert.equal(analysisPrompt.includes('Topology: Campus Network'), true);
assert.equal(analysisPrompt.includes(`Dijkstra: found path A\u2192B\u2192D\u2192E at cost 5`), true);
assert.equal(analysisPrompt.includes('Backtracking made 1 edge rejections'), true);

const dynamicPromptState = {
  ...promptState,
  dynamicSession: {
    ...initialState.dynamicSession,
    selectedAlgorithm: 'dijkstra',
    resilienceScore: 82,
    stats: {
      ...initialState.dynamicSession.stats,
      successfulReroutes: 1,
      failedReroutes: 1,
      pathChanges: 1,
      disconnectedMs: 2500,
    },
    pathHistory: [
      { timestamp: 0, path: ['A', 'B', 'D', 'E'], cost: 5, reason: 'INITIAL', costChange: null },
      { timestamp: 12000, path: [], cost: null, reason: 'DISCONNECTED', costChange: null },
    ],
    eventFeed: [
      { type: 'REROUTE_FAILED', headline: 'No valid route' },
      { type: 'LINK_SPIKE', headline: 'B->D cost spiked' },
      { type: 'NODE_CRASH', headline: 'Node D crashed' },
    ],
    sessionReport: {
      algorithmId: 'dijkstra',
      durationSeconds: 30,
      resilienceScore: 82,
      eventCounts: { total: 2 },
    },
  },
};
const dynamicPrompt = buildDynamicExplanationPrompt(dynamicPromptState);
assert.equal(dynamicPrompt.includes('Algorithm: Dijkstra'), true);
assert.equal(dynamicPrompt.includes('Node D crashed'), true);
assert.equal(dynamicPrompt.includes('00:12: DISCONNECTED'), true);
assert.equal(dynamicPrompt.includes('RESILIENCE SCORE: 82/100'), true);

const resetAnalysisState = appReducer({
  ...promptState,
  explanation: { ...initialState.explanation, analysisContent: 'stale', analysisError: 'stale error' },
}, {
  type: ACTIONS.START_SIMULATION,
  results: { dijkstra: d, floyd: f, backtrack: constrained },
  steps: [],
});
assert.equal(resetAnalysisState.explanation.analysisContent, null);
assert.equal(resetAnalysisState.explanation.analysisError, null);

const resetDynamicState = appReducer({
  ...dynamicPromptState,
  explanation: { ...initialState.explanation, dynamicContent: 'stale', dynamicError: 'stale error' },
}, { type: ACTIONS.START_DYNAMIC_SESSION });
assert.equal(resetDynamicState.explanation.dynamicContent, null);
assert.equal(resetDynamicState.explanation.dynamicError, null);

console.log('Algorithm tests passed.');
