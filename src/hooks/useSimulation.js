import { useCallback, useEffect } from 'react';
import { ACTIONS } from '../store/appReducer.js';
import { runAlgorithm } from '../algorithms/index.js';

function mergeSteps(results) {
  const entries = Object.values(results).filter(Boolean).map((result) => {
    const steps = result.steps || [];
    const finalStep = steps.at(-1) || {
      type: 'IDLE',
      algorithmId: result.algorithmId,
      message: `${result.algorithmId} is idle.`,
    };
    return { algorithmId: result.algorithmId, steps, finalStep };
  });
  const maxLength = Math.max(...entries.map((entry) => entry.steps.length), 0);
  const merged = [];
  const normalized = entries.map((entry) => ({
    ...entry,
    steps: Array.from({ length: maxLength }, (_, index) => (
      entry.steps[index] || {
        ...entry.finalStep,
        type: 'IDLE',
        algorithmId: entry.algorithmId,
        message: `${entry.algorithmId} holds its final visual state.`,
      }
    )),
  }));
  for (let i = 0; i < maxLength; i += 1) {
    normalized.forEach((entry) => {
      if (entry.steps[i]) merged.push({ ...entry.steps[i], logicalIndex: i });
    });
  }
  return merged;
}

function algorithmErrorResult(id, error) {
  return {
    algorithmId: id,
    found: false,
    path: [],
    pathCost: Infinity,
    hopCount: 0,
    nodesVisited: 0,
    executionTime: 0,
    error: error instanceof Error ? error.message : String(error),
    steps: [{
      type: 'ERROR',
      algorithmId: id,
      message: `${id} could not complete: ${error instanceof Error ? error.message : String(error)}`,
      pseudocodeLine: 0,
    }],
  };
}

function runActiveAlgorithms(algorithms, graph, routing) {
  const results = {};
  Object.entries(algorithms).forEach(([id, config]) => {
    if (config.active) {
      try {
        results[id] = runAlgorithm(id, graph, routing.source, routing.destination, routing.congestionThreshold);
      } catch (error) {
        results[id] = algorithmErrorResult(id, error);
      }
    }
  });
  return results;
}

function getStepInterval(step, speedMultiplier) {
  const base = {
    ITERATE: 8,
    INIT_MATRIX: 5,
    UPDATE: 8,
    EXTRACT_PATH: 60,
    FOUND: 80,
    NO_PATH: 80,
    INIT: 30,
    VISIT: 45,
    RELAX: 35,
    SKIP: 20,
    ENQUEUE: 35,
    DEQUEUE: 35,
    EXPLORE: 40,
    BACKTRACK: 50,
    TRY: 45,
    REJECT: 55,
    IDLE: 2,
  };
  const ms = base[step?.type] ?? 40;
  return Math.max(1, ms / speedMultiplier);
}

export function useSimulation(state, dispatch) {
  const canRun = state.graph.nodes.length > 1 && state.routing.source && state.routing.destination && Object.values(state.algorithms).some((item) => item.active);

  const run = useCallback(() => {
    if (!canRun) return;
    const results = runActiveAlgorithms(state.algorithms, state.graph, state.routing);
    dispatch({ type: ACTIONS.START_SIMULATION, results, steps: mergeSteps(results) });
  }, [canRun, dispatch, state.algorithms, state.graph, state.routing]);

  useEffect(() => {
    if (!state.simulation.running || state.simulation.paused) return undefined;
    const currentStep = state.simulation.allSteps[state.simulation.currentStep];
    const delay = getStepInterval(currentStep, state.simulation.speed);
    const timer = window.setTimeout(() => dispatch({ type: ACTIONS.APPLY_STEP }), delay);
    return () => window.clearTimeout(timer);
  }, [dispatch, state.simulation.allSteps, state.simulation.currentStep, state.simulation.paused, state.simulation.running, state.simulation.speed]);

  return {
    canRun,
    run,
    playPause: () => dispatch({ type: ACTIONS.SET_PLAYING, running: !state.simulation.running }),
    stepForward: () => dispatch({ type: ACTIONS.APPLY_STEP }),
    stepBack: () => dispatch({ type: ACTIONS.STEP_BACK }),
    reset: () => dispatch({ type: ACTIONS.RESET_SIMULATION }),
    setSpeed: (speed) => dispatch({ type: ACTIONS.SET_SPEED, speed }),
  };
}
