import { useEffect } from 'react';
import { ACTIONS } from '../store/appReducer.js';

export function useKeyboardShortcuts(state, dispatch, simulation) {
  useEffect(() => {
    const handler = (event) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
      if (event.key === ' ') { event.preventDefault(); simulation.playPause(); }
      if (event.key === 'ArrowRight') simulation.stepForward();
      if (event.key === 'ArrowLeft') simulation.stepBack();
      if (event.key.toLowerCase() === 'r') simulation.reset();
      if (['1', '2', '3', '4', '5'].includes(event.key)) {
        const ids = ['dijkstra', 'floyd', 'bfs', 'dfs', 'backtrack'];
        dispatch({ type: ACTIONS.TOGGLE_ALGORITHM, id: ids[Number(event.key) - 1] });
      }
      if (event.key === 'Escape') dispatch({ type: ACTIONS.SET_AI_EXPLANATION, explanation: null });
      if (event.key === '?') dispatch({ type: ACTIONS.SET_AI_EXPLANATION, explanation: { content: 'Shortcuts: Space play/pause, arrows step, R reset, 1-5 toggle algorithms, Escape closes panels.', loading: false } });
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dispatch, simulation]);
}
