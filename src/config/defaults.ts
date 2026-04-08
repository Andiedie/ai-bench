import type { BenchmarkConfig } from '../types/index'
export const CONFIG_STORAGE_KEY = 'api-bench-config'
export const DEFAULT_CONFIG: BenchmarkConfig = {
  baseUrl: 'https://api.anthropic.com',
  apiKey: '',
  model: 'claude-sonnet-4-20250514',
  prompt: 'Say hello in one sentence.',
  maxTokens: 256,
  iterations: 3,
  concurrency: 1,
}
