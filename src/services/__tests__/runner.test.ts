import { describe, test, expect, vi, beforeEach } from 'vitest'
import type { BenchmarkConfig, BenchmarkResult, TokenUsage } from '../../types/index'
import { runBenchmark } from '../runner'
import { sendNonStreaming } from '../anthropic'
import { sendStreaming } from '../stream'

vi.mock('../anthropic', () => ({ sendNonStreaming: vi.fn() }))
vi.mock('../stream', () => ({ sendStreaming: vi.fn() }))
vi.mock('../cost', () => ({ calculateCost: vi.fn().mockReturnValue(0.001) }))

const mockTokens: TokenUsage = {
  inputTokens: 10,
  outputTokens: 5,
  cacheReadTokens: 0,
  cacheWriteTokens: 0,
}

function makeMockResult(overrides: Partial<BenchmarkResult> = {}): BenchmarkResult {
  return {
    id: 'test',
    mode: 'non-stream',
    iteration: 1,
    responseTimeMs: 100,
    ttftMs: null,
    tokens: mockTokens,
    costUsd: null,
    error: null,
    responseText: 'Hello',
    ...overrides,
  }
}

const testConfig: BenchmarkConfig = {
  baseUrl: 'https://api.anthropic.com',
  apiKey: 'test-key',
  model: 'claude-sonnet-4-20250514',
  prompt: 'Hello',
  nonStreamIterations: 3,
  streamIterations: 3,
  concurrency: 2,
  pricingModelId: '',
  cacheTtl: '',
  cachePlacement: 'top',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('runBenchmark', () => {
  test('result count: iterations=3 produces 6 results (3 non-stream + 3 stream)', async () => {
    vi.mocked(sendNonStreaming).mockImplementation(async (_config, id, iteration) =>
      makeMockResult({ id, mode: 'non-stream', iteration }),
    )
    vi.mocked(sendStreaming).mockImplementation(async (_config, id, iteration) =>
      makeMockResult({ id, mode: 'stream', iteration, ttftMs: 50 }),
    )

    const results = await runBenchmark(testConfig, null, () => {})
    expect(results).toHaveLength(6)
    expect(results.filter(r => r.mode === 'non-stream')).toHaveLength(3)
    expect(results.filter(r => r.mode === 'stream')).toHaveLength(3)
  })

  test('onResult callback is called once per result', async () => {
    vi.mocked(sendNonStreaming).mockImplementation(async (_config, id, iteration) =>
      makeMockResult({ id, mode: 'non-stream', iteration }),
    )
    vi.mocked(sendStreaming).mockImplementation(async (_config, id, iteration) =>
      makeMockResult({ id, mode: 'stream', iteration, ttftMs: 50 }),
    )

    const onResult = vi.fn()
    await runBenchmark(testConfig, null, onResult)

    expect(onResult).toHaveBeenCalledTimes(6)
    for (const call of onResult.mock.calls) {
      expect(call[0]).toHaveProperty('id')
      expect(call[0]).toHaveProperty('mode')
    }
  })

  test('error handling: failed request produces error result, remaining still complete', async () => {
    let nsCallCount = 0
    vi.mocked(sendNonStreaming).mockImplementation(async (_config, id, iteration) => {
      nsCallCount++
      if (nsCallCount === 2) throw new Error('API exploded')
      return makeMockResult({ id, mode: 'non-stream', iteration })
    })
    vi.mocked(sendStreaming).mockImplementation(async (_config, id, iteration) =>
      makeMockResult({ id, mode: 'stream', iteration, ttftMs: 50 }),
    )

    const results = await runBenchmark(testConfig, null, () => {})
    expect(results).toHaveLength(6)

    const errorResults = results.filter(r => r.error !== null)
    expect(errorResults).toHaveLength(1)
    expect(errorResults[0].error).toBe('API exploded')
    expect(errorResults[0].responseTimeMs).toBe(0)
    expect(errorResults[0].tokens.inputTokens).toBe(0)

    const successResults = results.filter(r => r.error === null)
    expect(successResults).toHaveLength(5)
  })

  test('concurrency limit: no more than concurrency tasks run simultaneously', async () => {
    let concurrent = 0
    let maxConcurrent = 0

    vi.mocked(sendNonStreaming).mockImplementation(async (_config, id, iteration) => {
      concurrent++
      maxConcurrent = Math.max(maxConcurrent, concurrent)
      await new Promise(r => setTimeout(r, 20))
      concurrent--
      return makeMockResult({ id, mode: 'non-stream', iteration })
    })
    vi.mocked(sendStreaming).mockImplementation(async (_config, id, iteration) => {
      concurrent++
      maxConcurrent = Math.max(maxConcurrent, concurrent)
      await new Promise(r => setTimeout(r, 20))
      concurrent--
      return makeMockResult({ id, mode: 'stream', iteration, ttftMs: 50 })
    })

    const config = { ...testConfig, nonStreamIterations: 4, streamIterations: 4, concurrency: 2 }
    await runBenchmark(config, null, () => {})

    expect(maxConcurrent).toBeLessThanOrEqual(2)
    expect(maxConcurrent).toBeGreaterThanOrEqual(1)
  })
})
