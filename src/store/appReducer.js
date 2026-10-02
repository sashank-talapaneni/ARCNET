import { initialDynamicSession, initialState } from './initialState.js';
import { cloneTopology } from '../utils/topologies.js';

function computeDynamicResilienceScore(stats) {
  // Must mirror computeScore() in src/hooks/useDynamicSimulation.js exactly.
  const disconnectedPenalty = Math.min(35, (stats.disconnectedMs / 1000) * 1.5);
  const failurePenalty = stats.failedReroutes * 12;
  const eventPenalty = Math.max(0, stats.totalEvents - stats.successfulReroutes) * 4;
  const adaptationBonus = Math.min(12, stats.pathChanges * 2);
  return Math.max(0, Math.min(100, Math.round(100 - disconnectedPenalty - failurePenalty - eventPenalty + adaptationBonus)));
}

const prependEvent = (event, eventLog) => [{ timestamp: Date.now(), ...event }, ...eventLog];
const maxEdgeWeight = (graph) => Math.max(...graph.edges.map((edge) => Number(edge.weight) || 0), 1);
const edgeKey = (from, to) => `${from}->${to}`;
const pathEdgeKeys = (path = []) => path.slice(0, -1).map((node, index) => edgeKey(node, path[index + 1]));
const elapsed = (session) => Date.now() - (session.stats.sessionStartTime || Date.now());

function baseVisualSlice(algorithmId) {
  return {
    algorithmId,
    path: [],
    edgeModes: {},
    rejectedEdges: {},
    lastType: null,
    line: null,
    message: '',
  };
}

export const ACTIONS = {
  SET_MODE: 'SET_MODE',
  LOAD_PRESET: 'LOAD_PRESET',
  ADD_NODE: 'ADD_NODE',
  REMOVE_NODE: 'REMOVE_NODE',
  ADD_EDGE: 'ADD_EDGE',
  SET_CUSTOM_GRAPH: 'SET_CUSTOM_GRAPH',
  REMOVE_EDGE: 'REMOVE_EDGE',
  UPDATE_EDGE_WEIGHT: 'UPDATE_EDGE_WEIGHT',
  INJECT_CONGESTION: 'INJECT_CONGESTION',
  CLEAR_CONGESTION: 'CLEAR_CONGESTION',
  CLEAR_ALL_CONGESTION: 'CLEAR_ALL_CONGESTION',
  SET_CONGESTED: 'SET_CONGESTED',
  SET_NODE_FAILED: 'SET_NODE_FAILED',
  CLEAR_NODE_FAILURES: 'CLEAR_NODE_FAILURES',
  SET_ROUTING: 'SET_ROUTING',
  SET_THRESHOLD: 'SET_THRESHOLD',
  TOGGLE_ALGORITHM: 'TOGGLE_ALGORITHM',
  START_SIMULATION: 'START_SIMULATION',
  APPLY_STEP: 'APPLY_STEP',
  STEP_BACK: 'STEP_BACK',
  SET_PLAYING: 'SET_PLAYING',
  SET_SPEED: 'SET_SPEED',
  RESET_SIMULATION: 'RESET_SIMULATION',
  SET_RIGHT_TAB: 'SET_RIGHT_TAB',
  SET_FOCUSED_ALGORITHM: 'SET_FOCUSED_ALGORITHM',
  ADD_EVENT: 'ADD_EVENT',
  SET_AI_EXPLANATION: 'SET_AI_EXPLANATION',
  SET_GLOBAL_ASSISTANT: 'SET_GLOBAL_ASSISTANT',
  ADD_GLOBAL_MESSAGE: 'ADD_GLOBAL_MESSAGE',
  COMPLETE_ONBOARDING: 'COMPLETE_ONBOARDING',
  NEXT_ONBOARDING: 'NEXT_ONBOARDING',
  SELECT_NODE: 'SELECT_NODE',
  SELECT_EDGE: 'SELECT_EDGE',
  START_REROUTE: 'START_REROUTE',
  COMPLETE_REROUTE: 'COMPLETE_REROUTE',
  SET_SIMULATION_MODE: 'SET_SIMULATION_MODE',
  SET_DYNAMIC_ALGORITHM: 'SET_DYNAMIC_ALGORITHM',
  UPDATE_EVENT_CONFIG: 'UPDATE_EVENT_CONFIG',
  START_DYNAMIC_SESSION: 'START_DYNAMIC_SESSION',
  STOP_DYNAMIC_SESSION: 'STOP_DYNAMIC_SESSION',
  SET_DYNAMIC_STATUS: 'SET_DYNAMIC_STATUS',
  SET_DYNAMIC_INITIAL_PATH: 'SET_DYNAMIC_INITIAL_PATH',
  APPLY_NETWORK_EVENT: 'APPLY_NETWORK_EVENT',
  DYNAMIC_REROUTE_SUCCESS: 'DYNAMIC_REROUTE_SUCCESS',
  DYNAMIC_REROUTE_FAILED: 'DYNAMIC_REROUTE_FAILED',
  DYNAMIC_PATH_RESTORED: 'DYNAMIC_PATH_RESTORED',
  ADD_EVENT_FEED_ENTRY: 'ADD_EVENT_FEED_ENTRY',
  UPDATE_RESILIENCE_SCORE: 'UPDATE_RESILIENCE_SCORE',
  SET_DYNAMIC_SESSION_REPORT: 'SET_DYNAMIC_SESSION_REPORT',
  SET_EXPLANATION_LOADING: 'SET_EXPLANATION_LOADING',
  SET_EXPLANATION_CONTENT: 'SET_EXPLANATION_CONTENT',
  SET_EXPLANATION_ERROR: 'SET_EXPLANATION_ERROR',
  CLEAR_EXPLANATION: 'CLEAR_EXPLANATION',
};

