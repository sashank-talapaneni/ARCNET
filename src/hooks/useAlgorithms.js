import { useMemo } from 'react';
import { algorithmDefinitions } from '../algorithms/index.js';

export function useAlgorithms(state) {
  return useMemo(() => Object.entries(algorithmDefinitions).map(([id, definition]) => ({
    ...definition,
    active: state.algorithms[id].active,
    results: state.algorithms[id].results,
    color: state.algorithms[id].color,
  })), [state.algorithms]);
}
