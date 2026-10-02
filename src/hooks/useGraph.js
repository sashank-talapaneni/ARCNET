import { useCallback } from 'react';
import { ACTIONS } from '../store/appReducer.js';
import { createGraphApi } from '../utils/graphUtils.js';

export function useGraph(state, dispatch) {
  const addNode = useCallback((x, y) => {
    const id = `N${state.graph.nodes.length + 1}`;
    dispatch({ type: ACTIONS.ADD_NODE, node: { id, label: id, x, y, failed: false } });
  }, [dispatch, state.graph.nodes.length]);

  const addEdge = useCallback((from, to, weight = 5) => {
    if (!from || !to || from === to) return;
    dispatch({ type: ACTIONS.ADD_EDGE, edge: { id: `${from}-${to}-${Date.now()}`, from, to, weight, congested: false, failed: false } });
  }, [dispatch]);

  return {
    ...createGraphApi(state.graph),
    addNode,
    removeNode: (id) => dispatch({ type: ACTIONS.REMOVE_NODE, id }),
    addEdge,
    removeEdge: (id) => dispatch({ type: ACTIONS.REMOVE_EDGE, id }),
    updateEdgeWeight: (id, weight) => dispatch({ type: ACTIONS.UPDATE_EDGE_WEIGHT, id, weight }),
    setCongested: (id, congested) => dispatch({ type: ACTIONS.SET_CONGESTED, id, congested }),
    setNodeFailed: (id, failed) => dispatch({ type: ACTIONS.SET_NODE_FAILED, id, failed }),
  };
}
