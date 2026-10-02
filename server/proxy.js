const express = require('express')
const cors = require('cors')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '.env') })

const app = express()
const port = Number(process.env.AI_PROXY_PORT) || 3001
const models = (process.env.GROQ_MODELS || 'llama-3.3-70b-versatile,llama-3.1-8b-instant')
  .split(',')
  .map((model) => model.trim())
  .filter(Boolean)
const modelCooldowns = new Map()

app.use(cors({
  origin(origin, callback) {
    if (!origin || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
      return callback(null, true)
    }
    return callback(new Error(`CORS: origin not allowed: ${origin}`))
  }
}))
app.use(express.json({ limit: '1mb' }))

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    provider: 'groq',
    configured: Boolean(process.env.GROQ_API_KEY),
    models,
  })
})

function providerMessage(payload, fallback) {
  return payload?.error?.message
    || payload?.error?.error?.message
    || (typeof payload?.error === 'string' ? payload.error : null)
    || fallback
}

function retryAfterLabel(response, message) {
  const seconds = Number(response.headers.get('retry-after'))
  if (Number.isFinite(seconds) && seconds > 0) return `${Math.ceil(seconds)} seconds`
  const match = String(message || '').match(/try again in ([^.]+(?:\.\d+)?s)/i)
  return match?.[1] || null
}

function retryAfterMs(response, message) {
  const seconds = Number(response.headers.get('retry-after'))
  if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000
  const match = String(message || '').match(/try again in (?:(\d+)m)?([\d.]+)s/i)
  if (!match) return 60000
  return (((Number(match[1]) || 0) * 60) + (Number(match[2]) || 0)) * 1000
}

async function requestModel(model, messages) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 40000)
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 1024,
        temperature: 0.7,
      }),
    })
    const payload = await response.json().catch(() => ({}))
    return { response, payload }
  } finally {
    clearTimeout(timeoutId)
  }
}

app.post('/api/ai/explain', async (req, res) => {
  const { systemPrompt, userMessage, conversationHistory } = req.body || {}

  if (!process.env.GROQ_API_KEY) {
    return res.status(503).json({
      code: 'MISSING_API_KEY',
      message: 'GROQ_API_KEY is not configured in server/.env',
    })
  }
  if (typeof userMessage !== 'string' || !userMessage.trim()) {
    return res.status(400).json({ code: 'INVALID_REQUEST', message: 'userMessage is required' })
  }

  const messages = [
    { role: 'system', content: systemPrompt || 'You are a helpful assistant.' },
    ...(Array.isArray(conversationHistory) ? conversationHistory : []),
    { role: 'user', content: userMessage },
  ]

  let lastFailure = null
  for (const model of models) {
    const cooldownUntil = modelCooldowns.get(model) || 0
    if (cooldownUntil > Date.now()) {
      lastFailure = {
        status: 429,
        code: 'RATE_LIMITED',
        message: `${model} is temporarily rate-limited`,
        retryAfter: `${Math.ceil((cooldownUntil - Date.now()) / 1000)} seconds`,
      }
      continue
    }
    try {
      const { response, payload } = await requestModel(model, messages)
      if (response.ok) {
        const text = payload.choices?.[0]?.message?.content || ''
        if (!text) {
          lastFailure = { status: 502, code: 'EMPTY_RESPONSE', message: `${model} returned an empty response` }
          continue
        }
        return res.json({ response: text, model })
      }

      const message = providerMessage(payload, `Groq request failed (${response.status})`)
      const retryAfter = retryAfterLabel(response, message)
      if (response.status === 429) {
        modelCooldowns.set(model, Date.now() + retryAfterMs(response, message))
      }
      lastFailure = {
        status: response.status,
        code: response.status === 429 ? 'RATE_LIMITED' : 'PROVIDER_ERROR',
        message,
        retryAfter,
      }
      console.warn(`Groq model ${model} failed (${response.status}): ${message}`)

      if (![404, 429, 500, 502, 503, 504].includes(response.status)) break
    } catch (error) {
      const message = error.name === 'AbortError'
        ? `Groq model ${model} timed out`
        : error.message
      lastFailure = { status: 502, code: 'PROVIDER_UNAVAILABLE', message }
      console.warn(message)
    }
  }

  return res.status(lastFailure?.status || 502).json(lastFailure || {
    code: 'PROVIDER_UNAVAILABLE',
    message: 'No Groq model was available.',
  })
})

app.use((error, req, res, next) => {
  if (error?.type === 'entity.too.large') {
    return res.status(413).json({
      code: 'PAYLOAD_TOO_LARGE',
      message: 'AI request context exceeded the 1 MB proxy limit.',
    })
  }
  console.error('Proxy error:', error)
  return res.status(500).json({ code: 'PROXY_ERROR', message: error.message || 'Proxy error' })
})

app.listen(port, () => {
  console.log(`ARCNET AI proxy running on port ${port} with models: ${models.join(', ')}`)
})
