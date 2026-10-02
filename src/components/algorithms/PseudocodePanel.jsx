import { algorithmDefinitions } from '../../algorithms/index.js';
import AskButton from '../ai/AskButton.jsx';

function contextualNote(algorithmId, status) {
  if (status === 'RUNNING') return { text: 'Monitoring active path...', className: '' };
  if (status === 'REROUTING' && algorithmId === 'backtrack') return { text: 'Checking constraint threshold...', className: 'rerouting' };
  if (status === 'REROUTING') return { text: 'Finding new path...', className: 'rerouting' };
  if (status === 'DISCONNECTED') return { text: 'No valid path exists', className: 'disconnected' };
  return null;
}

export default function PseudocodePanel({ state, dispatch, ai, algorithmId = null, contextualStatus = null, activeLine = null }) {
  const activeIds = Object.entries(state.algorithms).filter(([, cfg]) => cfg.active).map(([id]) => id);
  const focused = algorithmId || (activeIds.includes(state.focusedAlgorithm) ? state.focusedAlgorithm : activeIds[0]);
  const definition = algorithmDefinitions[focused];
  const line = contextualStatus ? null : state.simulation.visual[focused]?.line;
  const note = contextualNote(focused, contextualStatus);
  const hasExplicitActiveLine = Number.isInteger(activeLine) && activeLine >= 0;

  if (!definition) {
    return (
      <div className="pseudocode-panel">
        <p className="event-empty">Enable an algorithm to view pseudocode.</p>
      </div>
    );
  }

  return (
    <div className="pseudocode-panel">
      {!algorithmId && (
        <div className="pseudo-selector">
          {activeIds.map((id) => (
            <button key={id} onClick={() => dispatch({ type: 'SET_FOCUSED_ALGORITHM', id })} className={focused === id ? 'active' : ''}>{algorithmDefinitions[id]?.name || id}</button>
          ))}
        </div>
      )}
      <pre>
        {definition.pseudocode.map((text, i) => (
          <div key={`${focused}-${i}`} className={`code-line ${(hasExplicitActiveLine ? activeLine === i : line === i) ? `active ${contextualStatus === 'DISCONNECTED' ? 'failure-context' : ''}` : ''}`}>
            <span>{String(i).padStart(2, '0')}</span><code>{text}</code><AskButton label="AI" onAsk={(event) => ai.explain('PSEUDOCODE_LINE', { algorithmId: focused, lineNumber: i, lineContent: text, currentSimulationStep: state.simulation.currentStep, mostRecentStepData: state.simulation.allSteps[state.simulation.currentStep - 1], triggerRect: event.currentTarget.getBoundingClientRect() })} />
          </div>
        ))}
      </pre>
      {note && <p className={`pseudocode-context-note ${note.className}`}>{note.text}</p>}
    </div>
  );
}