function visualForStep(visual, step) {
  if (!step.algorithmId || step.type === 'IDLE') return visual;
  const previous = visual[step.algorithmId] || baseVisualSlice(step.algorithmId);
  const next = { ...visual, [step.algorithmId]: { ...previous, edgeModes: { ...previous.edgeModes }, rejectedEdges: { ...previous.rejectedEdges } } };
  const current = next[step.algorithmId];
  const stepPath = step.currentPath || step.path;
  if (stepPath) current.path = stepPath;
  if (step.edge) {
    current.edge = step.edge;
    const key = edgeKey(step.edge.from, step.edge.to);
    if (step.algorithmId === 'backtrack') {
      if (step.type === 'TRY') {
        current.edgeModes[key] = 'advancing';
      } else if (step.type === 'BACKTRACK') {
        current.edgeModes[edgeKey(step.edge.to, step.edge.from)] = 'retracting';
      } else if (step.type === 'REJECT') {
        current.rejectedEdges[key] = `${Date.now()}-${step.logicalIndex ?? 0}`;
      }
    } else if (step.type !== 'REJECT') {
      current.edgeModes[key] = 'advancing';
    }
  }
  if (step.type === 'FOUND') {
    const finalPath = step.path || step.currentPath || current.path;
    const finalKeys = new Set(pathEdgeKeys(finalPath));
    current.path = finalPath;
    current.edgeModes = Object.fromEntries([...finalKeys].map((key) => [key, 'solid']));
  }
  current.lastType = step.type;
  current.line = step.pseudocodeLine;
  current.message = step.message;
  return next;
}

