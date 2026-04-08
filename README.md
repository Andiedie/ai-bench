# API Bench

A client-side benchmarking tool for the Anthropic `/v1/messages` API. Measures latency, TTFT, token usage, and cost across streaming and non-streaming modes.

**Live:** https://andiedie.github.io/ai-bench/

## Features

- Stream & non-stream requests with independent iteration counts
- Configurable concurrency (mixed pool)
- Prompt presets (6 built-in, grouped by input/output token size)
- Prompt caching with TTL control and placement option (top-level or content block)
- Cost estimation via OpenRouter pricing data
- Summary statistics (avg / min / max / median / TTFT)
- Runs entirely in the browser — no backend required

## Tech Stack

Vite + React + TypeScript + Tailwind CSS v4

## Development

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build
npm test          # run tests
```

## License

MIT
