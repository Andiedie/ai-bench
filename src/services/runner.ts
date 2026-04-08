import type { BenchmarkConfig, BenchmarkResult, OpenRouterPricing } from '../types/index'
import { sendNonStreaming } from './anthropic'
import { sendStreaming } from './stream'
import { calculateCost } from './cost'

export async function promisePool<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length)
  let nextIndex = 0

  async function runNext(): Promise<void> {
    while (nextIndex < tasks.length) {
      const index = nextIndex++
      results[index] = await tasks[index]()
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, tasks.length) },
    () => runNext(),
  )
  await Promise.all(workers)
  return results
}

export async function runBenchmark(
  config: BenchmarkConfig,
  pricing: OpenRouterPricing | null,
  onResult: (result: BenchmarkResult) => void,
): Promise<BenchmarkResult[]> {
  const allTasks: (() => Promise<BenchmarkResult>)[] = []

  for (let i = 1; i <= config.nonStreamIterations; i++) {
    const id = `ns-${i}`
    const iteration = i
    allTasks.push(async () => {
      try {
        const result = await sendNonStreaming(config, id, iteration)
        result.costUsd = calculateCost(result.tokens, pricing)
        onResult(result)
        return result
      } catch (err) {
        const errorResult: BenchmarkResult = {
          id,
          mode: 'non-stream',
          iteration,
          responseTimeMs: 0,
          ttftMs: null,
          tokens: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
          costUsd: null,
          error: err instanceof Error ? err.message : 'Unknown error',
          responseText: '',
        }
        onResult(errorResult)
        return errorResult
      }
    })
  }

  for (let i = 1; i <= config.streamIterations; i++) {
    const id = `s-${i}`
    const iteration = i
    allTasks.push(async () => {
      try {
        const result = await sendStreaming(config, id, iteration)
        result.costUsd = calculateCost(result.tokens, pricing)
        onResult(result)
        return result
      } catch (err) {
        const errorResult: BenchmarkResult = {
          id,
          mode: 'stream',
          iteration,
          responseTimeMs: 0,
          ttftMs: null,
          tokens: { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 },
          costUsd: null,
          error: err instanceof Error ? err.message : 'Unknown error',
          responseText: '',
        }
        onResult(errorResult)
        return errorResult
      }
    })
  }

  return promisePool(allTasks, config.concurrency)
}
