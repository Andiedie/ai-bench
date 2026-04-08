import { describe, test, expect } from 'vitest'
import { median, calculateSummary } from '../stats'
import type { BenchmarkResult } from '../../types/index'

function makeResult(overrides: Partial<BenchmarkResult> = {}): BenchmarkResult {
  return {
    id: 'ns-1',
    mode: 'non-stream',
    iteration: 1,
    responseTimeMs: 100,
    ttftMs: null,
    tokens: { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0 },
    costUsd: 0.001,
    error: null,
    responseText: 'Hello',
    ...overrides,
  }
}

describe('median', () => {
  test('returns median for odd-length array', () => {
    expect(median([3, 1, 4, 1, 5])).toBe(3)
  })

  test('returns average of two middle values for even-length array', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5)
  })

  test('returns single value for 1-element array', () => {
    expect(median([42])).toBe(42)
  })

  test('returns 0 for empty array', () => {
    expect(median([])).toBe(0)
  })
})

describe('calculateSummary', () => {
  test('computes correct summary for known results', () => {
    const results = [
      makeResult({ id: 'ns-1', responseTimeMs: 100, tokens: { inputTokens: 10, outputTokens: 5, cacheReadTokens: 0, cacheWriteTokens: 0 }, costUsd: 0.001 }),
      makeResult({ id: 'ns-2', responseTimeMs: 200, tokens: { inputTokens: 20, outputTokens: 10, cacheReadTokens: 0, cacheWriteTokens: 0 }, costUsd: 0.002 }),
      makeResult({ id: 'ns-3', responseTimeMs: 300, tokens: { inputTokens: 30, outputTokens: 15, cacheReadTokens: 0, cacheWriteTokens: 0 }, costUsd: 0.003 }),
    ]
    const summary = calculateSummary(results, 'non-stream')
    expect(summary.avgResponseMs).toBe(200)
    expect(summary.minResponseMs).toBe(100)
    expect(summary.maxResponseMs).toBe(300)
    expect(summary.medianResponseMs).toBe(200)
    expect(summary.totalTokens.inputTokens).toBe(60)
    expect(summary.totalCostUsd).toBeCloseTo(0.006)
    expect(summary.successCount).toBe(3)
    expect(summary.errorCount).toBe(0)
  })

  test('single result: min = max = avg = median', () => {
    const results = [makeResult({ responseTimeMs: 150 })]
    const summary = calculateSummary(results, 'non-stream')
    expect(summary.avgResponseMs).toBe(150)
    expect(summary.minResponseMs).toBe(150)
    expect(summary.maxResponseMs).toBe(150)
    expect(summary.medianResponseMs).toBe(150)
  })

  test('excludes errored results from timing stats', () => {
    const results = [
      makeResult({ id: 'ns-1', responseTimeMs: 100 }),
      makeResult({ id: 'ns-2', responseTimeMs: 999, error: 'Network error' }),
    ]
    const summary = calculateSummary(results, 'non-stream')
    expect(summary.successCount).toBe(1)
    expect(summary.errorCount).toBe(1)
    expect(summary.avgResponseMs).toBe(100)
  })

  test('TTFT average excludes nulls for streaming mode', () => {
  const streamResults = [
      makeResult({ id: 's-1', mode: 'stream', ttftMs: 100 }),
      makeResult({ id: 's-2', mode: 'stream', ttftMs: 200 }),
      makeResult({ id: 's-3', mode: 'stream', ttftMs: null }),
    ]
    const summary = calculateSummary(streamResults, 'stream')
    expect(summary.avgTtftMs).toBe(150)
  })

  test('non-stream mode has null avgTtftMs', () => {
    const results = [makeResult()]
    const summary = calculateSummary(results, 'non-stream')
    expect(summary.avgTtftMs).toBeNull()
  })

  test('all errors: counts correct, averages are 0', () => {
    const results = [
      makeResult({ error: 'Error 1' }),
      makeResult({ error: 'Error 2' }),
    ]
    const summary = calculateSummary(results, 'non-stream')
    expect(summary.successCount).toBe(0)
    expect(summary.errorCount).toBe(2)
    expect(summary.avgResponseMs).toBe(0)
    expect(summary.totalCostUsd).toBeNull()
  })
})
