import { useState } from 'react';
import { RadioTower, ShieldAlert, Zap } from 'lucide-react';

export default function NetworkOpsPanel({ state, dispatch, simulation }) {
  const [multiplier, setMultiplier] = useState(3);
  const selectedEdge = state.graph.edges.find((edge) => edge.id === state.selectedEdge) || state.graph.edges[0];
  const failCandidates = state.graph.nodes.filter((node) => !node.failed && node.id !== state.routing.source && node.id !== state.routing.destination);
  const selectedNode = failCandidates.find((node) => node.id === state.selectedNode) || failCandidates[0];
  const failedNodes = state.graph.nodes.filter((node) => node.failed);
  const congestedEdges = state.graph.edges.filter((edge) => edge.congested);
  const disabled = state.simulation.recomputing || state.mode === 'BUILD';

  return (
    <div className="section ops-panel">
      <div className="label">Network Operations</div>
      <div className="ops-status">
        <span><RadioTower size={13} /> {congestedEdges.length} congested</span>
        <span><ShieldAlert size={13} /> {failedNodes.length} failed</span>
      </div>

      <label>
        <span className="label">Live Congestion Link</span>
        <select disabled={disabled} value={selectedEdge?.id || ''} onChange={(event) => dispatch({ type: 'SELECT_EDGE', id: event.target.value })}>
          {state.graph.edges.map((edge) => <option key={edge.id} value={edge.id}>{edge.from} to {edge.to} (current weight: {edge.weight})</option>)}
        </select>
      </label>
      <div className="ops-actions">
        <input aria-label="Congestion multiplier" disabled={disabled} type="number" min="1" step="0.5" value={multiplier} onChange={(event) => setMultiplier(Number(event.target.value) || 1)} />
        <button type="button" disabled={disabled || !selectedEdge} onClick={() => simulation.interruptAndRecompute('CONGESTION', { edgeId: selectedEdge.id, multiplier })}><Zap size={14} /> Spike</button>
      </div>
      {congestedEdges.map((edge) => (
        <div key={edge.id} className="ops-item">
          <span>{edge.from} to {edge.to}: {edge.weight}</span>
          <button type="button" disabled={disabled} onClick={() => simulation.interruptAndRecompute('RESTORE', { targetId: edge.id })}>Restore</button>
        </div>
      ))}

      <label>
        <span className="label">Node Failure</span>
        <select disabled={disabled} value={selectedNode?.id || ''} onChange={(event) => dispatch({ type: 'SELECT_NODE', id: event.target.value })}>
          {failCandidates.map((node) => <option key={node.id}>{node.id}</option>)}
        </select>
      </label>
      <div className="ops-actions">
        <button type="button" disabled={disabled || !selectedNode} onClick={() => simulation.interruptAndRecompute('NODE_FAILURE', { nodeId: selectedNode.id })}>
          <ShieldAlert size={14} /> Fail Node
        </button>
        <button type="button" disabled={state.simulation.recomputing || state.mode === 'BUILD'} onClick={simulation.run}>Re-run</button>
      </div>
      {failedNodes.map((node) => (
        <div key={node.id} className="ops-item">
          <span>{node.id} offline</span>
          <button type="button" disabled={disabled} onClick={() => simulation.interruptAndRecompute('RESTORE', { targetId: node.id })}>Restore</button>
        </div>
      ))}
      {state.simulation.recomputing && <p className="route-warning"><span className="ops-loading-spinner" /> Rerouting...</p>}
    </div>
  );
}
