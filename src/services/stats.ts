import type { BenchmarkResult, BenchmarkSummary, TokenUsage } from '../types/index'

export function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2
  }
  return sorted[mid]
}

export function calculateSummary(
  results: BenchmarkResult[],
  mode: 'stream' | 'non-stream'
): BenchmarkSummary {
  const modeResults = results.filter(r => r.mode === mode)
  const successful = modeResults.filter(r => r.error === null)
  const errorCount = modeResults.length - successful.length

  const responseTimes = successful.map(r => r.responseTimeMs)
  const avgResponseMs = responseTimes.length > 0
    ? responseTimes.reduce((sum, t) => sum + t, 0) / responseTimes.length
    : 0
  const minResponseMs = responseTimes.length > 0 ? Math.min(...responseTimes) : 0
  const maxResponseMs = responseTimes.length > 0 ? Math.max(...responseTimes) : 0
  const medianResponseMs = median(responseTimes)

  let avgTtftMs: number | null = null
  if (mode === 'stream') {
    const ttfts = successful.map(r => r.ttftMs).filter((t): t is number => t !== null)
    avgTtftMs = ttfts.length > 0
      ? ttfts.reduce((sum, t) => sum + t, 0) / ttfts.length
      : null
  }

  const totalTokens: TokenUsage = {
    inputTokens: successful.reduce((sum, r) => sum + r.tokens.inputTokens, 0),
    outputTokens: successful.reduce((sum, r) => sum + r.tokens.outputTokens, 0),
    cacheReadTokens: successful.reduce((sum, r) => sum + r.tokens.cacheReadTokens, 0),
    cacheWriteTokens: successful.reduce((sum, r) => sum + r.tokens.cacheWriteTokens, 0),
  }

  const costs = successful.map(r => r.costUsd)
  const totalCostUsd = costs.length > 0 && costs.every(c => c !== null)
    ? costs.reduce((sum, c) => sum + (c as number), 0)
    : null

  return {
    mode,
    avgResponseMs,
    minResponseMs,
    maxResponseMs,
    medianResponseMs,
    avgTtftMs,
    totalTokens,
    totalCostUsd,
    successCount: successful.length,
    errorCount,
  }
}