export function appReducer(state, action) {
  switch (action.type) {
    case ACTIONS.SET_MODE:
      return { ...state, mode: action.mode };
    case ACTIONS.LOAD_PRESET: {
      const preset = cloneTopology(action.preset);
      return { ...state, mode: 'BUILD', activePreset: action.preset, graph: preset.graph, routing: { ...state.routing, source: preset.source, destination: preset.destination, congestionThreshold: maxEdgeWeight(preset.graph) }, simulation: initialState.simulation, eventLog: [] };
    }
    case ACTIONS.ADD_NODE:
      return { ...state, graph: { ...state.graph, nodes: [...state.graph.nodes, action.node] }, activePreset: 'CUSTOM' };
    case ACTIONS.REMOVE_NODE:
      return { ...state, graph: { nodes: state.graph.nodes.filter((node) => node.id !== action.id), edges: state.graph.edges.filter((edge) => edge.from !== action.id && edge.to !== action.id) }, activePreset: 'CUSTOM' };
    case ACTIONS.ADD_EDGE:
      return { ...state, graph: { ...state.graph, edges: [...state.graph.edges, action.edge] }, activePreset: 'CUSTOM' };
    case ACTIONS.SET_CUSTOM_GRAPH:
      return {
        ...state,
        mode: 'BUILD',
        activePreset: 'CUSTOM',
        graph: action.graph,
        routing: { ...state.routing, source: action.source, destination: action.destination, congestionThreshold: maxEdgeWeight(action.graph) },
        algorithms: Object.fromEntries(Object.entries(state.algorithms).map(([id, cfg]) => [id, { ...cfg, results: null }])),
        simulation: initialState.simulation,
        eventLog: [],
      };
    case ACTIONS.REMOVE_EDGE:
      return { ...state, graph: { ...state.graph, edges: state.graph.edges.filter((edge) => edge.id !== action.id) }, activePreset: 'CUSTOM' };
    case ACTIONS.UPDATE_EDGE_WEIGHT:
      return { ...state, graph: { ...state.graph, edges: state.graph.edges.map((edge) => edge.id === action.id ? { ...edge, weight: action.weight } : edge) } };
    case ACTIONS.INJECT_CONGESTION:
      return {
        ...state,
        graph: {
          ...state.graph,
            edges: state.graph.edges.map((edge) => {
              if (edge.id !== action.id) return edge;
              const originalWeight = edge.originalWeight ?? Number(edge.weight);
              return { ...edge, originalWeight, weight: 1000, congested: true };
            }),
          },
          eventLog: prependEvent({ type: 'CONGESTION', message: 'Congestion injected: selected link cost set to 1000.', algorithmId: null }, state.eventLog),
        };
    case ACTIONS.CLEAR_CONGESTION:
      return {
        ...state,
        graph: {
          ...state.graph,
          edges: state.graph.edges.map((edge) => edge.id === action.id ? { ...edge, weight: edge.originalWeight ?? edge.weight, congested: false } : edge),
        },
      };
    case ACTIONS.CLEAR_ALL_CONGESTION:
      return {
        ...state,
        graph: {
          ...state.graph,
          edges: state.graph.edges.map((edge) => ({ ...edge, weight: edge.originalWeight ?? edge.weight, congested: false })),
        },
      };
    case ACTIONS.SET_CONGESTED:
      return { ...state, graph: { ...state.graph, edges: state.graph.edges.map((edge) => edge.id === action.id ? { ...edge, congested: action.congested } : edge) } };
    case ACTIONS.SET_NODE_FAILED:
      return {
        ...state,
        graph: { ...state.graph, nodes: state.graph.nodes.map((node) => node.id === action.id ? { ...node, failed: action.failed } : node) },
        eventLog: prependEvent({ type: 'NODE_FAILURE', message: `${action.id} ${action.failed ? 'marked failed' : 'restored'}.`, algorithmId: null }, state.eventLog),
      };
    case ACTIONS.CLEAR_NODE_FAILURES:
      return { ...state, graph: { ...state.graph, nodes: state.graph.nodes.map((node) => ({ ...node, failed: false })) } };
    case ACTIONS.SET_ROUTING:
      return { ...state, routing: { ...state.routing, ...action.routing } };
    case ACTIONS.SET_THRESHOLD:
      return { ...state, routing: { ...state.routing, congestionThreshold: action.threshold } };
    case ACTIONS.TOGGLE_ALGORITHM:
      return { ...state, algorithms: { ...state.algorithms, [action.id]: { ...state.algorithms[action.id], active: !state.algorithms[action.id].active } } };
    case ACTIONS.START_SIMULATION:
      return {
        ...state,
        mode: 'RUN',
        algorithms: Object.fromEntries(Object.entries(state.algorithms).map(([id, cfg]) => [id, { ...cfg, results: action.results[id] || null, routeUnaffected: false }])),
        simulation: { ...state.simulation, running: true, paused: false, currentStep: 0, totalSteps: action.steps.length, allSteps: action.steps, completedAlgorithms: [], visual: {}, history: [], recomputing: false, transitionPhase: null, pathChanges: {} },
        eventLog: prependEvent({ type: 'SYSTEM', message: 'Simulation started.', algorithmId: null }, state.eventLog),
        explanation: {
          ...state.explanation,
          analysisContent: null,
          analysisLoading: false,
          analysisError: null,
        },
      };
    case ACTIONS.APPLY_STEP: {
      const step = state.simulation.allSteps[state.simulation.currentStep];
      if (!step) return { ...state, mode: 'ANALYZE', simulation: { ...state.simulation, running: false, paused: true, completedAlgorithms: Object.keys(state.algorithms).filter((id) => state.algorithms[id].active) } };
      const nextVisual = visualForStep(state.simulation.visual, step);
      const resultStepCount = state.algorithms[step.algorithmId]?.results?.steps?.length || 0;
      const algorithmCompleted = step.type !== 'IDLE' && step.logicalIndex === resultStepCount - 1;
      const completedAlgorithms = algorithmCompleted && !state.simulation.completedAlgorithms.includes(step.algorithmId)
        ? [...state.simulation.completedAlgorithms, step.algorithmId]
        : state.simulation.completedAlgorithms;
      return { ...state, mode: state.simulation.currentStep + 1 >= state.simulation.totalSteps ? 'ANALYZE' : state.mode, simulation: { ...state.simulation, currentStep: state.simulation.currentStep + 1, running: state.simulation.currentStep + 1 < state.simulation.totalSteps, paused: state.simulation.currentStep + 1 >= state.simulation.totalSteps, completedAlgorithms, visual: nextVisual, history: [...state.simulation.history, state.simulation.visual] }, eventLog: step.type === 'IDLE' ? state.eventLog : prependEvent({ type: step.type, message: step.message, algorithmId: step.algorithmId }, state.eventLog) };
    }
    case ACTIONS.STEP_BACK: {
      const history = [...state.simulation.history];
      const previous = history.pop() || {};
      return { ...state, simulation: { ...state.simulation, currentStep: Math.max(0, state.simulation.currentStep - 1), visual: previous, history } };
    }
    case ACTIONS.SET_PLAYING:
      return { ...state, simulation: { ...state.simulation, running: action.running, paused: !action.running } };
    case ACTIONS.SET_SPEED:
      return { ...state, simulation: { ...state.simulation, speed: action.speed } };
    case ACTIONS.RESET_SIMULATION:
      return { ...state, mode: 'BUILD', algorithms: Object.fromEntries(Object.entries(state.algorithms).map(([id, cfg]) => [id, { ...cfg, results: null }])), simulation: initialState.simulation, eventLog: [] };
    case ACTIONS.SET_RIGHT_TAB:
      return { ...state, rightPanelTab: action.tab };
    case ACTIONS.SET_FOCUSED_ALGORITHM:
      return { ...state, focusedAlgorithm: action.id, rightPanelTab: 'CODE' };
    case ACTIONS.SET_AI_EXPLANATION:
      return { ...state, ai: { ...state.ai, activeExplanation: action.explanation } };
    case ACTIONS.SET_GLOBAL_ASSISTANT:
      return { ...state, ai: { ...state.ai, globalAssistantOpen: action.open } };
    case ACTIONS.ADD_GLOBAL_MESSAGE:
      return { ...state, ai: { ...state.ai, globalAssistantHistory: [...state.ai.globalAssistantHistory, action.message] } };
    case ACTIONS.COMPLETE_ONBOARDING:
      localStorage.setItem('arcnet-onboarding', 'complete');
      return { ...state, onboarding: { completed: true, currentStep: 0 } };
    case ACTIONS.NEXT_ONBOARDING:
      return { ...state, onboarding: { ...state.onboarding, currentStep: state.onboarding.currentStep + 1 } };
    case ACTIONS.SELECT_NODE:
      return { ...state, selectedNode: action.id };
    case ACTIONS.SELECT_EDGE:
      return { ...state, selectedEdge: action.id };
    case ACTIONS.START_REROUTE:
      return {
        ...state,
        graph: action.graph,
        simulation: { ...state.simulation, running: false, paused: true, recomputing: true, transitionPhase: 'fade-out' },
        eventLog: prependEvent({ type: action.eventType || 'REROUTE', message: action.message, algorithmId: null }, state.eventLog),
      };
    case ACTIONS.COMPLETE_REROUTE: {
      const nextVisual = { ...state.simulation.visual };
      action.algorithmIds.forEach((id) => {
        nextVisual[id] = baseVisualSlice(id);
      });
      return {
        ...state,
        algorithms: Object.fromEntries(Object.entries(state.algorithms).map(([id, cfg]) => [id, { ...cfg, results: action.results[id] ? { ...action.results[id], routeUnaffected: action.pathChanges[id] === false } : null, routeUnaffected: action.pathChanges[id] === false }])),
        simulation: { ...state.simulation, running: true, paused: false, currentStep: 0, totalSteps: action.steps.length, allSteps: action.steps, visual: nextVisual, history: [], recomputing: false, transitionPhase: 'fade-in', pathChanges: action.pathChanges },
      };
    }
    case ACTIONS.SET_SIMULATION_MODE:
      return { ...state, simulationMode: action.payload, dynamicSession: action.payload !== state.simulationMode ? initialDynamicSession : state.dynamicSession };
    case ACTIONS.SET_DYNAMIC_ALGORITHM:
      return { ...state, dynamicSession: { ...state.dynamicSession, selectedAlgorithm: action.payload } };
    case ACTIONS.UPDATE_EVENT_CONFIG:
      return { ...state, dynamicSession: { ...state.dynamicSession, eventConfig: { ...state.dynamicSession.eventConfig, ...action.payload } } };
    case ACTIONS.START_DYNAMIC_SESSION: {
      const now = Date.now();
      return {
        ...state,
        mode: 'RUN',
        explanation: {
          ...state.explanation,
          dynamicContent: null,
          dynamicLoading: false,
          dynamicError: null,
        },
        dynamicSession: {
          ...state.dynamicSession,
          active: true,
          status: 'RUNNING',
          currentPath: [],
          currentPathCost: 0,
          currentPathHops: 0,
          isCurrentPathOptimal: false,
          activeFailures: { nodes: [], links: [] },
          eventFeed: [],
          pathHistory: [],
          stats: { ...initialDynamicSession.stats, sessionStartTime: now },
          resilienceScore: 100,
          sessionReport: null,
        },
      };
    }
    case ACTIONS.STOP_DYNAMIC_SESSION:
      return { ...state, mode: 'ANALYZE', dynamicSession: { ...state.dynamicSession, active: false, status: 'COMPLETE' } };
    case ACTIONS.SET_DYNAMIC_STATUS:
      return { ...state, dynamicSession: { ...state.dynamicSession, status: action.payload } };
    case ACTIONS.SET_DYNAMIC_INITIAL_PATH:
      return {
        ...state,
        dynamicSession: {
          ...state.dynamicSession,
          currentPath: action.payload.path,
          currentPathCost: action.payload.pathCost,
          currentPathHops: action.payload.pathHops,
          isCurrentPathOptimal: true,
          pathHistory: [{ timestamp: 0, path: action.payload.path, cost: action.payload.pathCost, hops: action.payload.pathHops, reason: 'INITIAL', costChange: null }],
        },
      };
    case ACTIONS.APPLY_NETWORK_EVENT: {
      const event = action.payload;
      const activeFailures = {
        nodes: [...state.dynamicSession.activeFailures.nodes],
        links: [...state.dynamicSession.activeFailures.links],
      };
      if (event.type === 'NODE_CRASH' && !activeFailures.nodes.includes(event.nodeId)) activeFailures.nodes.push(event.nodeId);
      if (event.type === 'NODE_RECOVERY') activeFailures.nodes = activeFailures.nodes.filter((id) => id !== event.nodeId);
      if (event.type === 'LINK_SPIKE' && !activeFailures.links.some((link) => link.edgeId === event.edgeId)) activeFailures.links.push({ edgeId: event.edgeId, originalWeight: event.originalWeight, newWeight: event.newWeight });
      if (event.type === 'LINK_RECOVERY') activeFailures.links = activeFailures.links.filter((link) => link.edgeId !== event.edgeId);
      const newStats = { ...state.dynamicSession.stats, totalEvents: state.dynamicSession.stats.totalEvents + 1 };
      return {
        ...state,
        dynamicSession: {
          ...state.dynamicSession,
          activeFailures,
          stats: newStats,
          resilienceScore: computeDynamicResilienceScore(newStats),
        },
      };
    }
    case ACTIONS.DYNAMIC_REROUTE_SUCCESS: {
      const newStats = {
        ...state.dynamicSession.stats,
        successfulReroutes: state.dynamicSession.stats.successfulReroutes + 1,
        pathChanges: state.dynamicSession.stats.pathChanges + 1,
      };
      return {
        ...state,
        dynamicSession: {
          ...state.dynamicSession,
          currentPath: action.payload.newPath,
          currentPathCost: action.payload.newCost,
          currentPathHops: action.payload.newHops,
          status: 'RUNNING',
          stats: newStats,
          resilienceScore: computeDynamicResilienceScore(newStats),
          pathHistory: [...state.dynamicSession.pathHistory, { timestamp: elapsed(state.dynamicSession), path: action.payload.newPath, cost: action.payload.newCost, hops: action.payload.newHops, reason: action.payload.reason, costChange: action.payload.costChange }],
        },
      };
    }
    case ACTIONS.DYNAMIC_REROUTE_FAILED: {
      const newStats = { ...state.dynamicSession.stats, failedReroutes: state.dynamicSession.stats.failedReroutes + 1, disconnectedSince: Date.now() };
      return {
        ...state,
        dynamicSession: {
          ...state.dynamicSession,
          status: 'DISCONNECTED',
          currentPath: [],
          stats: newStats,
          resilienceScore: computeDynamicResilienceScore(newStats),
          pathHistory: [...state.dynamicSession.pathHistory, { timestamp: elapsed(state.dynamicSession), path: [], cost: null, hops: null, reason: 'DISCONNECTED', costChange: null }],
        },
      };
    }
    case ACTIONS.DYNAMIC_PATH_RESTORED: {
      const newStats = { ...state.dynamicSession.stats, disconnectedMs: state.dynamicSession.stats.disconnectedMs + action.payload.disconnectedMs, disconnectedSince: null };
      return {
        ...state,
        dynamicSession: {
          ...state.dynamicSession,
          currentPath: action.payload.path,
          currentPathCost: action.payload.cost,
          currentPathHops: action.payload.hops,
          status: 'RUNNING',
          stats: newStats,
          resilienceScore: computeDynamicResilienceScore(newStats),
          pathHistory: [...state.dynamicSession.pathHistory, { timestamp: elapsed(state.dynamicSession), path: action.payload.path, cost: action.payload.cost, hops: action.payload.hops, reason: 'RESTORED', costChange: null }],
        },
      };
    }
    case ACTIONS.ADD_EVENT_FEED_ENTRY:
      return { ...state, dynamicSession: { ...state.dynamicSession, eventFeed: [action.payload, ...state.dynamicSession.eventFeed] } };
    case ACTIONS.UPDATE_RESILIENCE_SCORE:
      return { ...state, dynamicSession: { ...state.dynamicSession, resilienceScore: action.payload } };
    case ACTIONS.SET_DYNAMIC_SESSION_REPORT:
      return { ...state, dynamicSession: { ...state.dynamicSession, sessionReport: action.payload } };
    case ACTIONS.SET_EXPLANATION_LOADING: {
      const mode = action.payload.mode;
      return {
        ...state,
        explanation: {
          ...state.explanation,
          [`${mode}Loading`]: true,
          [`${mode}Error`]: null,
        },
      };
    }
    case ACTIONS.SET_EXPLANATION_CONTENT: {
      const mode = action.payload.mode;
      return {
        ...state,
        explanation: {
          ...state.explanation,
          [`${mode}Content`]: action.payload.content,
          [`${mode}Loading`]: false,
        },
      };
    }
    case ACTIONS.SET_EXPLANATION_ERROR: {
      const mode = action.payload.mode;
      return {
        ...state,
        explanation: {
          ...state.explanation,
          [`${mode}Error`]: action.payload.error,
          [`${mode}Loading`]: false,
        },
      };
    }
    case ACTIONS.CLEAR_EXPLANATION: {
      const mode = action.payload.mode;
      return {
        ...state,
        explanation: {
          ...state.explanation,
          [`${mode}Content`]: null,
          [`${mode}Loading`]: false,
          [`${mode}Error`]: null,
        },
      };
    }
    default:
      return state;
  }
}
