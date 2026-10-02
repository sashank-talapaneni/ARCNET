const DEFAULT_TIMEOUT_MS = 45000;
const MAX_HISTORY_MESSAGES = 12;
const MAX_HISTORY_CHARS = 4000;
const MAX_SYSTEM_PROMPT_CHARS = 20000;
const MAX_USER_MESSAGE_CHARS = 120000;

export class AIServiceError extends Error {
  constructor(message, { code = 'AI_REQUEST_FAILED', status = 0, retryAfter = null } = {}) {
    super(message);
    this.name = 'AIServiceError';
    this.code = code;
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

function boundedHistory(history = []) {
  return history.slice(-MAX_HISTORY_MESSAGES).map((item) => ({
    role: item.role,
    content: String(item.content || '').slice(-MAX_HISTORY_CHARS),
  }));
}

function boundedText(value, maxChars) {
  const text = String(value || '');
  if (text.length <= maxChars) return text;
  const half = Math.floor(maxChars / 2);
  return `${text.slice(0, half)}\n\n[context truncated]\n\n${text.slice(-half)}`;
}

function parseErrorMessage(payload, fallback) {
  return payload?.message
    || payload?.error?.message
    || payload?.error?.error?.message
    || (typeof payload?.error === 'string' ? payload.error : null)
    || fallback;
}

export async function requestAI({
  systemPrompt,
  userMessage,
  conversationHistory = [],
  signal,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  const timeoutController = new AbortController();
  const timeoutId = window.setTimeout(() => timeoutController.abort(), timeoutMs);
  const abort = () => timeoutController.abort();
  signal?.addEventListener('abort', abort, { once: true });

  try {
    const response = await fetch('/api/ai/explain', {
      method: 'POST',
      signal: timeoutController.signal,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        systemPrompt: boundedText(systemPrompt, MAX_SYSTEM_PROMPT_CHARS),
        userMessage: boundedText(userMessage, MAX_USER_MESSAGE_CHARS),
        conversationHistory: boundedHistory(conversationHistory),
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new AIServiceError(
        parseErrorMessage(payload, `AI request failed (${response.status})`),
        {
          code: payload?.code || 'AI_REQUEST_FAILED',
          status: response.status,
          retryAfter: payload?.retryAfter || null,
        }
      );
    }
    if (!payload.response) {
      throw new AIServiceError('The AI provider returned an empty response.', { code: 'EMPTY_RESPONSE' });
    }
    return payload.response;
  } catch (error) {
    if (signal?.aborted) {
      const aborted = new Error('AI request cancelled');
      aborted.name = 'AbortError';
      throw aborted;
    }
    if (error.name === 'AbortError') {
      throw new AIServiceError('The AI request timed out. Please try again.', { code: 'TIMEOUT' });
    }
    if (error instanceof AIServiceError) throw error;
    throw new AIServiceError('AI service is unreachable. Start ARCNET with npm run dev.', { code: 'PROXY_UNAVAILABLE' });
  } finally {
    window.clearTimeout(timeoutId);
    signal?.removeEventListener('abort', abort);
  }
}

export function formatAIError(error) {
  if (error?.code === 'RATE_LIMITED') {
    return error.retryAfter
      ? `AI rate limit reached. Try again in ${error.retryAfter}.`
      : 'AI rate limit reached. Please try again shortly.';
  }
  if (error?.code === 'PAYLOAD_TOO_LARGE') {
    return 'The simulation context was too large. ARCNET reduced it; please retry.';
  }
  if (error?.code === 'MISSING_API_KEY') {
    return 'AI is not configured. Add GROQ_API_KEY to server/.env.';
  }
  return error?.message || 'AI request failed. Please try again.';
}
