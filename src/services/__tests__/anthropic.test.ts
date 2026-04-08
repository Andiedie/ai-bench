import { describe, test, expect, vi, afterEach } from 'vitest'
import { normalizeBaseUrl, sendNonStreaming } from '../anthropic'
import type { BenchmarkConfig } from '../../types/index'

const testConfig: BenchmarkConfig = {
  baseUrl: 'https://api.anthropic.com',
  apiKey: 'test-api-key',
  model: 'claude-sonnet-4-20250514',
  prompt: 'Hello',
  nonStreamIterations: 1,
  streamIterations: 1,
  concurrency: 1,
  pricingModelId: '',
  cacheTtl: '',
  cachePlacement: 'top',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('normalizeBaseUrl', () => {
  test('removes trailing slash', () => {
    expect(normalizeBaseUrl('https://api.anthropic.com/')).toBe('https://api.anthropic.com')
  })

  test('removes /v1/messages suffix', () => {
    expect(normalizeBaseUrl('https://api.anthropic.com/v1/messages')).toBe('https://api.anthropic.com')
  })

  test('removes both trailing slash and path', () => {
    expect(normalizeBaseUrl('https://api.anthropic.com/v1/messages/')).toBe('https://api.anthropic.com')
  })

  test('leaves clean URL unchanged', () => {
    expect(normalizeBaseUrl('https://api.anthropic.com')).toBe('https://api.anthropic.com')
  })
})

describe('sendNonStreaming', () => {
  test('returns BenchmarkResult with tokens on success', async () => {
    const mockResponse = {
      id: 'msg_123',
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: 'Hello there!' }],
      model: 'claude-sonnet-4-20250514',
      stop_reason: 'end_turn',
      usage: {
        input_tokens: 10,
        output_tokens: 5,
        cache_creation_input_tokens: null,
        cache_read_input_tokens: null,
      },
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(mockResponse),
    }))

    const result = await sendNonStreaming(testConfig, 'ns-1', 1)
    expect(result.mode).toBe('non-stream')
    expect(result.error).toBeNull()
    expect(result.responseTimeMs).toBeGreaterThan(0)
    expect(result.ttftMs).toBeNull()
    expect(result.tokens.inputTokens).toBe(10)
    expect(result.tokens.outputTokens).toBe(5)
    expect(result.tokens.cacheReadTokens).toBe(0)
    expect(result.tokens.cacheWriteTokens).toBe(0)
    expect(result.responseText).toBe('Hello there!')
  })

  test('returns BenchmarkResult with error on HTTP error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: () => Promise.resolve({ type: 'error', error: { type: 'authentication_error', message: 'Invalid API key' } }),
    }))

    const result = await sendNonStreaming(testConfig, 'ns-1', 1)
    expect(result.error).toBe('Invalid API key')
    expect(result.tokens.inputTokens).toBe(0)
  })

  test('handles null cache tokens as 0', async () => {
    const mockResponse = {
      content: [{ type: 'text', text: 'Hi' }],
      usage: {
        input_tokens: 5,
        output_tokens: 3,
        cache_creation_input_tokens: null,
        cache_read_input_tokens: null,
      },
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    }))

    const result = await sendNonStreaming(testConfig, 'ns-1', 1)
    expect(result.tokens.cacheReadTokens).toBe(0)
    expect(result.tokens.cacheWriteTokens).toBe(0)
  })

  test('handles fetch network error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network down')))

    const result = await sendNonStreaming(testConfig, 'ns-1', 1)
    expect(result.error).toBe('Network down')
  })

  test('includes top-level cache_control when placement is top', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        content: [{ type: 'text', text: 'Hi' }],
        usage: { input_tokens: 5, output_tokens: 3, cache_creation_input_tokens: null, cache_read_input_tokens: null },
      }),
    })
    vi.stubGlobal('fetch', mockFetch)

    await sendNonStreaming({ ...testConfig, cacheTtl: '5m', cachePlacement: 'top' }, 'ns-1', 1)

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.cache_control).toEqual({ type: 'ephemeral', ttl: '5m' })
    expect(body.messages[0].content).toBe('Hello')
  })

  test('includes block-level cache_control when placement is block', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        content: [{ type: 'text', text: 'Hi' }],
        usage: { input_tokens: 5, output_tokens: 3, cache_creation_input_tokens: null, cache_read_input_tokens: null },
      }),
    })
    vi.stubGlobal('fetch', mockFetch)

    await sendNonStreaming({ ...testConfig, cacheTtl: '5m', cachePlacement: 'block' }, 'ns-1', 1)

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body).not.toHaveProperty('cache_control')
    expect(body.messages[0].content).toEqual([
      { type: 'text', text: 'Hello', cache_control: { type: 'ephemeral', ttl: '5m' } },
    ])
  })

  test('omits cache_control when cacheTtl is empty', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        content: [{ type: 'text', text: 'Hi' }],
        usage: { input_tokens: 5, output_tokens: 3, cache_creation_input_tokens: null, cache_read_input_tokens: null },
      }),
    })
    vi.stubGlobal('fetch', mockFetch)

    await sendNonStreaming({ ...testConfig, cacheTtl: '' }, 'ns-1', 1)

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body).not.toHaveProperty('cache_control')
  })
})
