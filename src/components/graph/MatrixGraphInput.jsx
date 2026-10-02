import { useEffect, useMemo, useState } from 'react';
import { resolveNodeOverlaps } from '../../utils/graphUtils.js';

const MIN_SIZE = 2;
const MAX_SIZE = 10;

function makeMatrix(size, existing = []) {
  return Array.from({ length: size }, (_, row) => (
    Array.from({ length: size }, (__, col) => existing[row]?.[col] ?? (row === 0 && col === 1 ? '1' : '0'))
  ));
}

function makeNames(size, existing = []) {
  return Array.from({ length: size }, (_, index) => existing[index] || String.fromCharCode(65 + index));
}

function sanitizeId(name, index, used) {
  const base = (name.trim() || `V${index + 1}`).replace(/[^a-zA-Z0-9_-]/g, '_');
  let id = base;
  let suffix = 2;
  while (used.has(id)) {
    id = `${base}_${suffix}`;
    suffix += 1;
  }
  used.add(id);
  return id;
}

function graphFromMatrix(names, matrix) {
  const used = new Set();
  const ids = names.map((name, index) => sanitizeId(name, index, used));
  const centerX = 490;
  const centerY = 330;
  const radiusX = 285;
  const radiusY = 145;
  const nodes = ids.map((id, index) => {
    const angle = (index / ids.length) * Math.PI * 2 - Math.PI / 2;
    return {
      id,
      label: names[index].trim() || id,
      x: centerX + Math.cos(angle) * radiusX,
      y: centerY + Math.sin(angle) * radiusY,
      failed: false,
    };
  });
  const edges = [];
  matrix.forEach((row, rowIndex) => {
    row.forEach((value, colIndex) => {
      const weight = Number(value);
      if (rowIndex !== colIndex && Number.isFinite(weight) && weight > 0) {
        edges.push({
          id: `${ids[rowIndex]}-${ids[colIndex]}-${edges.length}`,
          from: ids[rowIndex],
          to: ids[colIndex],
          weight,
          congested: false,
          failed: false,
        });
      }
    });
  });
  return { graph: { nodes: resolveNodeOverlaps(nodes), edges }, source: ids[0], destination: ids[ids.length - 1] };
}

export default function MatrixGraphInput({ state, dispatch }) {
  const [size, setSize] = useState(Math.max(MIN_SIZE, Math.min(MAX_SIZE, state.graph.nodes.length || MIN_SIZE)));
  const [names, setNames] = useState(() => makeNames(size, state.graph.nodes.map((node) => node.label || node.id)));
  const [matrix, setMatrix] = useState(() => makeMatrix(size));
  const hasInvalidCell = useMemo(() => matrix.some((row) => row.some((value) => value.trim() !== '' && (!Number.isFinite(Number(value)) || Number(value) < 0))), [matrix]);

  useEffect(() => {
    if (state.activePreset !== 'CUSTOM') return;
    const next = graphFromMatrix(names, matrix);
    dispatch({ type: 'SET_CUSTOM_GRAPH', ...next });
  }, []);

  const resize = (nextSize) => {
    const bounded = Math.max(MIN_SIZE, Math.min(MAX_SIZE, Number(nextSize)));
    setSize(bounded);
    setNames((current) => makeNames(bounded, current));
    setMatrix((current) => makeMatrix(bounded, current));
  };

  const updateName = (index, value) => {
    setNames((current) => current.map((name, i) => (i === index ? value : name)));
  };

  const updateCell = (row, col, value) => {
    setMatrix((current) => current.map((line, r) => line.map((cell, c) => (r === row && c === col ? value : cell))));
  };

  const applyGraph = () => {
    if (hasInvalidCell) return;
    const next = graphFromMatrix(names, matrix);
    dispatch({ type: 'SET_CUSTOM_GRAPH', ...next });
  };

  if (state.mode !== 'BUILD' || state.activePreset !== 'CUSTOM') return null;

  return (
    <div className="matrix-builder panel">
      <div className="matrix-header">
        <div>
          <div className="label">Adjacency Matrix Input</div>
          <p>Use positive numbers as directed edge weights. Use 0 for no link.</p>
        </div>
        <label>
          <span className="label">Size</span>
          <input type="number" min={MIN_SIZE} max={MAX_SIZE} value={size} onChange={(event) => resize(event.target.value)} />
        </label>
      </div>
      <div className="vertex-names">
        {names.map((name, index) => (
          <label key={`name-${index}`}>
            <span className="label">V{index + 1}</span>
            <input value={name} onChange={(event) => updateName(index, event.target.value)} />
          </label>
        ))}
      </div>
      <div className="matrix-scroll">
        <table className="matrix-table">
          <thead>
            <tr>
              <th />
              {names.map((name, index) => <th key={`to-${index}`}>{name || `V${index + 1}`}</th>)}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, rowIndex) => (
              <tr key={`row-${rowIndex}`}>
                <th>{names[rowIndex] || `V${rowIndex + 1}`}</th>
                {row.map((value, colIndex) => (
                  <td key={`${rowIndex}-${colIndex}`} className={rowIndex === colIndex ? 'diagonal' : ''}>
                    <input
                      aria-label={`${names[rowIndex] || rowIndex + 1} to ${names[colIndex] || colIndex + 1}`}
                      disabled={rowIndex === colIndex}
                      value={rowIndex === colIndex ? '0' : value}
                      onChange={(event) => updateCell(rowIndex, colIndex, event.target.value)}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasInvalidCell && <p className="matrix-error">Matrix values must be zero or positive numbers.</p>}
      <button type="button" onClick={applyGraph} disabled={hasInvalidCell}>Build Graph From Matrix</button>
    </div>
  );
}
