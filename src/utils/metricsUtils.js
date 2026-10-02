function foundResults(results) {
  return Object.values(results).filter(Boolean).filter((result) => result.found);
}

function normalizeScore(value, minValue, maxValue) {
  if (maxValue === minValue) return 1.0;
  return 1 - ((value - minValue) / (maxValue - minValue));
}

export function scoreResults(results) {
  return determineWinner(results).scores;
}

export function getWinner(results) {
  return determineWinner(results).winnerId;
}

export function determineWinner(results) {
  const found = foundResults(results);
  if (!found.length) {
    return {
      winnerId: null,
      scores: Object.fromEntries(Object.values(results).filter(Boolean).map((result) => [result.algorithmId, 0])),
      breakdown: {},
      rows: [],
    };
  }

  const costs = found.map((result) => Number(result.pathCost) || 0);
  const hops = found.map((result) => Number(result.hopCount) || 0);
  const times = found.map((result) => Number(result.executionTime) || 0);
  const nodes = found.map((result) => Number(result.nodesVisited) || 0);
  const minCost = Math.min(...costs);
  const maxCost = Math.max(...costs);
  const minHops = Math.min(...hops);
  const maxHops = Math.max(...hops);
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const minNodes = Math.min(...nodes);
  const maxNodes = Math.max(...nodes);

  const breakdown = Object.fromEntries(found.map((result) => {
    const pathCostScore = normalizeScore(Number(result.pathCost) || 0, minCost, maxCost);
    const hopCountScore = normalizeScore(Number(result.hopCount) || 0, minHops, maxHops);
    const executionScore = normalizeScore(Number(result.executionTime) || 0, minTime, maxTime);
    const explorationScore = normalizeScore(Number(result.nodesVisited) || 0, minNodes, maxNodes);
    const weightedScore = (pathCostScore * 0.40) + (hopCountScore * 0.25) + (executionScore * 0.25) + (explorationScore * 0.10);
    return [result.algorithmId, {
      pathCostScore,
      hopCountScore,
      executionScore,
      explorationScore,
      pathCostPoints: pathCostScore * 40,
      hopCountPoints: hopCountScore * 25,
      executionPoints: executionScore * 25,
      explorationPoints: explorationScore * 10,
      composite: weightedScore * 100,
    }];
  }));

  const rows = found
    .map((result) => ({ id: result.algorithmId, result, score: breakdown[result.algorithmId].composite }))
    .sort((a, b) => b.score - a.score);

  return {
    winnerId: rows[0]?.id || null,
    scores: Object.fromEntries(Object.values(results).filter(Boolean).map((result) => [
      result.algorithmId,
      result.found ? Math.round(breakdown[result.algorithmId].composite) : 0,
    ])),
    breakdown,
    rows,
  };
}

export function resultAverages(results) {
  const found = foundResults(results);
  if (!found.length) return { pathCost: 0, hopCount: 0, executionTime: 0, nodesVisited: 0 };
  const sum = (field) => found.reduce((total, result) => total + (Number(result[field]) || 0), 0);
  return {
    pathCost: sum('pathCost') / found.length,
    hopCount: sum('hopCount') / found.length,
    executionTime: sum('executionTime') / found.length,
    nodesVisited: sum('nodesVisited') / found.length,
  };
}
