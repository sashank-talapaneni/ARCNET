import AskButton from '../ai/AskButton.jsx';

export default function Node({ node, state, dispatch, ai }) {
  const source = state.routing.source === node.id;
  const destination = state.routing.destination === node.id;
  const degree = state.graph.edges.filter((edge) => edge.from === node.id || edge.to === node.id).length;
  const algorithmsVisiting = Object.entries(state.simulation.visual).filter(([, visual]) => (visual.path || []).includes(node.id)).map(([id]) => id);
  const isOnFinalPath = Object.entries(state.algorithms).filter(([, cfg]) => cfg.results?.path?.includes(node.id)).map(([id]) => id);
  return (
    <g className={`node ${node.failed ? 'failed' : ''}`} data-node-id={node.id} transform={`translate(${node.x} ${node.y})`} onMouseEnter={() => dispatch({ type: 'SELECT_NODE', id: node.id })}>
      <circle r="23" />
      <text y="4">{node.label}</text>
      {(source || destination) && <text y="41" className="node-role">{source ? 'SRC' : 'DST'}</text>}
      {state.mode !== 'BUILD' && (
        <foreignObject x="22" y="-28" width="70" height="32">
          <AskButton
            label="AI"
            onAsk={(event) => ai.explain('NODE', { nodeId: node.id, algorithmsVisiting, isOnFinalPath, isFailed: node.failed, degree, triggerRect: event.currentTarget.getBoundingClientRect() })}
          />
        </foreignObject>
      )}
    </g>
  );
}
