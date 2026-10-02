import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import MetricsCard from '../algorithms/MetricsCard.jsx';
import PseudocodePanel from '../algorithms/PseudocodePanel.jsx';
import AlgoReferenceTab from '../algorithms/AlgoReferenceTab.jsx';
import ExplanationDisplayBlock from '../shared/ExplanationDisplayBlock.jsx';
import RecommenderPanel from '../ai/RecommenderPanel.jsx';
import { getWinner } from '../../utils/metricsUtils.js';
import { AlgorithmDetailedReport, WinnerAnalysis } from '../algorithms/DetailedReport.jsx';
import DynamicStatusPanel from '../dynamic/DynamicStatusPanel.jsx';
import DynamicEventFeed from '../dynamic/DynamicEventFeed.jsx';
import SessionReportPanel from '../dynamic/SessionReportPanel.jsx';

export default function RightPanel({ state, dispatch, ai }) {
  const [expandedReport, setExpandedReport] = useState(null);
  const analysisExplanationKey = useRef(null);
  const results = Object.fromEntries(Object.entries(state.algorithms).map(([id, cfg]) => [id, cfg.results]).filter(([, result]) => result));
  const winner = getWinner(results);
  const activeAlgorithms = Object.entries(state.algorithms).filter(([, cfg]) => cfg.active);
  const dynamicHighlightLine = useMemo(() => {
    const status = state.dynamicSession?.status;
    const algorithmId = state.dynamicSession?.selectedAlgorithm;

    if (status === 'REROUTING') {
      const lines = { dijkstra: 5, floyd: 5, bfs: 5, dfs: 6, backtrack: 9 };
      return lines[algorithmId] ?? 5;
    }
    if (status === 'DISCONNECTED') {
      const lines = { dijkstra: 17, floyd: 13, bfs: 16, dfs: 17, backtrack: 22 };
      return lines[algorithmId] ?? -1;
    }
    return -1;
  }, [state.dynamicSession?.selectedAlgorithm, state.dynamicSession?.status]);

  useEffect(() => {
    if (
      state.simulationMode !== 'ANALYSIS' ||
      state.mode !== 'ANALYZE' ||
      state.explanation.analysisContent ||
      state.explanation.analysisLoading ||
      state.explanation.analysisError
    ) return;

    const activeAlgos = Object.entries(state.algorithms)
      .filter(([, cfg]) => cfg.active && cfg.results);

    if (activeAlgos.length === 0) return;

    const allComplete = activeAlgos.every(
      ([, cfg]) => cfg.results?.found !== undefined
    );

    if (!allComplete) return;

    const key = activeAlgos
      .map(([id, cfg]) => `${id}:${cfg.results?.pathCost}:${cfg.results?.executionTime?.toFixed(3)}`)
      .join('|');

    if (analysisExplanationKey.current === key) return;
    analysisExplanationKey.current = key;

    dispatch({ type: 'SET_RIGHT_TAB', tab: 'EXPLAIN' });
    ai.generateExplanation('analysis');
  }, [
    state.mode,
    state.simulationMode,
    state.algorithms,
    state.explanation.analysisContent,
    state.explanation.analysisLoading,
    state.explanation.analysisError,
  ]);

  useEffect(() => {
    if (
      state.simulationMode !== 'DYNAMIC' ||
      state.mode !== 'ANALYZE' ||
      !state.dynamicSession.sessionReport ||
      state.explanation.dynamicContent ||
      state.explanation.dynamicLoading
    ) return;

    ai.generateExplanation('dynamic');
  }, [
    state.mode,
    state.simulationMode,
    state.dynamicSession.sessionReport,
    state.explanation.dynamicContent,
    state.explanation.dynamicLoading,
  ]);

  return (
    <AnimatePresence>
      <motion.aside className="right-panel panel" initial={{ x: 340, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 340, opacity: 0 }}>
        {state.simulationMode === 'DYNAMIC' ? (
          <>
            <div className="tab-bar">
              <button className={`tab-btn ${!['CODE', 'FEED', 'ALGOS'].includes(state.rightPanelTab) ? 'active' : ''}`} onClick={() => dispatch({ type: 'SET_RIGHT_TAB', tab: 'STATUS' })}>STATUS</button>
              <button className={`tab-btn ${state.rightPanelTab === 'CODE' ? 'active' : ''}`} onClick={() => dispatch({ type: 'SET_RIGHT_TAB', tab: 'CODE' })}>CODE</button>
              <button className={`tab-btn ${state.rightPanelTab === 'FEED' ? 'active' : ''}`} onClick={() => dispatch({ type: 'SET_RIGHT_TAB', tab: 'FEED' })}>FEED</button>
              <button className={`tab-btn ${state.rightPanelTab === 'ALGOS' ? 'active' : ''}`} onClick={() => dispatch({ type: 'SET_RIGHT_TAB', tab: 'ALGOS' })}>ALGOS</button>
            </div>
            <div className="right-panel-content">
              {state.rightPanelTab === 'ALGOS' && (
                <AlgoReferenceTab nodeCount={state.graph.nodes.length} edgeCount={state.graph.edges.length} />
              )}
              {state.rightPanelTab === 'FEED' && <DynamicEventFeed state={state} />}
              {state.rightPanelTab === 'CODE' && (
                <PseudocodePanel
                  state={state}
                  dispatch={dispatch}
                  ai={ai}
                  algorithmId={state.dynamicSession.selectedAlgorithm}
                  contextualStatus={state.dynamicSession.status}
                  activeLine={dynamicHighlightLine}
                />
              )
              }
              {!['CODE', 'FEED', 'ALGOS'].includes(state.rightPanelTab) && (
                state.mode === 'ANALYZE' ? (
                  <SessionReportPanel
                    state={state}
                    ai={ai}
                    explanation={state.explanation}
                    onGenerateExplanation={() => ai.generateExplanation('dynamic')}
                  />
                ) : (
                  <DynamicStatusPanel state={state} />
                )
              )}
            </div>
          </>
        ) : (
          <>
            <div className="tab-bar">
              {['METRICS', 'CODE', 'INSIGHTS', 'EXPLAIN', 'ALGOS'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => dispatch({ type: 'SET_RIGHT_TAB', tab })}
                  className={`tab-btn ${state.rightPanelTab === tab || (tab === 'METRICS' && !['CODE', 'INSIGHTS', 'EXPLAIN', 'ALGOS'].includes(state.rightPanelTab)) ? 'active' : ''}`}
                  disabled={['INSIGHTS', 'EXPLAIN'].includes(tab) && state.mode !== 'ANALYZE'}
                >
                  {tab}
                </button>
              ))}
            </div>
            <div className="right-panel-content">
              {!['CODE', 'INSIGHTS', 'EXPLAIN', 'ALGOS'].includes(state.rightPanelTab) && (
                <div className="metrics-content">
                  {activeAlgorithms.map(([id, cfg]) => (
                    <MetricsCard key={id} id={id} result={cfg.results} winner={winner} ai={ai} onFocus={() => setExpandedReport((current) => (current === id ? null : id))} />
                  ))}
                  {state.mode === 'ANALYZE' && activeAlgorithms.map(([id, cfg]) => (
                    <AlgorithmDetailedReport key={`report-${id}`} id={id} result={cfg.results} state={state} results={results} expanded={expandedReport === id} onToggle={() => setExpandedReport((current) => (current === id ? null : id))} ai={ai} />
                  ))}
                  <WinnerAnalysis state={state} ai={ai} />
                </div>
              )}
              {state.rightPanelTab === 'CODE' && <PseudocodePanel state={state} dispatch={dispatch} ai={ai} />}
              {state.rightPanelTab === 'INSIGHTS' && <RecommenderPanel state={state} ai={ai} />}
              {state.rightPanelTab === 'EXPLAIN' && (
                <ExplanationDisplayBlock
                  mode="analysis"
                  explanation={state.explanation}
                  onGenerate={() => ai.generateExplanation('analysis')}
                />
              )}
              {state.rightPanelTab === 'ALGOS' && (
                <AlgoReferenceTab nodeCount={state.graph.nodes.length} edgeCount={state.graph.edges.length} />
              )}
            </div>
          </>
        )}
      </motion.aside>
    </AnimatePresence>
  );
}
