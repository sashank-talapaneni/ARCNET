import { algorithmDefinitions } from '../../algorithms/index.js';

export default function AlgorithmToggle({ id, active, onToggle }) {
  const definition = algorithmDefinitions[id];
  return (
    <button className={`algo-toggle ${active ? 'active' : ''}`} onClick={onToggle} type="button" style={{ '--algo-color': definition.colorVar }}>
      <span className="dot" /> {definition.name}
    </button>
  );
}
