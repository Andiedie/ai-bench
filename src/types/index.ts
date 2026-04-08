/** 用户配置的测试参数 */
export interface BenchmarkConfig {
  /** Anthropic API base URL (e.g. https://api.anthropic.com) */
  baseUrl: string
  /** Anthropic API key */
  apiKey: string
  /** Model name (e.g. claude-sonnet-4-20250514) */
  model: string
  /** Prompt text to send to the API */
  prompt: string
  /** Maximum tokens to generate */
  maxTokens: number
  /** Number of iterations for each mode (stream + non-stream) */
  iterations: number
  /** Number of concurrent requests within each mode */
  concurrency: number
}

/** Token usage breakdown for a single request */
export interface TokenUsage {
  /** Number of input tokens */
  inputTokens: number
  /** Number of output tokens */
  outputTokens: number
  /** Number of cache read tokens (0 if not applicable) */
  cacheReadTokens: number
  /** Number of cache write tokens (0 if not applicable) */
  cacheWriteTokens: number
}

/** Result of a single benchmark request */
export interface BenchmarkResult {
  /** Unique identifier for this result (e.g. "ns-1", "s-2") */
  id: string
  /** Mode: streaming or non-streaming */
  mode: 'stream' | 'non-stream'
  /** Iteration number (1-indexed) */
  iteration: number
  /** Total response time in milliseconds */
  responseTimeMs: number
  /** Time to first token in milliseconds (null for non-stream or when no content) */
  ttftMs: number | null
  /** Token usage breakdown */
  tokens: TokenUsage
  /** Cost in USD (null if pricing unavailable) */
  costUsd: number | null
  /** Error message if request failed (null on success) */
  error: string | null
  /** Response text content */
  responseText: string
}

/** Aggregated summary statistics for one mode */
export interface BenchmarkSummary {
  /** Mode this summary is for */
  mode: 'stream' | 'non-stream'
  /** Average response time in ms (successful requests only) */
  avgResponseMs: number
  /** Minimum response time in ms */
  minResponseMs: number
  /** Maximum response time in ms */
  maxResponseMs: number
  /** Median response time in ms */
  medianResponseMs: number
  /** Average TTFT in ms (streaming only, null for non-streaming) */
  avgTtftMs: number | null
  /** Aggregated token usage across all successful requests */
  totalTokens: TokenUsage
  /** Total cost in USD (null if pricing unavailable) */
  totalCostUsd: number | null
  /** Number of successful requests */
  successCount: number
  /** Number of failed requests */
  errorCount: number
}

/** A model from the OpenRouter API */
export interface OpenRouterModel {
  /** Model ID (e.g. "anthropic/claude-sonnet-4-20250514") */
  id: string
  /** Human-readable model name */
  name: string
  /** Pricing information */
  pricing: OpenRouterPricing
}

/** Parsed pricing for an OpenRouter model (all values in USD per token) */
export interface OpenRouterPricing {
  /** Price per input/prompt token */
  prompt: number
  /** Price per output/completion token */
  completion: number
  /** Price per cache read token (null if unavailable) */
  inputCacheRead: number | null
  /** Price per cache write token (null if unavailable) */
  inputCacheWrite: number | null
}

/** Raw usage object from Anthropic API response */
export interface AnthropicUsage {
  /** Number of input tokens */
  input_tokens: number
  /** Number of output tokens */
  output_tokens: number
  /** Cache write tokens (may be null or undefined) */
  cache_creation_input_tokens: number | null | undefined
  /** Cache read tokens (may be null or undefined) */
  cache_read_input_tokens: number | null | undefined
}

/** Parsed SSE line pair */
export interface SSEEvent {
  /** Event type (e.g. "message_start", "content_block_delta") */
  event: string
  /** Raw JSON data string */
  data: string
}
