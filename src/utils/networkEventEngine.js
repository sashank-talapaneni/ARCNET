import { hasReachablePath } from './graphUtils.js';

export class NetworkEventEngine {
  constructor(graphRef, source, destination, config, pathRef) {
    this.graphRef = graphRef;
    this.source = source;
    this.destination = destination;
    this.config = config;
    this.pathRef = pathRef;
    this.forcedPathEventsRemaining = 3;
    this.activeNodeFailures = new Set();
    this.activeLinkSpikes = new Map();
    this.timer = null;
    this.onEvent = null;
  }

  start(onEvent) {
    this.onEvent = onEvent;
    this.scheduleNext();
  }

  stop() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  scheduleNext() {
    const minMs = Math.max(1000, (this.config.baseInterval - 2) * 1000);
    const maxMs = (this.config.baseInterval + 3) * 1000;
    const delay = minMs + Math.random() * (maxMs - minMs);
    this.timer = setTimeout(() => {
      const event = this.generateEvent();
      if (event && this.onEvent) this.onEvent(event);
      if (this.timer !== null) this.scheduleNext();
    }, delay);
  }

  generateEvent() {
    const graph = this.graphRef.current;
    if (!graph) return null;
    const pool = [];

    if (this.config.enableNodeCrash && this.activeNodeFailures.size < 2) {
      const eligible = graph.nodes.filter((node) => node.id !== this.source && node.id !== this.destination && !node.failed && !this.activeNodeFailures.has(node.id));
      const isSafeToCrash = (node) => {
        node.failed = true;
        const stillConnected = hasReachablePath(graph, this.source, this.destination);
        node.failed = false;
        return stillConnected;
      };
      const safeEligible = eligible.filter(isSafeToCrash);
      // If every remaining candidate would disconnect the graph, a
      // disconnect is genuinely unavoidable â€” fall back to the full
      // eligible pool rather than blocking crashes entirely.
      const candidatePool = safeEligible.length ? safeEligible : eligible;
      const path = (this.pathRef && this.pathRef.current) || [];
      const pathCandidates = candidatePool.filter((node) => path.includes(node.id));
      const forceThisPick = this.forcedPathEventsRemaining > 0 && pathCandidates.length > 0;
      const useBias = forceThisPick || (pathCandidates.length > 0 && Math.random() < 0.65);
      const finalEligible = useBias ? pathCandidates : candidatePool;
      if (finalEligible.length) pool.push({ type: 'NODE_CRASH', weight: 25, eligible: finalEligible, pathBiased: useBias });
    }

    if (this.config.enableLinkSpike && this.activeLinkSpikes.size < 3) {
      const eligible = graph.edges.filter((edge) => !edge.failed && !edge.congested && !this.activeLinkSpikes.has(edge.id));
      const path = (this.pathRef && this.pathRef.current) || [];
      const pathEdgeCandidates = eligible.filter((edge) => {
        const i = path.indexOf(edge.from);
        const j = path.indexOf(edge.to);
        return (i !== -1 && path[i + 1] === edge.to) || (j !== -1 && path[j + 1] === edge.from);
      });
      const forceThisPick = this.forcedPathEventsRemaining > 0 && pathEdgeCandidates.length > 0;
      const useBias = forceThisPick || (pathEdgeCandidates.length > 0 && Math.random() < 0.65);
      const finalEligible = useBias ? pathEdgeCandidates : eligible;
      if (finalEligible.length) pool.push({ type: 'LINK_SPIKE', weight: 35, eligible: finalEligible, pathBiased: useBias });
    }

    if (this.config.enableRecoveries && this.activeNodeFailures.size) {
      pool.push({ type: 'NODE_RECOVERY', weight: 20, eligible: [...this.activeNodeFailures] });
    }

    if (this.config.enableRecoveries && this.activeLinkSpikes.size) {
      pool.push({ type: 'LINK_RECOVERY', weight: 20, eligible: [...this.activeLinkSpikes.keys()] });
    }

    const total = pool.reduce((sum, item) => sum + item.weight, 0);
    if (!total) return null;
    let cursor = Math.random() * total;
    const selected = pool.find((item) => {
      cursor -= item.weight;
      return cursor <= 0;
    }) || pool[0];

    if (selected.type === 'NODE_CRASH') {
      const node = selected.eligible[Math.floor(Math.random() * selected.eligible.length)];
      this.activeNodeFailures.add(node.id);
      if (selected.pathBiased && this.forcedPathEventsRemaining > 0) this.forcedPathEventsRemaining -= 1;
      return { type: 'NODE_CRASH', nodeId: node.id, timestamp: Date.now(), headline: `Node ${node.id} crashed`, detail: 'Traffic must route around the failed device.' };
    }
    if (selected.type === 'NODE_RECOVERY') {
      const nodeId = selected.eligible[Math.floor(Math.random() * selected.eligible.length)];
      this.activeNodeFailures.delete(nodeId);
      return { type: 'NODE_RECOVERY', nodeId, timestamp: Date.now(), headline: `Node ${nodeId} recovered`, detail: 'The device is back online.' };
    }
    if (selected.type === 'LINK_SPIKE') {
      const edge = selected.eligible[Math.floor(Math.random() * selected.eligible.length)];
      const originalWeight = Number(edge.weight) || 1;
      const newWeight = Math.max(originalWeight + 1, originalWeight * 10);
      this.activeLinkSpikes.set(edge.id, originalWeight);
      if (selected.pathBiased && this.forcedPathEventsRemaining > 0) this.forcedPathEventsRemaining -= 1;
      return { type: 'LINK_SPIKE', edgeId: edge.id, from: edge.from, to: edge.to, originalWeight, newWeight, timestamp: Date.now(), headline: `${edge.from}->${edge.to} cost spiked`, detail: `Cost changed from ${originalWeight} to ${newWeight}.` };
    }
    const edgeId = selected.eligible[Math.floor(Math.random() * selected.eligible.length)];
    const originalWeight = this.activeLinkSpikes.get(edgeId);
    this.activeLinkSpikes.delete(edgeId);
    const edge = graph.edges.find((item) => item.id === edgeId);
    return { type: 'LINK_RECOVERY', edgeId, from: edge?.from, to: edge?.to, originalWeight, timestamp: Date.now(), headline: `${edge?.from}->${edge?.to} recovered`, detail: `Cost restored to ${originalWeight}.` };
  }
}
