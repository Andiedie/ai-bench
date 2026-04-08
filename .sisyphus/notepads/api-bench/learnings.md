## Task 1 scaffold notes

- Vite scaffold can be created safely via a temp directory, then copied into the repo root; this avoids interactive `create vite` prompts.
- Tailwind CSS v4 works with `@tailwindcss/vite` plus a single CSS import: `@import "tailwindcss";`.
- Vitest integration is simplest with `defineConfig` imported from `vitest/config`, `jsdom` environment, and a small `src/test-setup.ts` that imports `@testing-library/jest-dom`.
- The default Vite starter files (`src/assets`, `src/App.css`, sample logos) should be removed early to keep the scaffold minimal.
- Build output confirmed `dist/index.html` is generated and the smoke test passes with one test file.

- Created src/types/index.ts as a pure type-only module with 8 exported interfaces and JSDoc retained for public API clarity.
- Verified `npx tsc --noEmit` passes and export count matches the required type surface.
- Anthropic cache usage fields remain nullable/undefined in raw API types; parsed pricing stays `number | null`.

## Task 3 hook notes

- `useLocalStorage` can use a lazy `useState` initializer to read from `window.localStorage` once on mount; this keeps the hook simple and testable.
- jsdom localStorage is shared in-memory across tests, so `localStorage.clear()` in `beforeEach` is required for isolation.
- The config defaults module can safely import `BenchmarkConfig` directly now that `src/types/index.ts` exists.
- Verified `npx vitest run src/hooks` passes with 4 tests and saved the output to `.sisyphus/evidence/task-3-hook-tests.txt`.

## Task 4 OpenRouter service notes

- OpenRouter API returns pricing as string values (e.g. `"0.00003"`); `-1` means unknown pricing and must be converted to `null` (or fallback `0` for required `prompt`/`completion` fields).
- `vi.stubGlobal('fetch', ...)` + `vi.unstubAllGlobals()` is the clean way to mock global `fetch` in vitest without extra libraries.
- `findModelPricing` uses a 3-step matching strategy: exact → `anthropic/` prefix → any-provider suffix. This handles the common case where users provide bare model names like `claude-sonnet-4-20250514`.
- All 9 tests pass (4 parsePricing, 3 findModelPricing, 2 fetchModels). Evidence saved to `.sisyphus/evidence/task-4-openrouter-tests.txt`.

## Task 5 anthropic service notes

- `normalizeBaseUrl` strips trailing `/v1/messages` and trailing slashes to allow flexible baseUrl input.
- `sendNonStreaming` uses native `fetch` with `performance.now()` timing; responseTimeMs includes network + JSON parse.
- Cache tokens from Anthropic can be `null` or `undefined`; nullish coalescing (`?? 0`) handles both cases cleanly.
- `ttftMs` is always `null` for non-streaming; `costUsd` is `null` here, filled by runner later.
- All 8 tests pass (4 normalizeBaseUrl + 4 sendNonStreaming) using `vi.stubGlobal('fetch', ...)` for mocking.

## Task 8 cost service notes

- Cost calculation should keep basic arithmetic inline: prompt/completion always multiply token counts, while cache prices fall back to `0` with `?? 0`.
- Formatting should preserve `null` as `N/A`, show exact zero as `$0.0000`, and use scientific notation for tiny non-zero values below `$0.0001`.
- Vitest coverage for this task includes both pricing math and display formatting; the target run is `npx vitest run src/services/__tests__/cost`.
- Task 7 stats: summary calculations should ignore errored results, and stream TTFT should average only non-null values.
- totalCostUsd must become null if any successful result lacks cost data.

## Task 6 stream service notes

- SSE parsing uses double-newline (`\n\n`) as event boundary; `buffer.split('\n\n')` with the last element kept as `remaining` handles partial chunks cleanly.
- `TextDecoderStream` piped from `response.body` avoids manual `TextDecoder` instantiation; jsdom doesn't have it natively but vitest/jsdom provides `ReadableStream` + `TextEncoder` which is sufficient for mocking.
- TTFT captured on first `content_block_delta` with `delta.type === 'text_delta'`; subsequent deltas only append text.
- `message_delta` carries final usage stats (input_tokens, output_tokens, cache tokens); earlier `message_start` has partial usage but `message_delta` is the canonical source.
- All 6 tests pass: 2 parseSSEChunk (complete + partial), 4 sendStreaming (full sequence, TTFT capture, null TTFT, usage extraction).

## Task 12 - App.tsx + Header.tsx Integration
- Storage key is exported as `CONFIG_STORAGE_KEY` (not `STORAGE_KEY`) from `config/defaults.ts`
- App uses default export (`export default App`) — test imports it as default
- `ResultsTable` is exported as `React.FC` const, while `ConfigPanel` and `Header` use named function exports
- `fetchModels` returns `[]` on error (never throws), but `.catch()` added for safety
- `useLocalStorage` hook returns `[T, (val: T) => void]` tuple
- `runBenchmark` returns `Promise<BenchmarkResult[]>` and also calls `onResult` callback per iteration
- `calculateSummary` always returns a summary even with 0 results (all zeros) — filter by `successCount + errorCount > 0`

## Task 13 polish notes
- `handleRun` should always use `try/finally` around `runBenchmark` so the UI cannot get stuck in a running state if the benchmark wrapper rejects unexpectedly.
- For numeric config inputs, returning early on `NaN` is safer than coercing blank input to `0`; it preserves the previous valid config value.
- The smoke test path through `<App />` remained stable after these cleanup fixes, and the full test suite still passed unchanged.
