import { describe, test, expect, vi, afterEach } from 'vitest'
import { parseSSEChunk, sendStreaming } from '../stream'
import type { BenchmarkConfig } from '../../types/index'

const testConfig: BenchmarkConfig = {
  baseUrl: 'https://api.anthropic.com',
  apiKey: 'test-key',
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

describe('parseSSEChunk', () => {
  test('parses complete SSE events', () => {
    const input =
      'event: message_start\ndata: {"type":"message_start"}\n\nevent: message_stop\ndata: {"type":"message_stop"}\n\n'
    const { events, remaining } = parseSSEChunk(input)
    expect(events).toHaveLength(2)
    expect(events[0].event).toBe('message_start')
    expect(events[1].event).toBe('message_stop')
    expect(remaining).toBe('')
  })

  test('handles partial chunks correctly', () => {
    const partial =
      'event: message_start\ndata: {"type":"message_start"}\n\nevent: content_block_s'
    const { events, remaining } = parseSSEChunk(partial)
    expect(events).toHaveLength(1)
    expect(events[0].event).toBe('message_start')
    expect(remaining).toBe('event: content_block_s')
  })
})

function createMockStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  let idx = 0
  return new ReadableStream({
    pull(controller) {
      if (idx < chunks.length) {
        controller.enqueue(encoder.encode(chunks[idx++]))
      } else {
        controller.close()
      }
    },
  })
}

const fullSSESequence = [
  'event: message_start\ndata: {"type":"message_start","message":{"usage":{"input_tokens":10}}}\n\n',
  'event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}\n\n',
  'event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}\n\n',
  'event: content_block_stop\ndata: {"type":"content_block_stop","index":0}\n\n',
  'event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"input_tokens":10,"output_tokens":5,"cache_creation_input_tokens":null,"cache_read_input_tokens":null}}\n\n',
  'event: message_stop\ndata: {"type":"message_stop"}\n\n',
]

describe('sendStreaming', () => {
  test('returns correct BenchmarkResult from full SSE sequence', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        body: createMockStream(fullSSESequence),
      })
    )

    const result = await sendStreaming(testConfig, 's-1', 1)
    expect(result.mode).toBe('stream')
    expect(result.error).toBeNull()
    expect(result.responseText).toBe('Hello')
    expect(result.tokens.inputTokens).toBe(10)
    expect(result.tokens.outputTokens).toBe(5)
  })

  test('captures TTFT at first content_block_delta', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        body: createMockStream(fullSSESequence),
      })
    )

    const result = await sendStreaming(testConfig, 's-1', 1)
    expect(result.ttftMs).not.toBeNull()
    expect(result.ttftMs!).toBeGreaterThan(0)
  })

  test('returns null TTFT when no content_block_delta', async () => {
    const emptySequence = [
      'event: message_start\ndata: {"type":"message_start"}\n\n',
      'event: message_delta\ndata: {"type":"message_delta","usage":{"input_tokens":5,"output_tokens":0}}\n\n',
      'event: message_stop\ndata: {"type":"message_stop"}\n\n',
    ]
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        body: createMockStream(emptySequence),
      })
    )

    const result = await sendStreaming(testConfig, 's-1', 1)
    expect(result.ttftMs).toBeNull()
  })

  test('extracts usage from message_delta event', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        body: createMockStream(fullSSESequence),
      })
    )

    const result = await sendStreaming(testConfig, 's-1', 1)
    expect(result.tokens.inputTokens).toBe(10)
    expect(result.tokens.outputTokens).toBe(5)
    expect(result.tokens.cacheReadTokens).toBe(0)
    expect(result.tokens.cacheWriteTokens).toBe(0)
  })

  test('includes top-level cache_control when placement is top', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      body: createMockStream(fullSSESequence),
    })
    vi.stubGlobal('fetch', mockFetch)

    await sendStreaming({ ...testConfig, cacheTtl: '1h', cachePlacement: 'top' }, 's-1', 1)

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body.cache_control).toEqual({ type: 'ephemeral', ttl: '1h' })
    expect(body.messages[0].content).toBe('Hello')
  })

  test('includes block-level cache_control when placement is block', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      body: createMockStream(fullSSESequence),
    })
    vi.stubGlobal('fetch', mockFetch)

    await sendStreaming({ ...testConfig, cacheTtl: '1h', cachePlacement: 'block' }, 's-1', 1)

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body).not.toHaveProperty('cache_control')
    expect(body.messages[0].content).toEqual([
      { type: 'text', text: 'Hello', cache_control: { type: 'ephemeral', ttl: '1h' } },
    ])
  })

  test('omits cache_control when cacheTtl is empty', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      body: createMockStream(fullSSESequence),
    })
    vi.stubGlobal('fetch', mockFetch)

    await sendStreaming({ ...testConfig, cacheTtl: '' }, 's-1', 1)

    const body = JSON.parse(mockFetch.mock.calls[0][1].body)
    expect(body).not.toHaveProperty('cache_control')
  })
})
