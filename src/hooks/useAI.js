import { useCallback, useEffect, useRef, useState } from 'react';
import {
  buildAnalysisExplanationPrompt,
  buildDynamicExplanationPrompt,
  buildPrompt,
  buildSimulationContext,
  systemPrompt,
} from '../utils/aiPrompts.js';
import { formatAIError, requestAI } from '../utils/aiClient.js';

const educationalSystemPrompt = `You are an expert computer science professor creating educational content for students learning algorithm design and analysis. Always be specific, always reference real numbers from the data provided, never give generic definitions. Write in clear flowing prose without markdown formatting.`;

export function useAI(state, dispatch) {
  const explanationController = useRef(null);
  const globalController = useRef(null);
  const generationController = useRef(null);
  const recommendationController = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeExplanation, setActiveExplanation] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [globalAssistantOpen, setGlobalAssistantOpen] = useState(false);
  const [globalHistory, setGlobalHistory] = useState([]);
  const [isGlobalLoading, setIsGlobalLoading] = useState(false);
  const [autoRecommendation, setAutoRecommendation] = useState(null);
  const [autoRecommendationLoading, setAutoRecommendationLoading] = useState(false);
  const lastAutoKey = useRef(null);
  const explanationRequests = useRef({ analysis: false, dynamic: false });

  const callProxy = useCallback((userMessage, history = [], signal) => requestAI({
    systemPrompt,
    userMessage,
    conversationHistory: history,
    signal,
  }), []);

  const explain = useCallback(async (triggerType, contextData = {}) => {
    const simulationContext = buildSimulationContext(state);
    const prompt = buildPrompt(triggerType, contextData, simulationContext);
    const userMessage = `Simulation context: ${JSON.stringify(simulationContext)}\n\n${prompt}`;
    const nextHistory = [];
    setConversationHistory(nextHistory);
    setActiveExplanation({ content: '', triggerType, contextData, loading: true, triggerRect: contextData.triggerRect });
    setIsLoading(true);
    explanationController.current?.abort();
    explanationController.current = new AbortController();
    try {
      const content = await callProxy(userMessage, nextHistory, explanationController.current.signal);
      setConversationHistory([{ role: 'user', content: userMessage }, { role: 'assistant', content }]);
      setActiveExplanation({ content, triggerType, contextData, loading: false, triggerRect: contextData.triggerRect });
    } catch (error) {
      if (error.name !== 'AbortError') setActiveExplanation({ content: formatAIError(error), triggerType, contextData, loading: false, triggerRect: contextData.triggerRect });
    } finally {
      setIsLoading(false);
    }
  }, [callProxy, state]);

  const askFollowUp = useCallback(async (question) => {
    if (!question.trim()) return;
    const simulationContext = buildSimulationContext(state);
    const userMessage = `Simulation context: ${JSON.stringify(simulationContext)}\n\nFollow-up question: ${question}`;
    const nextHistory = [...conversationHistory, { role: 'user', content: userMessage }];
    setConversationHistory(nextHistory);
    setActiveExplanation((current) => ({ ...(current || {}), loading: true }));
    setIsLoading(true);
    explanationController.current?.abort();
    explanationController.current = new AbortController();
    try {
      const content = await callProxy(userMessage, nextHistory, explanationController.current.signal);
      setConversationHistory([...nextHistory, { role: 'assistant', content }]);
      setActiveExplanation((current) => ({ ...(current || {}), content, loading: false }));
    } catch (error) {
      if (error.name !== 'AbortError') setActiveExplanation((current) => ({ ...(current || {}), content: formatAIError(error), loading: false }));
    } finally {
      setIsLoading(false);
    }
  }, [callProxy, conversationHistory, state]);

  const askGlobal = useCallback(async (question) => {
    if (!question.trim()) return;
    setGlobalAssistantOpen(true);
    const simulationContext = buildSimulationContext(state);
    const globalSystemPrompt = `You are ARCNET AI, the intelligent assistant embedded inside ARCNET.

ARCNET (Algorithm Routing Comparator for Network Education and Testing) is an interactive educational tool with these features:

1. ALGORITHM ANALYSIS MODE: Simultaneously runs and visualizes all 5 routing algorithms (Dijkstra, Floyd-Warshall, BFS, DFS, Backtracking) on the same network topology. Shows synchronized path animations, live metrics, and pseudocode execution.

2. DYNAMIC NETWORK MODE: Single algorithm runs on a live network where random events fire automatically — node crashes, link cost spikes, and recoveries. The algorithm must reroute in real time. Session ends with a full report and resilience score.

3. ALGORITHM REFERENCE TAB: Educational cards for all 5 algorithms showing time complexity, concrete operation counts, best and worst use cases, and network failure robustness.

4. AI EXPLANATIONS: Context-aware explanations at every element — algorithm decisions, metrics, pseudocode lines, events. Post-simulation educational narratives explaining what happened and why.

5. PRESET TOPOLOGIES: Campus Network, Data Center, Mesh Network, Internet Backbone, plus custom adjacency matrix input.

You answer two types of questions:
TYPE 1 — General questions about ARCNET, algorithms, or networking: answer from general knowledge, do not inject simulation data.
TYPE 2 — Questions about the current simulation: use the provided simulation context.

When explaining why the winner won, explicitly name the winning algorithm, its score, and the topology.
When asked for bullet points, use clean Markdown bullets.
Always round numbers: execution times to 2 decimal places with an 'ms' suffix, costs and hops as integers, and percentages to 1 decimal place. Never show raw floating point numbers like 0.09999999403953552.`;
    const resultSummary = Object.entries(simulationContext.algorithms.results || {})
      .filter(([, result]) => result?.found)
      .map(([id, result]) => (
        `${id}: cost=${Math.round(Number(result.pathCost) || 0)}, hops=${Math.round(Number(result.hopCount) || 0)}, time=${(Number(result.executionTime) || 0).toFixed(2)}ms`
      ))
      .join('; ');
    const winnerScore = simulationContext.metrics.winner
      ? simulationContext.metrics.scores?.[simulationContext.metrics.winner]
      : null;
    const contextBlock = `
CURRENT SIMULATION CONTEXT (use only if the question is specifically about this simulation):
Topology: ${simulationContext.topology.name}
Algorithms run: ${simulationContext.algorithms.active.join(', ')}
Winner: ${simulationContext.metrics.winner}
Winner score: ${winnerScore == null ? 'not available' : `${Number(winnerScore).toFixed(1)}%`}
Mode: ${simulationContext.simulation.mode}
Algorithm results summary: ${resultSummary}
`;
    const userMessage = `${question}\n\n${contextBlock}`;
    const nextHistory = [...globalHistory, { role: 'user', content: question }];
    setGlobalHistory(nextHistory);
    setIsGlobalLoading(true);
    globalController.current?.abort();
    globalController.current = new AbortController();
    try {
      const content = await requestAI({
        systemPrompt: globalSystemPrompt,
        userMessage,
        conversationHistory: globalHistory,
        signal: globalController.current.signal,
      });
      setGlobalHistory([...nextHistory, { role: 'assistant', content }]);
    } catch (error) {
      if (error.name !== 'AbortError') setGlobalHistory([...nextHistory, { role: 'assistant', content: formatAIError(error) }]);
    } finally {
      setIsGlobalLoading(false);
    }
  }, [callProxy, globalHistory, state]);

  const generateExplanation = useCallback(async (mode) => {
    if (explanationRequests.current[mode]) return;
    explanationRequests.current[mode] = true;
    dispatch({
      type: 'SET_EXPLANATION_LOADING',
      payload: { mode },
    });

    const prompt = mode === 'analysis'
      ? buildAnalysisExplanationPrompt(state)
      : buildDynamicExplanationPrompt(state);

    if (!prompt) {
      dispatch({
        type: 'SET_EXPLANATION_ERROR',
        payload: {
          mode,
          error: 'Insufficient simulation data to generate explanation.',
        },
      });
      explanationRequests.current[mode] = false;
      return;
    }

    try {
      generationController.current?.abort();
      generationController.current = new AbortController();
      const content = await requestAI({
        systemPrompt: educationalSystemPrompt,
        userMessage: prompt,
        conversationHistory: [],
        signal: generationController.current.signal,
      });
      dispatch({
        type: 'SET_EXPLANATION_CONTENT',
        payload: {
          mode,
          content,
        },
      });
    } catch (error) {
      if (error.name !== 'AbortError') {
        dispatch({
          type: 'SET_EXPLANATION_ERROR',
          payload: { mode, error: formatAIError(error) },
        });
      }
    } finally {
      explanationRequests.current[mode] = false;
    }
  }, [dispatch, state]);

  useEffect(() => {
    if (state.mode !== 'ANALYZE') return;
    const key = `${state.activePreset}-${state.simulation.totalSteps}-${state.simulation.currentStep}`;
    if (lastAutoKey.current === key) return;
    lastAutoKey.current = key;
    const simulationContext = buildSimulationContext(state);
    const userMessage = `Simulation context: ${JSON.stringify(simulationContext)}\n\n${buildPrompt('AUTO_RECOMMEND', {}, simulationContext)}`;
    setAutoRecommendationLoading(true);
    recommendationController.current?.abort();
    recommendationController.current = new AbortController();
    callProxy(userMessage, [], recommendationController.current.signal)
      .then((content) => setAutoRecommendation(content))
      .catch((error) => {
        if (error.name !== 'AbortError') setAutoRecommendation(formatAIError(error));
      })
      .finally(() => setAutoRecommendationLoading(false));
  }, [callProxy, state]);

  return {
    explain,
    isLoading,
    activeExplanation,
    clearExplanation: () => setActiveExplanation(null),
    askFollowUp,
    conversationHistory,
    globalAssistantOpen,
    openGlobalAssistant: () => setGlobalAssistantOpen(true),
    closeGlobalAssistant: () => setGlobalAssistantOpen(false),
    askGlobal,
    globalHistory,
    isGlobalLoading,
    autoRecommendation,
    autoRecommendationLoading,
    generateExplanation,
    explanation: state.explanation,
  };
}
