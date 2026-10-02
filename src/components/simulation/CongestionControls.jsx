export default function CongestionControls({ state, dispatch }) {
  const maxWeight = Math.max(...state.graph.edges.map((edge) => Number(edge.weight) || 0), 1);
  const sliderMax = Math.max(25, maxWeight, state.routing.congestionThreshold);

  return (
    <div className="section">
      <div className="label">Backtracking Max Edge Cost</div>
      <input type="range" min="1" max={sliderMax} value={state.routing.congestionThreshold} onChange={(event) => dispatch({ type: 'SET_THRESHOLD', threshold: Number(event.target.value) })} />
      <b>{state.routing.congestionThreshold}</b>
    </div>
  );
}
