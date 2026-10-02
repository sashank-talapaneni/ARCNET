import { useMemo } from 'react';
import { Network } from 'lucide-react';
import Edge from '../graph/Edge.jsx';
import Node from '../graph/Node.jsx';
import AskButton from '../ai/AskButton.jsx';
import { hasReachablePath } from '../../utils/graphUtils.js';
import { algorithmDefinitions } from '../../algorithms/index.js';

const edgeKey = (from, to) => `${from}->${to}`;

export default function GraphCanvas({ state, dispatch, simulation, dynamicSimulation, ai }) {
  const dynamicFailedNodes = new Set(state.dynamicSession.activeFailures.nodes);
  const dynamicLinks = new Map(state.dynamicSession.activeFailures.links.map((link) => [link.edgeId, link]));
  const displayGraph = useMemo(() => ({
    nodes: state.graph.nodes.map((node) => ({ ...node, failed: node.failed || dynamicFailedNodes.has(node.id) })),
    edges: state.graph.edges.map((edge) => {
      const dynamicLink = dynamicLinks.get(edge.id);
      return dynamicLink ? { ...edge, weight: dynamicLink.newWeight, congested: true } : edge;
    }),
  }), [dynamicFailedNodes, dynamicLinks, state.graph.edges, state.graph.nodes]);
  const nodesById = useMemo(() => new Map(displayGraph.nodes.map((node) => [node.id, node])), [displayGraph.nodes]);
  const reachable = hasReachablePath(displayGraph, state.routing.source, state.routing.destination);
  const activeAlgorithmIds = state.simulationMode === 'DYNAMIC'
    ? [state.dynamicSession.selectedAlgorithm]
    : Object.entries(state.algorithms).filter(([, config]) => config.active).map(([id]) => id);
  const dynamicPath = state.dynamicSession.currentPath || [];
  const dynamicPathKeys = new Set(dynamicPath.slice(0, -1).map((node, index) => edgeKey(node, dynamicPath[index + 1])));
  const dynamicColor = state.algorithms[state.dynamicSession.selectedAlgorithm]?.color || 'var(--accent-cyan)';

  return (
    <main className={`graph-shell ${state.simulation.transitionPhase === 'fade-out' ? 'reroute-fade-out' : ''} ${state.simulation.transitionPhase === 'fade-in' ? 'reroute-fade-in' : ''}`}>
      <header className="canvas-header panel">
        <div className="canvas-title"><Network size={18} /><span>{state.activePreset} / {state.mode}</span><span className={reachable ? 'route-chip' : 'route-chip route-broken'}>{state.routing.source || '-'} {'to'} {state.routing.destination || '-'}</span></div>
        <div className="canvas-legend">
          {activeAlgorithmIds.map((id) => (
            <span key={id} className="legend-pill" style={{ '--algo-color': state.algorithms[id]?.color || 'var(--accent-cyan)' }}>
              <span className="dot" />
              {algorithmDefinitions[id].name}
            </span>
          ))}
        </div>
        <AskButton label="Analyze" onAsk={(event) => ai.explain('TOPOLOGY', { graph: state.graph, triggerRect: event.currentTarget.getBoundingClientRect() })} />
      </header>
      {(state.simulation.recomputing || state.dynamicSession.status === 'REROUTING') && <div className="reroute-banner panel">Rerouting...</div>}
      {state.dynamicSession.status === 'DISCONNECTED' && <div className="reroute-banner no-path-banner panel">No Valid Path</div>}
      <svg className="graph-canvas" viewBox="0 -72 980 632" preserveAspectRatio="xMidYMid meet">
        <g className="base-edge-layer">
          {displayGraph.edges.map((edge) => <Edge key={edge.id} edge={edge} from={nodesById.get(edge.from)} to={nodesById.get(edge.to)} state={state} dispatch={dispatch} ai={ai} showOverlays={false} />)}
        </g>
        {state.simulationMode !== 'DYNAMIC' && activeAlgorithmIds.map((id) => (
          <g key={id} className="algorithm-edge-layer" data-algorithm-id={id}>
            {displayGraph.edges.map((edge) => <Edge key={`${id}-${edge.id}`} edge={edge} from={nodesById.get(edge.from)} to={nodesById.get(edge.to)} state={state} dispatch={dispatch} showBase={false} overlayAlgorithmId={id} />)}
          </g>
        ))}
        {state.simulationMode === 'DYNAMIC' && (
          <g className="dynamic-path-layer" style={{ '--algo-color': dynamicColor }}>
            {displayGraph.edges.filter((edge) => dynamicPathKeys.has(edgeKey(edge.from, edge.to))).map((edge) => {
              const from = nodesById.get(edge.from);
              const to = nodesById.get(edge.to);
              if (!from || !to) return null;
              const dx = to.x - from.x;
              const dy = to.y - from.y;
              const length = Math.hypot(dx, dy) || 1;
              const ux = dx / length;
              const uy = dy / length;
              return <line key={`dynamic-${edge.id}`} x1={from.x + ux * 27} y1={from.y + uy * 27} x2={to.x - ux * 27} y2={to.y - uy * 27} className="dynamic-path-line" />;
            })}
          </g>
        )}
        {displayGraph.nodes.map((node) => <Node key={node.id} node={node} state={state} dispatch={dispatch} ai={ai} />)}
        {!displayGraph.nodes.length && <text className="empty-canvas" x="490" y="280">Build a graph from the adjacency matrix</text>}
      </svg>
    </main>
  );
}
