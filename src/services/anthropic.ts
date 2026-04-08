import type { BenchmarkConfig, BenchmarkResult, TokenUsage, AnthropicUsage } from '../types/index'

/**
 * Strips trailing slash and accidental /v1/messages suffix from base URL.
 */
export function normalizeBaseUrl(url: string): string {
  let normalized = url.trim()
  normalized = normalized.replace(/\/v1\/messages\/?$/, '')
  normalized = normalized.replace(/\/+$/, '')
  return normalized
}

/**
 * Sends a non-streaming request to Anthropic /v1/messages.
 * Measures total response time with performance.now().
 * Returns a BenchmarkResult with timing, token usage, and response text.
 * On error, returns a BenchmarkResult with the error field set.
 */
export async function sendNonStreaming(
  config: BenchmarkConfig,
  id: string,
  iteration: number
): Promise<BenchmarkResult> {
  const startTime = performance.now()
  const baseUrl = normalizeBaseUrl(config.baseUrl)

  try {
    const response = await fetch(`${baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: 'user', content: config.prompt }],
        max_tokens: config.maxTokens,
        stream: false,
      }),
    })

    const responseTimeMs = performance.now() - startTime
    const json = await response.json()

    if (!response.ok) {
      const errorMsg = (json as { error?: { message?: string } }).error?.message ?? `HTTP ${response.status}`
      return {
        id,
        mode: 'non-stream',
        iteration,
        responseTimeMs,
        ttftMs: null,
        tokens: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
        costUsd: null,
        error: errorMsg,
        responseText: '',
      }
    }

    const data = json as {
      content: Array<{ type: string; text: string }>
      usage: AnthropicUsage
    }

    const usage = data.usage
    const tokens: TokenUsage = {
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      cacheReadTokens: usage.cache_read_input_tokens ?? 0,
      cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
    }

    const responseText = data.content
      .filter(c => c.type === 'text')
      .map(c => c.text)
      .join('')

    return {
      id,
      mode: 'non-stream',
      iteration,
      responseTimeMs,
      ttftMs: null,
      tokens,
      costUsd: null,
      error: null,
      responseText,
    }
  } catch (err) {
    const responseTimeMs = performance.now() - startTime
    return {
      id,
      mode: 'non-stream',
      iteration,
      responseTimeMs,
      ttftMs: null,
      tokens: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
      costUsd: null,
      error: err instanceof Error ? err.message : 'Unknown error',
      responseText: '',
    }
  }
}
