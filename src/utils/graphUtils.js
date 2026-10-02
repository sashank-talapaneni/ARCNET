export function createGraphApi(graph) {
  const nodeMap = new Map(graph.nodes.map((node) => [node.id, node]));
  const liveNodes = new Set(graph.nodes.filter((node) => !node.failed).map((node) => node.id));
  const liveEdges = graph.edges.filter((edge) => !edge.failed && liveNodes.has(edge.from) && liveNodes.has(edge.to));
  return {
    getNeighbors(nodeId) {
      return liveEdges
        .filter((edge) => edge.from === nodeId)
        .map((edge) => ({ neighbor: edge.to, weight: Number(edge.weight), edgeId: edge.id }));
    },
    getWeight(from, to) {
      const edge = liveEdges.find((item) => item.from === from && item.to === to);
      return edge ? Number(edge.weight) : Infinity;
    },
    getAllNodes() {
      return graph.nodes.filter((node) => liveNodes.has(node.id));
    },
    getAllEdges() {
      return liveEdges;
    },
    toAdjacencyMatrix() {
      const nodes = this.getAllNodes();
      const index = new Map(nodes.map((node, i) => [node.id, i]));
      const matrix = nodes.map((_, i) => nodes.map((__, j) => (i === j ? 0 : Infinity)));
      liveEdges.forEach((edge) => {
        matrix[index.get(edge.from)][index.get(edge.to)] = Number(edge.weight);
      });
      return { nodes, matrix };
    },
    hasNode(nodeId) {
      return nodeMap.has(nodeId) && liveNodes.has(nodeId);
    },
  };
}

export function reconstructPath(prev, source, destination) {
  const path = [];
  let cursor = destination;
  while (cursor !== undefined && cursor !== null) {
    path.unshift(cursor);
    if (cursor === source) break;
    cursor = prev[cursor];
  }
  return path[0] === source ? path : [];
}

export function calculatePathCost(graph, path) {
  if (path.length < 2) return path.length === 1 ? 0 : Infinity;
  const api = createGraphApi(graph);
  return path.slice(0, -1).reduce((sum, node, index) => sum + api.getWeight(node, path[index + 1]), 0);
}

export function hasReachablePath(graph, source, destination) {
  if (!source || !destination) return false;
  if (source === destination) return true;
  const api = createGraphApi(graph);
  const queue = [source];
  const visited = new Set([source]);
  while (queue.length) {
    const node = queue.shift();
    for (const { neighbor } of api.getNeighbors(node)) {
      if (neighbor === destination) return true;
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
  return false;
}

export function edgeIdFor(graph, from, to) {
  return graph.edges.find((edge) => edge.from === from && edge.to === to)?.id;
}

export function resolveNodeOverlaps(nodes, minDistance = 80) {
  const padding = 60;
  const maxX = 980 - padding;
  const maxY = 560 - padding;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const adjusted = nodes.map((node) => ({ ...node }));

  for (let iteration = 0; iteration < 50; iteration += 1) {
    for (let i = 0; i < adjusted.length; i += 1) {
      for (let j = i + 1; j < adjusted.length; j += 1) {
        let dx = adjusted[i].x - adjusted[j].x;
        let dy = adjusted[i].y - adjusted[j].y;
        let distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) {
          dx = 1;
          dy = 0;
          distance = 1;
        }

        if (distance < minDistance) {
          const overlap = minDistance - distance;
          const nx = dx / distance;
          const ny = dy / distance;
          adjusted[i].x += nx * overlap * 0.5;
          adjusted[i].y += ny * overlap * 0.5;
          adjusted[j].x -= nx * overlap * 0.5;
          adjusted[j].y -= ny * overlap * 0.5;
        }
      }
    }

    adjusted.forEach((node) => {
      node.x = clamp(node.x, padding, maxX);
      node.y = clamp(node.y, padding, maxY);
    });
  }

  return adjusted;
}
