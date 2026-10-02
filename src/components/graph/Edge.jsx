import { useEffect, useState } from 'react';
import AskButton from '../ai/AskButton.jsx';

const edgeKey = (from, to) => `${from}->${to}`;

export default function Edge({ edge, from, to, state, dispatch, ai, showBase = true, showOverlays = true, overlayAlgorithmId = null }) {
  const [rejectFlash, setRejectFlash] = useState(false);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  const ux = dx / length;
  const uy = dy / length;
  const px = -uy;
  const py = ux;
  const start = { x: from.x + ux * 27, y: from.y + uy * 27 };
  const end = { x: to.x - ux * 27, y: to.y - uy * 27 };
  const key = edgeKey(edge.from, edge.to);
  const overlays = showOverlays ? Object.entries(state.simulation.visual).flatMap(([id, visual]) => {
    if (overlayAlgorithmId && id !== overlayAlgorithmId) return [];
    const path = visual.path || [];
    const inPath = path.some((node, i) => node === edge.from && path[i + 1] === edge.to);
    const mode = visual.edgeModes?.[key];
    if (!inPath && !mode) return [];
    return [{ id, mode: mode || (visual.lastType === 'FOUND' ? 'solid' : 'advancing') }];
  }) : [];
  const rejectToken = state.simulation.visual.backtrack?.rejectedEdges?.[key];
  const algorithmsUsing = Object.entries(state.algorithms).filter(([, cfg]) => cfg.results?.path?.some((node, i) => node === edge.from && cfg.results.path[i + 1] === edge.to)).map(([id]) => id);
  const rejectedByBacktracking = Boolean(state.simulation.visual.backtrack?.rejectedEdges?.[key]);

  useEffect(() => {
    if (!rejectToken) return undefined;
    setRejectFlash(true);
    const timer = window.setTimeout(() => setRejectFlash(false), 400);
    return () => window.clearTimeout(timer);
  }, [rejectToken]);

  return (
    <g className="edge" onMouseEnter={() => dispatch({ type: 'SELECT_EDGE', id: edge.id })}>
      <defs>
        <marker id={`arrow-${edge.id}`} markerWidth="10" markerHeight="10" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" /></marker>
      </defs>
      {showBase && <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} markerEnd={`url(#arrow-${edge.id})`} className={`link-line ${edge.congested ? 'congested' : ''} ${rejectFlash ? 'reject-flash' : ''}`} />}
      {overlays.map(({ id, mode }, i) => {
        const offset = (i - (overlays.length - 1) / 2) * 5;
        const animationClass = mode === 'solid' ? 'solid-path' : (mode === 'retracting' ? 'animate-reverse' : 'animate-forward');
        const changeClass = state.simulation.pathChanges?.[id] && state.simulation.transitionPhase === 'fade-in' ? 'path-change-flash' : '';
        const completionClass = state.mode === 'ANALYZE'
          ? 'analysis-path'
          : (state.simulation.completedAlgorithms.includes(id) ? 'completed-path' : 'active-path');
        return (
          <line
            key={id}
            x1={start.x + px * offset}
            y1={start.y + py * offset}
            x2={end.x + px * offset}
            y2={end.y + py * offset}
            className={`algo-path ${animationClass} ${completionClass} ${changeClass}`}
            style={{ '--algo-color': state.algorithms[id]?.color || 'var(--accent-cyan)' }}
          />
        );
      })}
      {showBase && <text x={(start.x + end.x) / 2} y={(start.y + end.y) / 2 - 8}>{edge.weight}</text>}
      {showBase && state.mode !== 'BUILD' && (
        <foreignObject x={(start.x + end.x) / 2 + 8} y={(start.y + end.y) / 2 - 24} width="70" height="32">
          <AskButton
            label="AI"
            onAsk={(event) => ai?.explain?.('EDGE', { from: edge.from, to: edge.to, weight: edge.weight, congested: edge.congested, algorithmsUsing, rejectedByBacktracking, threshold: state.routing.congestionThreshold, triggerRect: event.currentTarget.getBoundingClientRect() })}
          />
        </foreignObject>
      )}
    </g>
  );
}
