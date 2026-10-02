import { useCallback, useEffect, useRef } from 'react';
import { ACTIONS } from '../store/appReducer.js';
import { runAlgorithm } from '../algorithms/index.js';
import { algorithmDefinitions } from '../algorithms/index.js';
import { NetworkEventEngine } from '../utils/networkEventEngine.js';

function cloneGraph(graph) {
  return {
    nodes: graph.nodes.map((node) => ({ ...node })),
    edges: graph.edges.map((edge) => ({ ...edge })),
  };
}

function pathSignature(path = []) {
  return path.join('>');
}

function pathIncludesEdge(path, edge) {
  return path.some((node, index) => node === edge.from && path[index + 1] === edge.to);
}

function mutateGraph(graph, event) {
  if (event.type === 'NODE_CRASH') {
    const node = graph.nodes.find((item) => item.id === event.nodeId);
    if (node) node.failed = true;
  }
  if (event.type === 'NODE_RECOVERY') {
    const node = graph.nodes.find((item) => item.id === event.nodeId);
    if (node) node.failed = false;
  }
  if (event.type === 'LINK_SPIKE') {
    const edge = graph.edges.find((item) => item.id === event.edgeId);
    if (edge) {
      edge.originalWeight = event.originalWeight;
      edge.weight = event.newWeight;
      edge.congested = true;
    }
  }
  if (event.type === 'LINK_RECOVERY') {
    const edge = graph.edges.find((item) => item.id === event.edgeId);
    if (edge) {
      edge.weight = event.originalWeight ?? edge.originalWeight ?? edge.weight;
      edge.congested = false;
    }
  }
}

