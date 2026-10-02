import { useReducer } from 'react';
import Sidebar from './components/layout/Sidebar.jsx';
import GraphCanvas from './components/layout/GraphCanvas.jsx';
import RightPanel from './components/layout/RightPanel.jsx';
import EventLog from './components/layout/EventLog.jsx';
import ExplanationPanel from './components/ai/ExplanationPanel.jsx';
import GlobalAssistant from './components/ai/GlobalAssistant.jsx';
import TooltipTour from './components/ui/TooltipTour.jsx';
import KeyboardShortcuts from './components/ui/KeyboardShortcuts.jsx';
import MatrixGraphInput from './components/graph/MatrixGraphInput.jsx';
import { appReducer } from './store/appReducer.js';
import { initialState } from './store/initialState.js';
import { useGraph } from './hooks/useGraph.js';
import { useSimulation } from './hooks/useSimulation.js';
import { useDynamicSimulation } from './hooks/useDynamicSimulation.js';
import { useAI } from './hooks/useAI.js';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts.js';

export default function App() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const graph = useGraph(state, dispatch);
  const simulation = useSimulation(state, dispatch);
  const dynamicSimulation = useDynamicSimulation(state, dispatch);
  const ai = useAI(state, dispatch);
  useKeyboardShortcuts(state, dispatch, simulation);
  return (
    <div className="app">
      <Sidebar state={state} dispatch={dispatch} simulation={simulation} dynamicSimulation={dynamicSimulation} ai={ai} />
      <div className={`center-column ${state.mode === 'BUILD' && state.activePreset === 'CUSTOM' ? 'matrix-mode' : ''}`}>
        <MatrixGraphInput state={state} dispatch={dispatch} />
        <GraphCanvas state={state} dispatch={dispatch} graph={graph} simulation={simulation} dynamicSimulation={dynamicSimulation} ai={ai} />
        <EventLog state={state} ai={ai} />
      </div>
      <RightPanel state={state} dispatch={dispatch} ai={ai} />
      <ExplanationPanel explanation={ai.activeExplanation} onClose={ai.clearExplanation} onFollowUp={ai.askFollowUp} />
      <TooltipTour state={state} dispatch={dispatch} />
      <KeyboardShortcuts />
      <GlobalAssistant ai={ai} />
    </div>
  );
}
