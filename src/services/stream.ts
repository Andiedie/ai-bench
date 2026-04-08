import type { BenchmarkConfig, BenchmarkResult, TokenUsage, SSEEvent } from '../types/index'
import { normalizeBaseUrl } from './anthropic'

/**
 * Parses raw SSE text into SSEEvent objects.
 * SSE format: lines like "event: message_start\ndata: {...}\n\n"
 * Handles partial chunks by buffering.
 */
export function parseSSEChunk(buffer: string): { events: SSEEvent[]; remaining: string } {
  const events: SSEEvent[] = []
  // Split on double newline (event separator)
  const parts = buffer.split('\n\n')
  // Last part may be incomplete — keep as remaining
  const remaining = parts.pop() ?? ''

  for (const part of parts) {
    const lines = part.split('\n')
    let eventType = ''
    let data = ''
    for (const line of lines) {
      if (line.startsWith('event: ')) {
        eventType = line.slice(7).trim()
      } else if (line.startsWith('data: ')) {
        data = line.slice(6).trim()
      }
    }
    if (eventType && data) {
      events.push({ event: eventType, data })
    }
  }

  return { events, remaining }
}

/**
 * Sends a streaming request to Anthropic /v1/messages.
 * Reads the response body as a ReadableStream of SSE events.
 * Measures TTFT from request start to first content_block_delta event.
 * Returns a BenchmarkResult with timing, TTFT, token usage, and concatenated response text.
 */
export async function sendStreaming(
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
        ...(config.cacheTtl && config.cachePlacement === 'top' && {
          cache_control: { type: 'ephemeral', ttl: config.cacheTtl },
        }),
        messages: [{
          role: 'user',
          content: config.cacheTtl && config.cachePlacement === 'block'
            ? [{ type: 'text', text: config.prompt, cache_control: { type: 'ephemeral', ttl: config.cacheTtl } }]
            : config.prompt,
        }],
        stream: true,
      }),
    })

    if (!response.ok) {
      const responseTimeMs = performance.now() - startTime
      const json = (await response.json()) as { error?: { message?: string } }
      return {
        id,
        mode: 'stream',
        iteration,
        responseTimeMs,
        ttftMs: null,
        tokens: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
        costUsd: null,
        error: json.error?.message ?? `HTTP ${response.status}`,
        responseText: '',
      }
    }

    if (!response.body) {
      const responseTimeMs = performance.now() - startTime
      return {
        id,
        mode: 'stream',
        iteration,
        responseTimeMs,
        ttftMs: null,
        tokens: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
        costUsd: null,
        error: 'No response body',
        responseText: '',
      }
    }

    const reader = response.body.pipeThrough(new TextDecoderStream()).getReader()
    let buffer = ''
    let ttftMs: number | null = null
    let responseText = ''
    let tokens: TokenUsage = {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    }

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += value
      const { events, remaining } = parseSSEChunk(buffer)
      buffer = remaining

      for (const sseEvent of events) {
        if (sseEvent.event === 'content_block_delta' && ttftMs === null) {
          try {
            const parsed = JSON.parse(sseEvent.data) as {
              delta?: { type?: string; text?: string }
            }
            if (parsed.delta?.type === 'text_delta') {
              ttftMs = performance.now() - startTime
            }
          } catch {
            // ignore malformed events
          }
        }

        if (sseEvent.event === 'content_block_delta') {
          try {
            const parsed = JSON.parse(sseEvent.data) as {
              delta?: { type?: string; text?: string }
            }
            if (parsed.delta?.type === 'text_delta' && parsed.delta.text) {
              responseText += parsed.delta.text
            }
          } catch {
            // ignore
          }
        }

        if (sseEvent.event === 'message_delta') {
          try {
            const parsed = JSON.parse(sseEvent.data) as {
              usage?: {
                input_tokens?: number
                output_tokens?: number
                cache_creation_input_tokens?: number | null
                cache_read_input_tokens?: number | null
              }
            }
            if (parsed.usage) {
              tokens = {
                inputTokens: parsed.usage.input_tokens ?? 0,
                outputTokens: parsed.usage.output_tokens ?? 0,
                cacheReadTokens: parsed.usage.cache_read_input_tokens ?? 0,
                cacheWriteTokens: parsed.usage.cache_creation_input_tokens ?? 0,
              }
            }
          } catch {
            // ignore
          }
        }
      }
    }

    const responseTimeMs = performance.now() - startTime
    return {
      id,
      mode: 'stream',
      iteration,
      responseTimeMs,
      ttftMs,
      tokens,
      costUsd: null,
      error: null,
      responseText,
    }
  } catch (err) {
    const responseTimeMs = performance.now() - startTime
    return {
      id,
      mode: 'stream',
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
