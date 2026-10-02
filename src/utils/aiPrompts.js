import { determineWinner } from './metricsUtils.js';

export const systemPrompt = `You are an expert in graph algorithms, computer networks, and computer science education. You are the AI assistant embedded inside ARCNET, a network routing simulator built for educational demonstration. You have full context of the current simulation state provided in every message. Your explanations are always specific to the current simulation data - never give generic textbook definitions. Keep explanations concise (3-5 sentences) unless the user asks for more detail. Use simple language appropriate for CS students learning routing for the first time. When referencing numbers, use the exact values from the simulation context. Never use markdown formatting. Never start your response with "I" or "Sure".`;

const algorithmNames = {
  dijkstra: 'Dijkstra',
  floyd: 'Floyd-Warshall',
  bfs: 'BFS',
  dfs: 'DFS',
  backtrack: 'Backtracking',
};

function formatSessionTime(ms) {
  const seconds = Math.floor((ms || 0) / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function summarizeResult(result) {
  if (!result) return null;
  const { steps, ...summary } = result;
  return summary;
}

function summarizeResults(results = {}) {
  return Object.fromEntries(Object.entries(results).map(([id, result]) => [id, summarizeResult(result)]));
}

export function buildAnalysisExplanationPrompt(state) {
  const activeAlgos = Object.entries(state.algorithms)
    .filter(([, cfg]) => cfg.active && cfg.results)
    .map(([id, cfg]) => ({
      id,
      name: algorithmNames[id] || id,
      found: cfg.results.found,
      path: cfg.results.path,
      pathCost: cfg.results.pathCost,
      hopCount: cfg.results.hopCount,
      nodesVisited: cfg.results.nodesVisited,
      executionTime: cfg.results.executionTime,
      stepCount: cfg.results.steps?.length || 0,
    }));
  if (!activeAlgos.length) return null;

  const graph = state.graph;
  const nodeCount = graph.nodes.length;
  const edgeCount = graph.edges.length;
  const weights = graph.edges.map((edge) => Number(edge.weight) || 0);
  const minWeight = weights.length ? Math.min(...weights) : 0;
  const maxWeight = weights.length ? Math.max(...weights) : 0;
  const avgWeight = weights.length ? (weights.reduce((sum, weight) => sum + weight, 0) / weights.length).toFixed(1) : '0.0';
  const possibleEdges = nodeCount * (nodeCount - 1);
  const density = (possibleEdges ? edgeCount / possibleEdges : 0).toFixed(2);
  const source = state.routing.source;
  const destination = state.routing.destination;
  const threshold = state.routing.congestionThreshold;
  const topologyName = state.activePreset || 'Custom';

  const paths = activeAlgos.filter((algorithm) => algorithm.found).map((algorithm) => algorithm.path.join('\u2192'));
  const uniquePaths = [...new Set(paths)];
  const allSamePath = uniquePaths.length === 1;
  const foundAlgos = activeAlgos.filter((algorithm) => algorithm.found);
  const costs = foundAlgos.map((algorithm) => Number(algorithm.pathCost) || 0);
  const minCost = costs.length ? Math.min(...costs) : 0;
  const maxCost = costs.length ? Math.max(...costs) : 0;
  const costSpread = maxCost - minCost;
  const fastestAlgo = foundAlgos.reduce((fastest, algorithm) => (
    !fastest || algorithm.executionTime < fastest.executionTime ? algorithm : fastest
  ), null);
  const slowestAlgo = foundAlgos.reduce((slowest, algorithm) => (
    !slowest || algorithm.executionTime > slowest.executionTime ? algorithm : slowest
  ), null);

  const btResult = state.algorithms.backtrack?.results;
  const btSteps = btResult?.steps || [];
  const btRejectCount = btSteps.filter((step) => step.type === 'REJECT').length;
  const btBacktrackCount = btSteps.filter((step) => step.type === 'BACKTRACK').length;
  const resultLines = activeAlgos.map((algorithm) => (
    `${algorithm.name}: ${algorithm.found
      ? `found path ${algorithm.path.join('\u2192')} at cost ${algorithm.pathCost}, ${algorithm.hopCount} hops, ${Number(algorithm.executionTime).toFixed(3)}ms, visited ${algorithm.nodesVisited} nodes, ${algorithm.stepCount} total steps`
      : 'no path found'}`
  )).join('\n  ');
  const pathSummary = foundAlgos.length === 0
    ? 'No active algorithm found a valid path.'
    : (allSamePath
      ? `All algorithms that found a route chose the same path: ${uniquePaths[0]}`
      : `Algorithms found ${uniquePaths.length} different paths. Paths: ${uniquePaths.join(' | ')}`);
  const timingSummary = fastestAlgo && slowestAlgo
    ? `Fastest algorithm: ${fastestAlgo.name} at ${Number(fastestAlgo.executionTime).toFixed(3)}ms
  Slowest algorithm: ${slowestAlgo.name} at ${Number(slowestAlgo.executionTime).toFixed(3)}ms
  Speed difference: ${(slowestAlgo.executionTime / Math.max(fastestAlgo.executionTime, 0.001)).toFixed(1)}x`
    : 'No successful algorithm timing comparison is available.';

  return `You are an expert computer science professor explaining algorithm results to undergraduate students. Be specific, educational, and reference exact numbers. Write in clear paragraphs. No markdown formatting, no bullet points, no headers. Write as flowing prose that tells a complete story. Aim for 350-500 words.

  SIMULATION DATA:
  Topology: ${topologyName}
  Graph: ${nodeCount} nodes, ${edgeCount} edges, density ${density}
  Edge weights: min ${minWeight}, max ${maxWeight}, avg ${avgWeight}
  Route: ${source} to ${destination}
  Backtracking threshold: ${threshold}

  ALGORITHM RESULTS:
  ${resultLines}

  ${pathSummary}

  Cost spread: ${costSpread} units between cheapest and most expensive path found.

  ${timingSummary}

  ${btResult ? `Backtracking made ${btRejectCount} edge rejections and ${btBacktrackCount} backtrack moves under threshold ${threshold}. Backtracking found path: ${Boolean(btResult.found)}; path: ${(btResult.path || []).join('\u2192') || 'none'}; cost: ${btResult.found ? btResult.pathCost : 'not applicable'}.` : ''}

  Write a complete educational explanation covering:
  1. What each algorithm did on this specific topology and why its behavior is consistent with its design - reference the actual paths taken, nodes visited, and execution times.
  2. If algorithms found different paths, explain exactly why they diverged - what architectural difference caused the different choice.
  3. Translate the time complexity into concrete operation counts for this specific graph size: for Dijkstra use (V+E)logV, for Floyd-Warshall use V^3, for BFS and DFS use V+E, and explain what these numbers mean for the observed execution times.
  4. For backtracking specifically: explain what the threshold of ${threshold} means in practice, why it rejected ${btRejectCount} edges, and what this demonstrates about constraint-based routing versus optimization-based routing.
  5. Which algorithm is the right choice for this topology and routing requirement, and precisely why - be specific about the graph properties that favor this choice.
  Write as a professor would explain to a student who just watched the simulation and wants to understand what they saw.`;
}

export function buildDynamicExplanationPrompt(state) {
  const session = state.dynamicSession;
  const report = session.sessionReport;
  if (!report) return null;

  const algorithmId = session.selectedAlgorithm;
  const algorithmName = algorithmNames[algorithmId] || algorithmId;
  const pathHistory = session.pathHistory || [];
  const eventFeed = session.eventFeed || [];
  const crashEvents = eventFeed.filter((event) => event.type === 'NODE_CRASH');
  const spikeEvents = eventFeed.filter((event) => event.type === 'LINK_SPIKE');
  const recoveryEvents = eventFeed.filter((event) => ['NODE_RECOVERY', 'LINK_RECOVERY'].includes(event.type));
  const reroutes = eventFeed.filter((event) => event.type === 'REROUTE_SUCCESS');
  const failures = eventFeed.filter((event) => event.type === 'REROUTE_FAILED');
  const unaffected = eventFeed.filter((event) => event.type === 'PATH_UNAFFECTED');
  const stats = session.stats;
  const score = session.resilienceScore ?? report.resilienceScore ?? 0;
  const threshold = state.routing.congestionThreshold;
  const topologyName = state.activePreset || 'Custom';
  const timeline = pathHistory.map((entry) => {
    const time = formatSessionTime(entry.timestamp);
    if (entry.path?.length > 0) {
      const costChange = entry.costChange
        ? ` cost change: ${entry.costChange > 0 ? '+' : ''}${entry.costChange}`
        : '';
      return `${time}: Path ${entry.path.join('\u2192')} cost ${entry.cost} (${entry.reason}${costChange})`;
    }
    return `${time}: DISCONNECTED`;
  }).join('\n  ') || 'No path history was recorded.';

  return `You are an expert computer science professor explaining network algorithm behavior to undergraduate students. Be specific, educational, and reference exact events and numbers. Write in clear paragraphs as flowing prose. No markdown, no bullet points, no headers. Aim for 400-550 words.

  DYNAMIC SESSION DATA:
  Algorithm: ${algorithmName}
  Topology: ${topologyName}
  Duration: ${report.durationSeconds}s
  Backtracking threshold: ${threshold}

  EVENTS THAT OCCURRED:
  ${crashEvents.length} node crashes: ${crashEvents.map((event) => event.headline).join(', ') || 'none'}
  ${spikeEvents.length} link cost spikes: ${spikeEvents.map((event) => event.headline).join(', ') || 'none'}
  ${recoveryEvents.length} recoveries: ${recoveryEvents.map((event) => event.headline).join(', ') || 'none'}

  HOW THE ALGORITHM RESPONDED:
  Successful reroutes: ${stats.successfulReroutes} (${reroutes.length} reroute entries recorded)
  Failed reroutes (disconnected): ${stats.failedReroutes} (${failures.length} failure entries recorded)
  Times path was unaffected by events: ${unaffected.length}
  Total disconnected time: ${(stats.disconnectedMs / 1000).toFixed(1)}s
  Path changed ${stats.pathChanges} times

  COMPLETE PATH HISTORY:
  ${timeline}

  RESILIENCE SCORE: ${score}/100

  Write a complete educational explanation covering:
  1. Tell the story of this session chronologically - what happened to the network, how the algorithm responded to each significant event, and what the path history reveals about the algorithm's decision-making. Reference the specific node names, edge names, and timestamps from the data.
  2. Explain why the algorithm responded the way it did to each type of event - connect the observed behavior to the algorithm's fundamental design. For example: if BFS, explain why cost spikes had no effect. If backtracking, explain why specific edges were rejected. If Dijkstra, explain when it chose to re-optimize versus stay on the current path.
  3. Explain the disconnection periods if any occurred - what graph-theoretic property caused the network to become unreachable, and why no algorithm could find a path in that state.
  4. Assess the resilience score of ${score}/100 - explain what contributed to this score based on the specific events, whether the score reflects the algorithm's inherent capability or the topology's vulnerability, and how a different algorithm might have scored on this same event sequence.
  5. What would a network engineer learn from watching this algorithm handle this event sequence - what are its strengths and limitations for dynamic real-world routing?
  Write as a professor explaining to a student who just watched the entire session and wants to deeply understand what they observed.`;
}

export function buildSimulationContext(state) {
  const results = Object.fromEntries(Object.entries(state.algorithms).map(([id, cfg]) => {
    if (!cfg.results) return [id, null];
    const { steps, ...result } = cfg.results;
    return [id, { ...result, stepCount: steps?.length || 0 }];
  }));
  const winner = determineWinner(results);
  const dynamicSession = state.dynamicSession || {};
  return {
    topology: {
      name: state.activePreset,
      nodeCount: state.graph.nodes.length,
      edgeCount: state.graph.edges.length,
      nodes: state.graph.nodes.map(({ id, label, failed }) => ({ id, label, failed: Boolean(failed) })),
      edges: state.graph.edges.map(({ id, from, to, weight, congested }) => ({ id, from, to, weight, congested: Boolean(congested) })),
    },
    algorithms: {
      active: Object.entries(state.algorithms).filter(([, cfg]) => cfg.active).map(([id]) => id),
      results,
    },
    routing: {
      source: state.routing.source,
      destination: state.routing.destination,
      threshold: state.routing.congestionThreshold,
    },
    simulation: {
      mode: state.mode,
      currentStep: state.simulation.currentStep,
      hasCongestedEdges: state.graph.edges.some((edge) => edge.congested),
      hasFailedNodes: state.graph.nodes.some((node) => node.failed),
    },
    metrics: {
      winner: winner.winnerId,
      scores: winner.scores,
    },
    dynamicSession: {
      active: dynamicSession.active,
      selectedAlgorithm: dynamicSession.selectedAlgorithm,
      status: dynamicSession.status,
      currentPath: dynamicSession.currentPath,
      currentPathCost: dynamicSession.currentPathCost,
      currentPathHops: dynamicSession.currentPathHops,
      isCurrentPathOptimal: dynamicSession.isCurrentPathOptimal,
      activeFailures: dynamicSession.activeFailures,
      stats: dynamicSession.stats,
      resilienceScore: dynamicSession.resilienceScore,
      eventConfig: dynamicSession.eventConfig,
    },
  };
}

export function buildPrompt(triggerType, context = {}, simulationContext) {
  switch (triggerType) {
    case 'NODE':
      return `In this ARCNET simulation on the ${simulationContext.topology.name} network, the user is examining node "${context.nodeId}". Algorithms visiting this node: ${(context.algorithmsVisiting || []).join(', ') || 'none recorded'}. On final path of: ${(context.isOnFinalPath || []).join(', ') || 'none'}. Node degree: ${context.degree}. Failed: ${context.isFailed ? 'yes' : 'no'}. Explain the role this node played in the routing decisions.`;
    case 'EDGE':
      return `Edge ${context.from}->${context.to} has weight ${context.weight}${context.congested ? ' (currently CONGESTED)' : ''}. Used by: ${(context.algorithmsUsing || []).join(', ') || 'none'}. ${context.rejectedByBacktracking ? `Rejected by backtracking because weight ${context.weight} exceeds threshold ${context.threshold}.` : ''} Explain why algorithms made the decisions they did regarding this specific edge.`;
    case 'TOPOLOGY':
      return `Analyze the ${simulationContext.topology.name} topology with ${simulationContext.topology.nodeCount} nodes and ${simulationContext.topology.edgeCount} edges. Bottleneck nodes: ${(context.bottleneckNodes || []).join(', ') || 'none identified'}. Degree distribution: ${JSON.stringify(context.degreeDistribution || {})}. Explain what this network structure means for routing algorithm behavior.`;
    case 'ALGORITHM_PERFORMANCE':
    case 'detailedReport':
      return `ARCNET simulation complete. Network: ${context.topologyName || simulationContext.topology.name}, ${context.nodeCount || simulationContext.topology.nodeCount} nodes, ${context.edgeCount || simulationContext.topology.edgeCount} edges. The user wants to understand ${context.algorithmName || context.algorithmId}'s performance. Results: path=${context.path}, cost=${context.cost}, hops=${context.hops}, time=${context.time}ms, nodesVisited=${context.nodesVisited}. Other algorithms for comparison: ${context.otherResultsSummary || JSON.stringify(simulationContext.algorithms.results)}. Explain this algorithm's specific behavior on this network in 3-4 sentences. Reference the actual numbers. Do not give generic definitions.`;
    case 'ALGORITHM_COMPARISON':
    case 'headToHead':
      return `Compare ${context.algorithmId} against winner ${context.winnerId} for this ARCNET run. Algorithm result: ${JSON.stringify(summarizeResult(context.result))}. Winner result: ${JSON.stringify(summarizeResult(context.winnerResult))}. Explain the difference in 2-3 sentences using actual numbers.`;
    case 'WINNER':
    case 'winnerDeepDive':
      return `Explain why ${context.winner || simulationContext.metrics.winner} won this ARCNET run on ${context.topologyName || simulationContext.topology.name}. Scores: ${JSON.stringify(simulationContext.metrics.scores)}. Results: ${JSON.stringify(summarizeResults(context.results || simulationContext.algorithms.results))}. Keep it to 3-4 sentences and reference actual numbers.`;
    case 'PSEUDOCODE_LINE':
      return `The user is looking at line ${context.lineNumber} of ${context.algorithmId}'s pseudocode: "${context.lineContent || context.line}". The simulation most recently executed step type: ${context.mostRecentStepData?.type || 'unknown'}. Explain what this specific line does and why it exists, in the context of what just happened in the simulation.`;
    case 'REROUTE_EVENT':
    case 'FAILURE_EVENT':
    case 'event':
      return `Explain this ARCNET event and why the algorithms responded as they did. Event: ${JSON.stringify(context.event || context)}. Results: ${JSON.stringify(summarizeResults(context.results || simulationContext.algorithms.results))}. Keep it to 3-4 sentences.`;
    case 'IDEAL_USE_CASE':
    case 'idealUseCase':
      return `Explain this computed ideal use case in real networking terms: ${context.idealUseCase}. Winner: ${context.winner || simulationContext.metrics.winner}. Topology: ${context.topologyName || simulationContext.topology.name}. Keep it specific and concise.`;
    case 'AUTO_RECOMMEND':
      return `ARCNET simulation complete. Network: ${simulationContext.topology.name}, ${simulationContext.topology.nodeCount} nodes, ${simulationContext.topology.edgeCount} edges. Results: ${JSON.stringify(simulationContext.metrics.scores)}. Winner: ${simulationContext.metrics.winner}. Generate a recommendation: (1) which algorithm performed best and why in 2 sentences using the actual numbers, (2) which metric decided it, (3) one sentence on when a different algorithm would be better. No markdown.`;
    case 'DYNAMIC_SESSION':
      return `ARCNET dynamic network session complete. Algorithm: ${context.algorithmName} on ${context.topologyName}. Duration: ${context.durationSeconds}s. Events fired: ${context.eventCounts?.total} (${context.eventCounts?.crashes} node crashes, ${context.eventCounts?.spikes} link spikes, ${context.eventCounts?.recoveries} recoveries). Successful reroutes: ${context.stats?.successfulReroutes} of ${context.eventCounts?.total}. Time without path: ${((context.stats?.disconnectedMs || 0) / 1000).toFixed(1)}s. Resilience score: ${context.resilienceScore}/100. In 4-5 sentences, assess this algorithm's suitability for dynamic real-world networks based on these specific results. Reference the actual numbers. No generic definitions.`;
    case 'GLOBAL':
      return `The user asked: "${context.question}". Use the current ARCNET simulation context to answer specifically with actual algorithm and topology data.`;
    default:
      return `Explain this ARCNET simulation detail using the current context. Trigger: ${triggerType}. Context: ${JSON.stringify(context)}.`;
  }
}
