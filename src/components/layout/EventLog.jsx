import { useMemo, useState } from 'react';
import { algorithmDefinitions } from '../../algorithms/index.js';
import AskButton from '../ai/AskButton.jsx';

const filters = [
  { id: 'all', name: 'All', colorVar: 'var(--accent-cyan)' },
  { id: 'dijkstra', name: 'Dijkstra', colorVar: 'var(--algo-dijkstra)' },
  { id: 'floyd', name: 'Floyd', colorVar: 'var(--algo-floyd)' },
  { id: 'bfs', name: 'BFS', colorVar: 'var(--algo-bfs)' },
  { id: 'dfs', name: 'DFS', colorVar: 'var(--algo-dfs)' },
  { id: 'backtrack', name: 'Backtrack', colorVar: 'var(--algo-backtrack)' },
  { id: 'congestion', name: 'Congestion', colorVar: 'var(--congestion)' },
  { id: 'failure', name: 'Failure', colorVar: 'var(--failure)' },
  { id: 'reroute', name: 'Reroute', colorVar: 'var(--accent-cyan)' },
];
const ANALYSIS_FILTERS = ['all', 'dijkstra', 'floyd', 'bfs', 'dfs', 'backtrack'];

const icons = {
  VISIT: '●',
  FOUND: '✓',
  BACKTRACK: '↩',
  REJECT: '✕',
  CONGESTION: '⚡',
  NODE_FAILURE: '✕',
  FAILURE: '✕',
  REROUTE: '↻',
  RESTORE: '↻',
};

function normalizedType(event) {
  if (event.type === 'NODE_FAILURE') return 'FAILURE';
  if (event.type === 'RESTORE' || event.message?.toLowerCase().includes('rerouted')) return 'REROUTE';
  return event.type || 'SYSTEM';
}

function matchesFilter(event, filterId) {
  if (filterId === 'all') return true;
  if (algorithmDefinitions[filterId]) return event.algorithmId === filterId;
  const type = normalizedType(event).toLowerCase();
  if (filterId === 'failure') return type === 'failure';
  if (filterId === 'reroute') return type === 'reroute';
  if (filterId === 'congestion') return type === 'congestion' || (type === 'reroute' && event.message?.toLowerCase().includes('congestion'));
  return false;
}

function getEventLabel(event) {
  if (!event.algorithmId) return normalizedType(event);
  return algorithmDefinitions[event.algorithmId]?.name || event.algorithmId;
}

function getEventColor(event) {
  if (event.algorithmId) return algorithmDefinitions[event.algorithmId]?.colorVar || 'var(--accent-cyan)';
  if (normalizedType(event) === 'CONGESTION') return 'var(--congestion)';
  if (normalizedType(event) === 'FAILURE') return 'var(--failure)';
  return 'var(--accent-cyan)';
}

function exportLog(events) {
  const text = events.map((event) => `[${new Date(event.timestamp).toLocaleString()}] ${getEventLabel(event)} ${event.type}: ${event.message}`).join('\n');
  navigator.clipboard?.writeText(text);
}

export default function EventLog({ state, ai }) {
  const [activeFilter, setActiveFilter] = useState('all');
  const visibleFilters = state.simulationMode === 'ANALYSIS'
    ? filters.filter((filter) => ANALYSIS_FILTERS.includes(filter.id))
    : filters;
  const analysisEvents = useMemo(
    () => state.eventLog.filter((event) => Boolean(event.algorithmId && algorithmDefinitions[event.algorithmId])),
    [state.eventLog]
  );
  const countFor = (filterId) => {
    const source = state.simulationMode === 'ANALYSIS' ? analysisEvents : state.eventLog;
    return source.filter((event) => matchesFilter(event, filterId)).length;
  };
  const visibleEvents = useMemo(() => {
    const source = state.simulationMode === 'ANALYSIS' ? analysisEvents : state.eventLog;
    const validFilter = visibleFilters.some((filter) => filter.id === activeFilter) ? activeFilter : 'all';
    return source.filter((event) => matchesFilter(event, validFilter));
  }, [activeFilter, analysisEvents, state.eventLog, state.simulationMode, visibleFilters]);

  if (state.mode === 'BUILD') return null;
  if (state.simulationMode === 'DYNAMIC') return null;
  return (
    <div className="event-log panel">
      <div className="event-log-header">
        <div className="label">Event Log</div>
        <button className="export-log-button" type="button" onClick={() => exportLog(state.eventLog)}>Export Log</button>
        <div className="event-tabs">
          {visibleFilters.map((filter) => (
            <button
              key={filter.id}
              className={activeFilter === filter.id ? 'active' : ''}
              onClick={() => setActiveFilter(filter.id)}
              style={{ '--algo-color': filter.colorVar }}
              type="button"
            >
              <span>{filter.name}</span>
              <b>{countFor(filter.id)}</b>
            </button>
          ))}
        </div>
      </div>
      <div className="event-list">
        {visibleEvents.length === 0 && <p className="event-empty">No events for this filter yet.</p>}
        {visibleEvents.map((event, i) => {
          const type = normalizedType(event);
          const explainable = type === 'REROUTE' || type === 'FAILURE';
          return (
            <div key={`${event.timestamp}-${i}`} className="event-row enhanced-event-row">
              <span style={{ '--algo-color': getEventColor(event) }}><i>{icons[event.type] || icons[type] || '*'}</i>{getEventLabel(event)}</span>
              <p>{event.message}</p>
              {explainable && <AskButton label="AI" onAsk={(clickEvent) => ai.explain(type === 'FAILURE' ? 'FAILURE_EVENT' : 'REROUTE_EVENT', { event, results: Object.fromEntries(Object.entries(state.algorithms).map(([id, cfg]) => [id, cfg.results])), triggerRect: clickEvent.currentTarget.getBoundingClientRect() })} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