function feedEntry(event, session, extra = {}) {
  const elapsed = Date.now() - (session.stats.sessionStartTime || Date.now());
  return {
    id: `${event.type}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type: event.type,
    timestamp: elapsed,
    headline: event.headline || event.type,
    detail: event.detail,
    detail2: extra.detail2,
    algorithmColor: extra.algorithmColor,
  };
}

function computeScore(session) {
  const stats = session.stats;
  const disconnectedPenalty = Math.min(35, (stats.disconnectedMs / 1000) * 1.5);
  const failurePenalty = stats.failedReroutes * 12;
  const eventPenalty = Math.max(0, stats.totalEvents - stats.successfulReroutes) * 4;
  const adaptationBonus = Math.min(12, stats.pathChanges * 2);
  return Math.max(0, Math.min(100, Math.round(100 - disconnectedPenalty - failurePenalty - eventPenalty + adaptationBonus)));
}

function eventCounts(feed) {
  return {
    total: feed.filter((entry) => ['NODE_CRASH', 'LINK_SPIKE', 'NODE_RECOVERY', 'LINK_RECOVERY'].includes(entry.type)).length,
    crashes: feed.filter((entry) => entry.type === 'NODE_CRASH').length,
    spikes: feed.filter((entry) => entry.type === 'LINK_SPIKE').length,
    recoveries: feed.filter((entry) => ['NODE_RECOVERY', 'LINK_RECOVERY'].includes(entry.type)).length,
  };
}

function buildAssessment(session, algorithmName) {
  const stats = session.stats;
  const unaffectedCount = (session.eventFeed || []).filter((e) => e.type === 'PATH_UNAFFECTED').length;
  return `${algorithmName} handled ${stats.successfulReroutes} successful reroutes across ${stats.totalEvents} live events, with ${stats.failedReroutes} failed reroutes and ${(stats.disconnectedMs / 1000).toFixed(1)} seconds disconnected. ${unaffectedCount > 0 ? `${unaffectedCount} additional event(s) did not require a route change because the path remained valid. ` : ''}The route changed ${stats.pathChanges} times, which indicates how often the selected algorithm had to adapt to topology or link-cost changes. The resilience score of ${session.resilienceScore ?? computeScore(session)}/100 reflects those disruptions and recoveries.`;
}

export function useDynamicSimulation(state, dispatch) {
  const graphRef = useRef(null);
  const engineRef = useRef(null);
  const durationRef = useRef(null);
  const rerouteTimerRef = useRef(null);
  const lastEventTypeRef = useRef(null);
  const stateRef = useRef(state);
  const pathRef = useRef([]);
  stateRef.current = state;

  const addFeedEntry = useCallback((entry, trackForDeduplication = true) => {
    dispatch({ type: ACTIONS.ADD_EVENT_FEED_ENTRY, payload: entry });
    if (trackForDeduplication) lastEventTypeRef.current = entry.type;
  }, [dispatch]);

  const stopSession = useCallback(() => {
    engineRef.current?.stop();
    engineRef.current = null;
    if (durationRef.current) window.clearTimeout(durationRef.current);
    if (rerouteTimerRef.current) window.clearTimeout(rerouteTimerRef.current);
    const current = stateRef.current.dynamicSession;
    const finalDisconnectedMs = current.stats.disconnectedSince ? Date.now() - current.stats.disconnectedSince : 0;
    const completed = {
      ...current,
      stats: { ...current.stats, disconnectedMs: current.stats.disconnectedMs + finalDisconnectedMs, disconnectedSince: null },
    };
    const score = computeScore(completed);
    dispatch({ type: ACTIONS.UPDATE_RESILIENCE_SCORE, payload: score });
    const algorithmName = algorithmDefinitions[current.selectedAlgorithm]?.name || current.selectedAlgorithm;
    const report = {
      algorithmId: current.selectedAlgorithm,
      algorithmName,
      topologyName: stateRef.current.activePreset,
      durationSeconds: Math.round(((Date.now() - (current.stats.sessionStartTime || Date.now())) / 1000)),
      eventCounts: eventCounts(current.eventFeed),
      stats: completed.stats,
      pathHistory: current.pathHistory,
      resilienceScore: score,
      assessment: buildAssessment({ ...completed, resilienceScore: score }, algorithmName),
    };
    addFeedEntry({ id: `SESSION_END-${Date.now()}`, type: 'SESSION_END', timestamp: Date.now() - (current.stats.sessionStartTime || Date.now()), headline: 'Dynamic session ended', detail: `Score ${score}/100` });
    dispatch({ type: ACTIONS.SET_DYNAMIC_SESSION_REPORT, payload: report });
    dispatch({ type: ACTIONS.STOP_DYNAMIC_SESSION });
  }, [addFeedEntry, dispatch]);

  const handleEvent = useCallback((event) => {
    const current = stateRef.current.dynamicSession;
    const algorithmId = current.selectedAlgorithm;
    const previousPath = current.currentPath;
    const wasDisconnected = current.status === 'DISCONNECTED';
    mutateGraph(graphRef.current, event);
    dispatch({ type: ACTIONS.APPLY_NETWORK_EVENT, payload: event });
    addFeedEntry(feedEntry(event, current), false);

    const affectedBySpike = event.type === 'LINK_SPIKE' && pathIncludesEdge(previousPath, event);
    if (algorithmId === 'bfs' && affectedBySpike) {
      if (lastEventTypeRef.current !== 'PATH_UNAFFECTED') {
        addFeedEntry(feedEntry({ type: 'PATH_UNAFFECTED', headline: 'BFS path unchanged', detail: 'BFS ignores edge weights, so this cost spike does not alter the hop route.' }, current, { algorithmColor: true }));
      }
      return;
    }

    dispatch({ type: ACTIONS.SET_DYNAMIC_STATUS, payload: 'REROUTING' });
    rerouteTimerRef.current = window.setTimeout(() => {
      const started = performance.now();
      const result = runAlgorithm(algorithmId, graphRef.current, stateRef.current.routing.source, stateRef.current.routing.destination, stateRef.current.routing.congestionThreshold);
      const rerouteMs = performance.now() - started;
      if (!result.found) {
        pathRef.current = [];
        dispatch({ type: ACTIONS.DYNAMIC_REROUTE_FAILED, payload: { event } });
        addFeedEntry(feedEntry({ type: 'REROUTE_FAILED', headline: 'No valid route', detail: `${algorithmDefinitions[algorithmId].name} could not find a path.` }, current, { algorithmColor: true }));
        return;
      }

      if (wasDisconnected) {
        const disconnectedMs = current.stats.disconnectedSince ? Date.now() - current.stats.disconnectedSince : 0;
        pathRef.current = result.path;
        dispatch({ type: ACTIONS.DYNAMIC_PATH_RESTORED, payload: { path: result.path, cost: result.pathCost, hops: result.hopCount, disconnectedMs } });
        addFeedEntry(feedEntry({ type: 'PATH_RESTORED', headline: 'Path restored', detail: result.path.join(' -> '), detail2: `Cost ${result.pathCost}, ${rerouteMs.toFixed(2)}ms reroute` }, current, { algorithmColor: true }));
        return;
      }

      const changed = pathSignature(result.path) !== pathSignature(previousPath);
      if (changed) {
        pathRef.current = result.path;
        dispatch({ type: ACTIONS.DYNAMIC_REROUTE_SUCCESS, payload: { newPath: result.path, newCost: result.pathCost, newHops: result.hopCount, oldPath: previousPath, costChange: result.pathCost - current.currentPathCost, reason: 'REROUTE' } });
        addFeedEntry(feedEntry({ type: 'REROUTE_SUCCESS', headline: 'Route changed', detail: result.path.join(' -> '), detail2: `Cost ${result.pathCost}, ${rerouteMs.toFixed(2)}ms reroute` }, current, { algorithmColor: true }));
      } else {
        if (lastEventTypeRef.current !== 'PATH_UNAFFECTED') {
          addFeedEntry(feedEntry({ type: 'PATH_UNAFFECTED', headline: 'Path unaffected', detail: 'The current route remains valid after this event.' }, current, { algorithmColor: true }));
        }
        dispatch({ type: ACTIONS.SET_DYNAMIC_STATUS, payload: 'RUNNING' });
      }
    }, 150);
  }, [addFeedEntry, dispatch]);

  const startSession = useCallback(() => {
    if (state.simulationMode !== 'DYNAMIC') return { error: 'Select Dynamic Network mode first.' };
    if (!state.routing.source || !state.routing.destination) return { error: 'Set source and destination first.' };
    graphRef.current = cloneGraph(state.graph);
    const algorithmId = state.dynamicSession.selectedAlgorithm;
    const result = runAlgorithm(algorithmId, graphRef.current, state.routing.source, state.routing.destination, state.routing.congestionThreshold);
    if (!result.found) return { error: 'No valid initial path for this algorithm.' };
    lastEventTypeRef.current = null;
    dispatch({ type: ACTIONS.START_DYNAMIC_SESSION });
    dispatch({ type: ACTIONS.SET_DYNAMIC_INITIAL_PATH, payload: { path: result.path, pathCost: result.pathCost, pathHops: result.hopCount } });
    pathRef.current = result.path;
    addFeedEntry({ id: `SESSION_START-${Date.now()}`, type: 'SESSION_START', timestamp: 0, headline: 'Dynamic session started', detail: `${algorithmDefinitions[algorithmId].name}: ${result.path.join(' -> ')}`, detail2: `Cost ${result.pathCost}` });
    engineRef.current = new NetworkEventEngine(graphRef, state.routing.source, state.routing.destination, state.dynamicSession.eventConfig, pathRef);
    engineRef.current.start(handleEvent);
    if (state.dynamicSession.eventConfig.sessionDuration !== null) {
      durationRef.current = window.setTimeout(stopSession, state.dynamicSession.eventConfig.sessionDuration * 1000);
    }
    return { ok: true };
  }, [addFeedEntry, dispatch, handleEvent, state, stopSession]);

  useEffect(() => () => {
    engineRef.current?.stop();
    if (durationRef.current) window.clearTimeout(durationRef.current);
    if (rerouteTimerRef.current) window.clearTimeout(rerouteTimerRef.current);
  }, []);

  return { startSession, stopSession, liveGraphData: graphRef.current };
}
