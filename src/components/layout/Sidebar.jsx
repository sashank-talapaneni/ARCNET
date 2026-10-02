import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, BarChart2, Play, RotateCcw, Square } from 'lucide-react';
import AlgorithmToggle from '../algorithms/AlgorithmToggle.jsx';
import { algorithmDefinitions } from '../../algorithms/index.js';
import CongestionControls from '../simulation/CongestionControls.jsx';
import PlaybackControls from '../simulation/PlaybackControls.jsx';
import ModeIndicator from '../ui/ModeIndicator.jsx';
import { topologies } from '../../utils/topologies.js';
import { hasReachablePath } from '../../utils/graphUtils.js';

const complexities = {
  dijkstra: 'O((V+E) log V)',
  floyd: 'O(V^3)',
  bfs: 'O(V+E)',
  dfs: 'O(V+E)',
  backtrack: 'O(b^d)',
};

function ModeCard({ mode, selected, disabled, icon: Icon, title, description, onClick }) {
  return (
    <button className={`mode-card ${selected ? 'selected' : ''} ${mode.toLowerCase()}`} type="button" disabled={disabled} title={disabled ? 'Load a named preset to use Dynamic Network mode' : ''} onClick={onClick}>
      <Icon size={16} />
      <b>{title.map((line) => <span key={line}>{line}</span>)}</b>
      <small>{description}</small>
    </button>
  );
}

