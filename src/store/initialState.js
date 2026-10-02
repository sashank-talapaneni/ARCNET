import { cloneTopology } from '../utils/topologies.js';

const initialTopology = cloneTopology('CUSTOM');

export const initialDynamicSession = {
  active: false,
  selectedAlgorithm: 'dijkstra',
  status: 'IDLE',
  currentPath: [],
  currentPathCost: 0,
  currentPathHops: 0,
  isCurrentPathOptimal: false,
  activeFailures: {
    nodes: [],
    links: [],
  },
  eventFeed: [],
  pathHistory: [],
  stats: {
    totalEvents: 0,
    successfulReroutes: 0,
    failedReroutes: 0,
    pathChanges: 0,
    disconnectedMs: 0,
    sessionStartTime: null,
    disconnectedSince: null,
  },
  resilienceScore: null,
  sessionReport: null,
  eventConfig: {
    baseInterval: 6,
    enableNodeCrash: true,
    enableLinkSpike: true,
    enableRecoveries: true,
    sessionDuration: 60,
  },
};

export const initialState = {
  mode: 'BUILD',
  graph: initialTopology.graph,
  activePreset: 'CUSTOM',
  algorithms: {
    dijkstra: { active: true, color: 'var(--algo-dijkstra)', results: null },
    floyd: { active: true, color: 'var(--algo-floyd)', results: null },
    bfs: { active: true, color: 'var(--algo-bfs)', results: null },
    dfs: { active: true, color: 'var(--algo-dfs)', results: null },
    backtrack: { active: true, color: 'var(--algo-backtrack)', results: null },
  },
  routing: { source: initialTopology.source, destination: initialTopology.destination, congestionThreshold: 10 },
  simulation: { running: false, paused: false, speed: 1, currentStep: 0, totalSteps: 0, allSteps: [], completedAlgorithms: [], visual: {}, history: [], recomputing: false, transitionPhase: null, pathChanges: {} },
  rightPanelTab: 'METRICS',
  focusedAlgorithm: 'dijkstra',
  eventLog: [],
  ai: { globalAssistantOpen: false, globalAssistantHistory: [], activeExplanation: null },
  explanation: {
    analysisContent: null,
    dynamicContent: null,
    analysisLoading: false,
    dynamicLoading: false,
    analysisError: null,
    dynamicError: null,
  },
  onboarding: { completed: localStorage.getItem('arcnet-onboarding') === 'complete', currentStep: 0 },
  selectedEdge: null,
  selectedNode: null,
  simulationMode: null,
  dynamicSession: initialDynamicSession,
};