export default function Sidebar({ state, dispatch, simulation, dynamicSimulation, ai }) {
  const [dynamicError, setDynamicError] = useState('');
  const reachable = hasReachablePath(state.graph, state.routing.source, state.routing.destination);
  const dynamicDisabled = state.activePreset === 'CUSTOM';
  const runDisabled = !state.simulationMode || !simulation.canRun;
  const sessionActive = state.dynamicSession.active;
  const activeAlgorithmCount = Object.values(state.algorithms).filter((algorithm) => algorithm.active).length;
  const analysisComplete = state.mode === 'ANALYZE'
    && state.simulation.running === false
    && state.simulation.completedAlgorithms.length === activeAlgorithmCount;

  useEffect(() => setDynamicError(''), [state.routing.source, state.routing.destination, state.dynamicSession.selectedAlgorithm]);

  const selectMode = (mode) => {
    if (state.simulationMode !== mode) dispatch({ type: 'SET_SIMULATION_MODE', payload: mode });
  };

  const startDynamic = () => {
    const result = dynamicSimulation.startSession();
    if (result?.error) setDynamicError(result.error);
  };

  return (
    <motion.aside className="sidebar panel" initial={{ x: -280, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>
      <div className="sidebar-scroll">
        <div className="logo"><b><span>ARC</span>NET</b><small>Algorithm Routing Comparator</small></div>
        <ModeIndicator mode={state.mode} />
        <div className="section">
          <div className="label">Topologies</div>
          {Object.entries(topologies).map(([id, topology]) => <button key={id} onClick={() => dispatch({ type: 'LOAD_PRESET', preset: id })} className={state.activePreset === id ? 'active' : ''}>{topology.name}</button>)}
        </div>
        <div className="section mode-select">
          <div className="label">Simulation Mode</div>
          <div className="mode-card-row">
            <ModeCard mode="ANALYSIS" selected={state.simulationMode === 'ANALYSIS'} icon={BarChart2} title={['Algorithm', 'Analysis']} description="Compare all 5 algorithms" onClick={() => selectMode('ANALYSIS')} />
            <ModeCard mode="DYNAMIC" selected={state.simulationMode === 'DYNAMIC'} disabled={dynamicDisabled} icon={Activity} title={['Dynamic', 'Network']} description="One algorithm, live events" onClick={() => selectMode('DYNAMIC')} />
          </div>
          {!state.simulationMode && <p className="mode-hint">Select a mode to continue</p>}
        </div>
        {state.mode === 'BUILD' && (
          <div className="section">
            <div className="label">Route</div>
            <select value={state.routing.source || ''} onChange={(event) => dispatch({ type: 'SET_ROUTING', routing: { source: event.target.value } })}><option value="">Source</option>{state.graph.nodes.map((node) => <option key={node.id}>{node.id}</option>)}</select>
            <select value={state.routing.destination || ''} onChange={(event) => dispatch({ type: 'SET_ROUTING', routing: { destination: event.target.value } })}><option value="">Destination</option>{state.graph.nodes.map((node) => <option key={node.id}>{node.id}</option>)}</select>
            {simulation.canRun && !reachable && <p className="route-warning">No directed path currently exists from source to destination.</p>}
          </div>
        )}
        {state.simulationMode !== 'DYNAMIC' && (
          <>
            <div className="section">
              <div className="label">Algorithms</div>
              {Object.entries(state.algorithms).map(([id, cfg]) => <AlgorithmToggle key={id} id={id} active={cfg.active} onToggle={() => dispatch({ type: 'TOGGLE_ALGORITHM', id })} />)}
            </div>
            <CongestionControls state={state} dispatch={dispatch} />
          </>
        )}
        {state.simulationMode === 'DYNAMIC' && (
          <>
            <div className="section dynamic-config">
              <div className="label">Routing Algorithm</div>
              {Object.entries(algorithmDefinitions).map(([id, definition]) => (
                <button
                  key={id}
                  type="button"
                  className={`dynamic-algo-row ${state.dynamicSession.selectedAlgorithm === id ? 'selected' : ''}`}
                  style={{
                    '--algo-color': definition.colorVar,
                    pointerEvents: sessionActive ? 'none' : 'auto',
                    opacity: sessionActive ? 0.45 : 1,
                    cursor: sessionActive ? 'not-allowed' : 'pointer',
                  }}
                  onClick={() => {
                    if (!sessionActive) dispatch({ type: 'SET_DYNAMIC_ALGORITHM', payload: id });
                  }}
                >
                  <span className="radio-dot" />
                  <b>{definition.name}</b>
                  <em>{complexities[id]}</em>
                  {id === 'floyd' && <small>Requires full recompute on every event</small>}
                  {id === 'bfs' && <small>Ignores edge weights - immune to cost spikes</small>}
                </button>
              ))}
            </div>
            {state.dynamicSession.selectedAlgorithm === 'backtrack' && <CongestionControls state={state} dispatch={dispatch} />}
            <div
              className="section dynamic-config"
              style={{
                pointerEvents: sessionActive ? 'none' : 'auto',
                opacity: sessionActive ? 0.45 : 1,
                cursor: sessionActive ? 'not-allowed' : 'auto',
              }}
            >
              <div className="label">Network Events</div>
              <label className="config-row"><span>Event Interval</span><b>Every ~{state.dynamicSession.eventConfig.baseInterval}s</b></label>
              <input type="range" min="3" max="15" step="1" disabled={sessionActive} value={state.dynamicSession.eventConfig.baseInterval} onChange={(event) => dispatch({ type: 'UPDATE_EVENT_CONFIG', payload: { baseInterval: Number(event.target.value) } })} />
              <div className="label">Event Types</div>
              {[
                ['enableNodeCrash', 'Node Crashes'],
                ['enableLinkSpike', 'Link Cost Spikes'],
                ['enableRecoveries', 'Recoveries'],
              ].map(([key, label]) => (
                <label key={key} className="check-row"><input type="checkbox" disabled={sessionActive} checked={state.dynamicSession.eventConfig[key]} onChange={(event) => dispatch({ type: 'UPDATE_EVENT_CONFIG', payload: { [key]: event.target.checked } })} /> {label}</label>
              ))}
              <div className="label">Session Duration</div>
              <div className="duration-pills">
                {[30, 60, 120, null].map((value) => (
                  <button key={value ?? 'manual'} type="button" disabled={sessionActive} className={state.dynamicSession.eventConfig.sessionDuration === value ? 'active' : ''} onClick={() => dispatch({ type: 'UPDATE_EVENT_CONFIG', payload: { sessionDuration: value } })}>{value ? `${value}s` : 'Manual'}</button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
      <div className="sidebar-fixed">
        {state.mode === 'BUILD' && state.simulationMode !== 'DYNAMIC' && <button className="run-button pulse" disabled={runDisabled} title={!state.simulationMode ? 'Select a simulation mode first' : ''} onClick={simulation.run} type="button"><Play size={16} /> Run Simulation</button>}
        {state.mode === 'BUILD' && state.simulationMode === 'DYNAMIC' && !state.dynamicSession.active && <button className="run-button pulse" disabled={!simulation.canRun} onClick={startDynamic} type="button"><Play size={16} /> Start Dynamic Session</button>}
        {state.dynamicSession.active && <button className="run-button stop-button" type="button" onClick={dynamicSimulation.stopSession}><Square size={16} /> Stop Session</button>}
        {dynamicError && <p className="route-warning">{dynamicError}</p>}
        {state.mode === 'RUN' && state.simulationMode === 'ANALYSIS' && state.simulation.running === true && <PlaybackControls state={state} simulation={simulation} />}
        {analysisComplete && state.simulationMode === 'ANALYSIS' && (
          <div className="sidebar-actions">
            <button type="button" onClick={simulation.reset}><RotateCcw size={15} /> Edit Network</button>
            <button className="run-button pulse" type="button" disabled={!simulation.canRun} onClick={simulation.run}><Play size={15} /> Run Again</button>
          </div>
        )}
        {state.mode === 'ANALYZE' && state.simulationMode === 'DYNAMIC' && state.dynamicSession.active === false && (
          <div className="sidebar-actions">
            <button type="button" onClick={simulation.reset}><RotateCcw size={15} /> Edit Network</button>
            <button className="run-button pulse" type="button" disabled={!simulation.canRun} onClick={startDynamic}><Play size={15} /> Run Again</button>
          </div>
        )}
      </div>
    </motion.aside>
  );
}
