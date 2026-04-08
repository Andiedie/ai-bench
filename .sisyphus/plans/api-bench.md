# Anthropic API Benchmark Tool

## TL;DR

> **Quick Summary**: 纯前端 Anthropic /v1/messages API 性能基准测试工具。用户输入 base URL + API key + 模型名 + prompt，执行流式/非流式各 N 次测试，展示响应时间、首 token 时延、token 用量，并通过 OpenRouter 价格计算费用。
>
> **Deliverables**:
> - Vite + React + TypeScript + Tailwind CSS v4 单页应用
> - 可配置的测试面板（base url, api key, model, prompt, max_tokens, iterations, concurrency）
> - 流式 + 非流式双模式性能测试引擎
> - 结果表格：每次请求详情 + 汇总统计
> - 基于 OpenRouter 定价的费用计算
> - 全部配置 LocalStorage 持久化
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Scaffold → Types → API Client → SSE Parser → Benchmark Runner → UI → Integration

---

## Context

### Original Request
构建一个 Anthropic /v1/messages 端点性能测试工具：
- 支持流式和非流式一起测试
- 支持设置测试次数和并发数
- 统计总体响应时间、首 token 时延
- 统计 token 用量（input, output, cache read, cache write）
- 纯前端，在浏览器打开即可使用
- 配置存储到 LocalStorage
- 从 OpenRouter 获取模型列表及价格，计算测试费用

### Interview Summary
**Key Discussions**:
- **Tech Stack**: React + Vite + TypeScript + Tailwind CSS v4
- **测试模式**: 流式和非流式各跑 N 次（设 5 = 共 10 次请求）
- **并发**: 可配置并发数
- **Prompt**: 用户可自定义内容
- **展示**: 纯表格数字，不需要图表和导出
- **Token 用量**: input, output, cache_read, cache_write 四种
- **费用**: 基于 OpenRouter API 价格自动计算

**Research Findings**:
- Anthropic API 需要 `anthropic-dangerous-direct-browser-access: true` header 才能从浏览器直接调用
- SSE 流式事件顺序：message_start → content_block_start → content_block_delta → content_block_stop → message_delta → message_stop
- TTFT = 请求发送到第一个 `content_block_delta` 事件的时间差
- 流式 usage 在 `message_delta` 事件中获取
- OpenRouter `GET /api/v1/models` 无需认证，支持 CORS，价格字段为字符串格式（USD/token）
- 价格字段：`pricing.prompt`, `pricing.completion`, `pricing.input_cache_read`, `pricing.input_cache_write`
- OpenRouter 模型 ID 格式为 `provider/model-name`，匹配时需处理前缀

### Metis Review
**Identified Gaps** (addressed):
- **CORS Header**: 需要 `anthropic-dangerous-direct-browser-access: true` header → 已加入必选 header
- **执行顺序**: 流式和非流式的执行顺序需明确 → 决定：先跑所有非流式，再跑所有流式，并发在模式内部生效
- **失败处理**: 请求失败不中断后续测试，记录错误，从汇总统计中排除
- **Base URL 归一化**: 去除尾部斜杠，应用内部拼接 `/v1/messages`
- **OpenRouter `-1` 价格**: 视为未知，费用显示 N/A
- **Cache token null 值**: null 视为 0
- **模型匹配**: 在 OpenRouter 列表中用 `{provider}/{model}` 格式查找，支持多 provider 前缀匹配
- **空响应 TTFT**: 无 `content_block_delta` 事件时 TTFT 显示 "—"

---

## Work Objectives

### Core Objective
构建一个零依赖后端的浏览器 SPA，用于对 Anthropic /v1/messages API 进行流式与非流式性能基准测试，统计延迟、token 用量和费用。

### Concrete Deliverables
- `src/` 下约 15 个源文件的完整 React + TypeScript 应用
- 可直接 `npm run dev` 启动的开发环境
- `npm run build` 可生成生产构建

### Definition of Done
- [ ] `npm run build` 零错误零警告
- [ ] `npx vitest run` 所有测试通过
- [ ] 开发服务器启动后页面可正常加载
- [ ] 配置填写后刷新页面仍保留
- [ ] 点击 Run 后能成功发送请求并展示结果表格

### Must Have
- 7 个配置字段全部支持 LocalStorage 持久化
- 流式 + 非流式双模式测试
- 每次请求显示：模式、序号、响应时间、TTFT、4 种 token 用量、费用
- 汇总显示：平均/最小/最大响应时间、总 token、总费用
- OpenRouter 模型列表作为模型选择数据源
- 基于 OpenRouter 价格的费用计算

### Must NOT Have (Guardrails)
- ❌ 图表（Chart.js 等）
- ❌ 结果导出（JSON/CSV）
- ❌ 后端服务
- ❌ 路由系统（React Router）
- ❌ 状态管理库（Redux/Zustand）
- ❌ 组件库（shadcn/MUI/Ant Design）
- ❌ 测试中止/取消功能
- ❌ 结果持久化到 localStorage
- ❌ 请求重试逻辑
- ❌ 暗/亮主题切换（仅暗色主题）
- ❌ 多模型对比测试
- ❌ 超过 15 个源文件

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO (新项目)
- **Automated tests**: YES (TDD for pure logic, tests-after for UI components)
- **Framework**: vitest + @testing-library/react + jsdom
- **Strategy**: Pure logic (SSE parser, cost calc, stats, model matcher) TDD; UI components only测试关键交互

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Frontend/UI**: Use Playwright — Navigate, interact, assert DOM, screenshot
- **Library/Module**: Use Bash (vitest) — Run unit tests, compare output
- **Build**: Use Bash — `npm run build`, verify exit code 0

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Foundation — can all start immediately):
├── Task 1: Vite + React + TS + Tailwind v4 + Vitest scaffold [quick]
├── Task 2: TypeScript type definitions [quick]
└── Task 3: useLocalStorage hook + config defaults [quick]

Wave 2 (Core Logic — after Wave 1, MAX PARALLEL):
├── Task 4: OpenRouter service — fetch models, parse pricing, model match (depends: 2) [deep]
├── Task 5: Anthropic non-streaming client + timing (depends: 2) [deep]
├── Task 6: SSE stream parser + TTFT measurement (depends: 2) [deep]
├── Task 7: Stats calculator — avg/min/max/median (depends: 2) [quick]
└── Task 8: Cost calculator — per-request cost (depends: 2) [quick]

Wave 3 (Orchestration + UI — after Wave 2):
├── Task 9:  Benchmark runner — iterations, concurrency, both modes (depends: 5, 6, 7, 8) [deep]
├── Task 10: Config UI panel — form, model picker, localStorage bind (depends: 3, 4) [visual-engineering]
└── Task 11: Results table UI — per-request rows, summary stats (depends: 2) [visual-engineering]

Wave 4 (Integration + Polish — after Wave 3):
├── Task 12: App integration — wire all together (depends: 9, 10, 11) [unspecified-high]
└── Task 13: Polish — error states, edge cases, final cleanup (depends: 12) [quick]

Wave FINAL (After ALL tasks — 4 parallel reviews, then user okay):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA (unspecified-high)
└── Task F4: Scope fidelity check (deep)
-> Present results -> Get explicit user okay

Critical Path: T1 → T2 → T5/T6 → T9 → T12 → T13 → F1-F4 → user okay
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 5 (Wave 2)
```

### Dependency Matrix

| Task | Blocked By | Blocks |
|------|-----------|--------|
| T1 | — | T2, T3 |
| T2 | T1 | T4, T5, T6, T7, T8, T11 |
| T3 | T1 | T10 |
| T4 | T2 | T10 |
| T5 | T2 | T9 |
| T6 | T2 | T9 |
| T7 | T2 | T9 |
| T8 | T2 | T9 |
| T9 | T5, T6, T7, T8 | T12 |
| T10 | T3, T4 | T12 |
| T11 | T2 | T12 |
| T12 | T9, T10, T11 | T13 |
| T13 | T12 | F1-F4 |

### Agent Dispatch Summary

- **Wave 1**: **3** — T1 → `quick` + `ui-ux-pro-max`, T2 → `quick`, T3 → `quick`
- **Wave 2**: **5** — T4 → `deep`, T5 → `deep`, T6 → `deep`, T7 → `quick`, T8 → `quick`
- **Wave 3**: **3** — T9 → `deep`, T10 → `visual-engineering` + `ui-ux-pro-max`, T11 → `visual-engineering` + `ui-ux-pro-max`
- **Wave 4**: **2** — T12 → `unspecified-high`, T13 → `quick`
- **FINAL**: **4** — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. Project Scaffold — Vite + React + TS + Tailwind v4 + Vitest

  **What to do**:
  - Scaffold Vite project in a temp directory then copy into the project root (because the root already contains `.opencode/` and `.sisyphus/` which makes `create vite` interactive):
    1. Run `npm create vite@latest tmp-scaffold -- --template react-ts` in the project root
    2. Copy all files from `tmp-scaffold/` into the project root: `cp -r tmp-scaffold/* tmp-scaffold/.gitignore . && rm -rf tmp-scaffold`
    3. This avoids Vite's interactive overwrite prompt on a non-empty directory
  - Run `npm install`
  - Install Tailwind CSS v4: `npm install -D tailwindcss @tailwindcss/vite` and add the Vite plugin to `vite.config.ts`
  - Replace the default CSS with `@import "tailwindcss";` in `src/index.css`
  - Install vitest + testing-library: `npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom`
  - Add vitest config to `vite.config.ts` (test environment: jsdom)
  - Add `"test": "vitest run"` to package.json scripts
  - Create a trivial smoke test `src/App.test.tsx` that verifies App renders
  - Clean up Vite boilerplate: remove default counter logic, logos, etc.
  - Set up dark theme base in `index.html`: `<body class="bg-gray-950 text-gray-100 min-h-screen">`
  - Verify `npm run build` succeeds and `npx vitest run` passes

  **Must NOT do**:
  - Install React Router, any state management lib, any component library
  - Add chart libraries

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`ui-ux-pro-max`]
    - `ui-ux-pro-max`: Run `python3 .opencode/skills/ui-ux-pro-max/scripts/search.py "developer tool dark dashboard benchmark api testing" --design-system --persist -p "API Benchmark"` to generate `design-system/MASTER.md`. This provides color palette, typography, and styling rules for ALL subsequent UI tasks. Also run `--stack react` for React-specific patterns.

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Tasks 2, 3
  - **Blocked By**: None

  **References**:
  **External References**:
  - Tailwind v4 Vite setup: use `@tailwindcss/vite` plugin, CSS entry is `@import "tailwindcss"` — no `tailwind.config.ts` needed
  - Vitest with React: configure `test: { environment: 'jsdom', globals: true }` in vite.config.ts

  **Acceptance Criteria**:
  - [ ] `npm run build` exits with code 0
  - [ ] `npx vitest run` passes (1 smoke test)
  - [ ] `npm run dev` starts server at localhost:5173
  - [ ] Page loads with dark background (bg-gray-950)

  **QA Scenarios**:
  ```
  Scenario: Build succeeds
    Tool: Bash
    Preconditions: All dependencies installed (npm install)
    Steps:
      1. Run `npm run build`
      2. Check exit code is 0
      3. Verify `dist/` directory exists with `dist/index.html`
    Expected Result: Build exits 0, dist/index.html exists
    Failure Indicators: Non-zero exit code, missing dist directory
    Evidence: .sisyphus/evidence/task-1-build.txt

  Scenario: Tests pass
    Tool: Bash
    Preconditions: Dependencies installed
    Steps:
      1. Run `npx vitest run`
      2. Check output shows "1 passed"
    Expected Result: All tests pass
    Failure Indicators: Any test failure or error
    Evidence: .sisyphus/evidence/task-1-tests.txt

  Scenario: Dev server starts and page loads
    Tool: Playwright
    Preconditions: `npm run dev` running
    Steps:
      1. Navigate to http://localhost:5173
      2. Wait for page load (timeout: 10s)
      3. Assert `document.body` has class containing "bg-gray-950"
      4. Take screenshot
    Expected Result: Page loads, dark background visible
    Failure Indicators: Connection refused, missing dark theme class
    Evidence: .sisyphus/evidence/task-1-page-load.png
  ```

  **Commit**: YES
  - Message: `chore: scaffold vite + react + ts + tailwind + vitest`
  - Files: entire project scaffold
  - Pre-commit: `npm run build && npx vitest run`

- [x] 2. TypeScript Type Definitions

  **What to do**:
  - Create `src/types/index.ts` with all shared types:
    - `BenchmarkConfig`: { baseUrl, apiKey, model, prompt, maxTokens, iterations, concurrency }
    - `TokenUsage`: { inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens }
    - `BenchmarkResult`: { id, mode('stream'|'non-stream'), iteration, responseTimeMs, ttftMs(number|null), tokens: TokenUsage, costUsd(number|null), error(string|null), responseText(string) }
    - `BenchmarkSummary`: { mode, avgResponseMs, minResponseMs, maxResponseMs, medianResponseMs, avgTtftMs(number|null), totalTokens: TokenUsage, totalCostUsd(number|null), successCount, errorCount }
    - `OpenRouterModel`: { id, name, pricing: OpenRouterPricing }
    - `OpenRouterPricing`: { prompt, completion, inputCacheRead(number|null), inputCacheWrite(number|null) } — parsed to numbers
    - `AnthropicUsage`: { input_tokens, output_tokens, cache_creation_input_tokens(number|null), cache_read_input_tokens(number|null) } — raw API shape
    - `SSEEvent`: { event: string, data: string } — parsed SSE line pair
  - Ensure all types are exported and have JSDoc comments explaining each field

  **Must NOT do**:
  - Import any runtime dependencies — this file is pure types
  - Use `any` type

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Tasks 4, 5, 6, 7, 8, 11
  - **Blocked By**: Task 1 (needs project scaffold to exist)

  **References**:
  **API/Type References**:
  - Anthropic usage object fields: `input_tokens`, `output_tokens`, `cache_creation_input_tokens`, `cache_read_input_tokens` (all integers, cache fields can be null/0)
  - OpenRouter pricing fields: `pricing.prompt`, `pricing.completion`, `pricing.input_cache_read`, `pricing.input_cache_write` (strings in USD/token, may be undefined or "-1")
  - SSE event types: `message_start`, `content_block_start`, `content_block_delta`, `content_block_stop`, `message_delta`, `message_stop`

  **Acceptance Criteria**:
  - [ ] `npx tsc --noEmit` passes with zero errors
  - [ ] All types exported from `src/types/index.ts`
  - [ ] No `any` type used

  **QA Scenarios**:
  ```
  Scenario: Type check passes
    Tool: Bash
    Preconditions: Project scaffolded
    Steps:
      1. Run `npx tsc --noEmit`
      2. Check exit code is 0
    Expected Result: Zero type errors
    Failure Indicators: Non-zero exit code, type errors in output
    Evidence: .sisyphus/evidence/task-2-typecheck.txt

  Scenario: All types are exported
    Tool: Bash
    Preconditions: types/index.ts exists
    Steps:
      1. Run `grep "export" src/types/index.ts`
      2. Verify output includes: BenchmarkConfig, TokenUsage, BenchmarkResult, BenchmarkSummary, OpenRouterModel, OpenRouterPricing, AnthropicUsage, SSEEvent
    Expected Result: All 8 types found in exports
    Failure Indicators: Any type missing from exports
    Evidence: .sisyphus/evidence/task-2-exports.txt
  ```

  **Commit**: YES (groups with Task 3)
  - Message: `feat(core): add type definitions and useLocalStorage hook`
  - Files: `src/types/index.ts`
  - Pre-commit: `npx tsc --noEmit`

- [x] 3. useLocalStorage Hook + Config Defaults

  **What to do**:
  - Create `src/hooks/useLocalStorage.ts`:
    - Generic hook `useLocalStorage<T>(key: string, defaultValue: T): [T, (val: T) => void]`
    - Read from localStorage on mount, parse JSON, fallback to default
    - Write to localStorage on every update (JSON.stringify)
    - Handle parse errors gracefully (return default)
  - Create `src/config/defaults.ts`:
    - Default BenchmarkConfig: `{ baseUrl: "https://api.anthropic.com", apiKey: "", model: "claude-sonnet-4-20250514", prompt: "Say hello in one sentence.", maxTokens: 256, iterations: 3, concurrency: 1 }`
    - LocalStorage key constant: `"api-bench-config"`
  - Write TDD tests `src/hooks/__tests__/useLocalStorage.test.ts`:
    - Test: returns default when localStorage is empty
    - Test: reads existing value from localStorage
    - Test: writes updates to localStorage
    - Test: handles corrupted JSON gracefully (returns default)

  **Must NOT do**:
  - Use any external state management library
  - Persist anything other than config (no results persistence)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Task 10
  - **Blocked By**: Task 1 (needs project scaffold)

  **References**:
  **Pattern References**:
  - Standard React useLocalStorage pattern: `useState` + `useEffect` for sync, or lazy initializer in `useState`

  **Acceptance Criteria**:
  - [ ] `npx vitest run src/hooks` — all tests pass
  - [ ] Hook correctly reads/writes localStorage in tests
  - [ ] Corrupted JSON test passes (graceful fallback)

  **QA Scenarios**:
  ```
  Scenario: Hook tests pass
    Tool: Bash
    Preconditions: Project scaffolded, vitest configured
    Steps:
      1. Run `npx vitest run src/hooks`
      2. Check all tests pass (4 tests minimum)
    Expected Result: 4+ tests pass, 0 failures
    Failure Indicators: Any test failure
    Evidence: .sisyphus/evidence/task-3-hook-tests.txt

  Scenario: Default config values are correct
    Tool: Bash
    Preconditions: defaults.ts exists
    Steps:
      1. Run `grep -c "api.anthropic.com" src/config/defaults.ts`
      2. Run `grep -c "api-bench-config" src/config/defaults.ts`
    Expected Result: Both grep return 1 (found)
    Failure Indicators: Either not found
    Evidence: .sisyphus/evidence/task-3-defaults.txt
  ```

  **Commit**: YES (groups with Task 2)
  - Message: `feat(core): add type definitions and useLocalStorage hook`
  - Files: `src/hooks/useLocalStorage.ts`, `src/config/defaults.ts`, tests
  - Pre-commit: `npx vitest run`

- [x] 4. OpenRouter Service — Fetch Models, Parse Pricing, Model Match

  **What to do**:
  - Create `src/services/openrouter.ts`:
    - `fetchModels(): Promise<OpenRouterModel[]>` — GET `https://openrouter.ai/api/v1/models`, parse response
    - `parsePricing(raw: any): OpenRouterPricing` — parse string prices to numbers, handle `undefined`, `"-1"`, `"0"`
    - `findModelPricing(models: OpenRouterModel[], userModel: string): OpenRouterPricing | null` — match user's model name against OpenRouter model IDs. Strategy: try `anthropic/${userModel}` first, then try direct match, then try substring match. Return null if not found.
  - Write TDD tests `src/services/__tests__/openrouter.test.ts`:
    - Test `parsePricing`: normal values ("0.00003" → 0.00003), "-1" → null, undefined → null, "0" → 0
    - Test `findModelPricing`: exact match with prefix, direct match, not found → null
    - Test `fetchModels` with mocked fetch: valid response → parsed models, network error → empty array

  **Must NOT do**:
  - Use axios or any HTTP library — plain `fetch` only
  - Cache in localStorage — memory only

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []
    - Reason: Involves API integration, data parsing with edge cases, and TDD

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6, 7, 8)
  - **Blocks**: Task 10
  - **Blocked By**: Task 2

  **References**:
  **API/Type References**:
  - OpenRouter endpoint: `GET https://openrouter.ai/api/v1/models` — no auth, CORS enabled
  - Response shape: `{ data: [{ id: "anthropic/claude-sonnet-4-20250514", name: "...", pricing: { prompt: "0.00003", completion: "0.00015", input_cache_read: "0.000003", input_cache_write: "0.0000375" } }] }`
  - Pricing values are **strings** in USD/token, may be `undefined` or `"-1"` (unknown)
  - `src/types/index.ts:OpenRouterModel` and `src/types/index.ts:OpenRouterPricing` — types to use

  **Acceptance Criteria**:
  - [ ] `npx vitest run src/services/__tests__/openrouter` — all tests pass
  - [ ] `parsePricing("-1")` returns null for that field
  - [ ] `parsePricing(undefined)` returns null for that field
  - [ ] `findModelPricing(models, "claude-sonnet-4-20250514")` matches `anthropic/claude-sonnet-4-20250514`

  **QA Scenarios**:
  ```
  Scenario: Pricing parser handles all edge cases
    Tool: Bash (vitest)
    Preconditions: Tests written with mock data
    Steps:
      1. Run `npx vitest run src/services/__tests__/openrouter`
      2. Verify parsePricing tests cover: normal string, "-1", undefined, "0"
      3. Verify findModelPricing tests cover: prefix match, direct match, not found
    Expected Result: All tests pass, 6+ test cases
    Failure Indicators: Any test failure
    Evidence: .sisyphus/evidence/task-4-openrouter-tests.txt

  Scenario: Real OpenRouter API returns valid data
    Tool: Bash (curl)
    Preconditions: Internet access
    Steps:
      1. Run `curl -s https://openrouter.ai/api/v1/models | head -c 500`
      2. Verify response contains "data" array
      3. Verify at least one entry has "pricing" object
    Expected Result: Valid JSON with data array containing models with pricing
    Failure Indicators: Network error, empty response, missing pricing
    Evidence: .sisyphus/evidence/task-4-openrouter-curl.txt
  ```

  **Commit**: YES
  - Message: `feat(openrouter): add model list service with pricing parser`
  - Files: `src/services/openrouter.ts`, tests
  - Pre-commit: `npx vitest run`

- [x] 5. Anthropic Non-Streaming Client + Timing

  **What to do**:
  - Create `src/services/anthropic.ts`:
    - `sendNonStreaming(config: BenchmarkConfig): Promise<BenchmarkResult>` — sends POST to `{baseUrl}/v1/messages` with:
      - Headers: `Content-Type: application/json`, `x-api-key: {apiKey}`, `anthropic-version: 2023-06-01`, `anthropic-dangerous-direct-browser-access: true`
      - Body: `{ model, messages: [{ role: "user", content: prompt }], max_tokens: maxTokens, stream: false }`
    - Timing: `performance.now()` before fetch, after `await response.json()`
    - Parse usage: extract `input_tokens`, `output_tokens`, `cache_creation_input_tokens` (null → 0), `cache_read_input_tokens` (null → 0)
    - Parse errors: if response not ok, parse error body `{ type: "error", error: { type, message } }`
    - Return `BenchmarkResult` with all fields populated
    - Helper: `normalizeBaseUrl(url: string): string` — strip trailing slash, remove `/v1/messages` if user accidentally included it
  - Write TDD tests `src/services/__tests__/anthropic.test.ts`:
    - Test `normalizeBaseUrl`: various inputs → clean base URL
    - Test success response parsing: mock fetch → correct BenchmarkResult with timing and usage
    - Test error response parsing: mock 401/429 → BenchmarkResult with error string
    - Test null cache tokens: null → 0 in TokenUsage

  **Must NOT do**:
  - Use axios or any HTTP client library
  - Add retry logic
  - Add abort/cancel support

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []
    - Reason: API client with timing measurement, error handling, and TDD

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 6, 7, 8)
  - **Blocks**: Task 9
  - **Blocked By**: Task 2

  **References**:
  **API/Type References**:
  - Anthropic headers: `Content-Type: application/json`, `x-api-key`, `anthropic-version: 2023-06-01`, `anthropic-dangerous-direct-browser-access: true`
  - Request body: `{ model: string, messages: [{role: "user", content: string}], max_tokens: number, stream: false }`
  - Response body: `{ id, type: "message", role: "assistant", content: [{type: "text", text: string}], model, stop_reason, usage: { input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens } }`
  - Error body: `{ type: "error", error: { type: string, message: string } }`
  - `src/types/index.ts:BenchmarkResult`, `src/types/index.ts:BenchmarkConfig`, `src/types/index.ts:AnthropicUsage`

  **Acceptance Criteria**:
  - [ ] `npx vitest run src/services/__tests__/anthropic` — all tests pass
  - [ ] normalizeBaseUrl removes trailing slashes and paths correctly
  - [ ] Successful response → BenchmarkResult with responseTimeMs > 0 and valid TokenUsage
  - [ ] Error response → BenchmarkResult with error string set

  **QA Scenarios**:
  ```
  Scenario: Non-streaming client tests pass
    Tool: Bash (vitest)
    Preconditions: Tests written with mocked fetch
    Steps:
      1. Run `npx vitest run src/services/__tests__/anthropic`
      2. Verify all tests pass
    Expected Result: 4+ tests pass
    Failure Indicators: Any test failure
    Evidence: .sisyphus/evidence/task-5-anthropic-tests.txt

  Scenario: URL normalization handles edge cases
    Tool: Bash (vitest)
    Preconditions: normalizeBaseUrl tests exist
    Steps:
      1. Verify tests cover: trailing slash, path included, no trailing slash, empty path
    Expected Result: All normalizeBaseUrl tests pass
    Failure Indicators: Any URL normalization test fails
    Evidence: .sisyphus/evidence/task-5-url-normalize.txt
  ```

  **Commit**: YES
  - Message: `feat(api): add anthropic non-streaming client with timing`
  - Files: `src/services/anthropic.ts`, tests
  - Pre-commit: `npx vitest run`

- [x] 6. SSE Stream Parser + TTFT Measurement

  **What to do**:
  - Create `src/services/stream.ts`:
    - `sendStreaming(config: BenchmarkConfig): Promise<BenchmarkResult>` — sends POST with `stream: true`, same headers as non-streaming
    - SSE parsing via `ReadableStream` (NOT EventSource — doesn't support POST/custom headers):
      1. Get `response.body` as ReadableStream
      2. Pipe through `TextDecoderStream`
      3. Buffer partial lines, split on `\n\n` to get complete events
      4. Parse each event: extract `event:` line and `data:` line → `SSEEvent`
    - TTFT measurement: record `performance.now()` when first `content_block_delta` event arrives (with `delta.type === "text_delta"`)
    - Total response time: from request start to `message_stop` event
    - Usage extraction: from `message_delta` event's `usage` object
    - Response text: concatenate all `content_block_delta.delta.text` values
    - Edge case: if no `content_block_delta` arrives (empty/refusal), TTFT = null
  - Write TDD tests `src/services/__tests__/stream.test.ts`:
    - Test SSE line parser: raw text → parsed SSEEvent objects
    - Test event sequence: mock stream of known events → correct BenchmarkResult
    - Test TTFT: mock stream with known timing → TTFT captured at first content_block_delta
    - Test empty response: no content_block_delta → TTFT null
    - Test usage extraction: message_delta event → correct TokenUsage

  **Must NOT do**:
  - Use EventSource (doesn't support POST requests or custom headers)
  - Use any SSE parsing library
  - Add reconnection logic

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []
    - Reason: Complex SSE parsing with timing, the most technically challenging task

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5, 7, 8)
  - **Blocks**: Task 9
  - **Blocked By**: Task 2

  **References**:
  **API/Type References**:
  - Streaming SSE events in order:
    1. `message_start`: `{ type: "message_start", message: { id, usage: { input_tokens } } }`
    2. `content_block_start`: `{ type: "content_block_start", index: 0, content_block: { type: "text", text: "" } }`
    3. `content_block_delta`: `{ type: "content_block_delta", index: 0, delta: { type: "text_delta", text: "Hello" } }` ← **TTFT here**
    4. `content_block_stop`: `{ type: "content_block_stop", index: 0 }`
    5. `message_delta`: `{ type: "message_delta", delta: { stop_reason: "end_turn" }, usage: { input_tokens, output_tokens, cache_creation_input_tokens, cache_read_input_tokens } }` ← **Usage here**
    6. `message_stop`: `{ type: "message_stop" }`
  - SSE format: lines like `event: message_start\ndata: {"type":"message_start",...}\n\n`
  - `src/types/index.ts:SSEEvent`, `src/types/index.ts:BenchmarkResult`

  **Acceptance Criteria**:
  - [ ] `npx vitest run src/services/__tests__/stream` — all tests pass
  - [ ] SSE parser correctly splits raw text into events
  - [ ] TTFT captured at first content_block_delta
  - [ ] Empty response → TTFT null
  - [ ] Usage extracted from message_delta event

  **QA Scenarios**:
  ```
  Scenario: SSE parser tests pass
    Tool: Bash (vitest)
    Preconditions: Tests with mock SSE data
    Steps:
      1. Run `npx vitest run src/services/__tests__/stream`
      2. Verify all tests pass (5+ test cases)
    Expected Result: All SSE parsing + TTFT + usage tests pass
    Failure Indicators: Any test failure
    Evidence: .sisyphus/evidence/task-6-stream-tests.txt

  Scenario: Parser handles partial chunks correctly
    Tool: Bash (vitest)
    Preconditions: Test exists that feeds data in multiple small chunks
    Steps:
      1. Verify test exists that sends SSE data split across chunk boundaries
      2. Run test
    Expected Result: Parser reassembles partial chunks correctly
    Failure Indicators: Parser drops or misparses events on chunk boundaries
    Evidence: .sisyphus/evidence/task-6-partial-chunks.txt
  ```

  **Commit**: YES
  - Message: `feat(api): add SSE stream parser with TTFT measurement`
  - Files: `src/services/stream.ts`, tests
  - Pre-commit: `npx vitest run`

- [x] 7. Stats Calculator

  **What to do**:
  - Create `src/services/stats.ts`:
    - `calculateSummary(results: BenchmarkResult[], mode: 'stream' | 'non-stream'): BenchmarkSummary` — filter results by mode, compute:
      - avgResponseMs, minResponseMs, maxResponseMs, medianResponseMs (exclude errored results)
      - avgTtftMs (streaming only, null for non-streaming; exclude nulls from average)
      - totalTokens: sum of all TokenUsage fields across successful results
      - successCount, errorCount
    - Helper: `median(values: number[]): number`
  - Write TDD tests `src/services/__tests__/stats.test.ts`:
    - Test with known results → exact expected summary values
    - Test with single result → min = max = avg = median
    - Test with all errors → counts correct, averages are 0 or N/A
    - Test median with odd and even number of values
    - Test TTFT average excludes nulls

  **Must NOT do**:
  - Add percentiles (p50/p95/p99) — just mean, min, max, median
  - Import any statistics library

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5, 6, 8)
  - **Blocks**: Task 9
  - **Blocked By**: Task 2

  **References**:
  **API/Type References**:
  - `src/types/index.ts:BenchmarkResult` — input type
  - `src/types/index.ts:BenchmarkSummary` — output type
  - `src/types/index.ts:TokenUsage` — token aggregation fields

  **Acceptance Criteria**:
  - [ ] `npx vitest run src/services/__tests__/stats` — all tests pass
  - [ ] Median correctly computed for odd and even arrays
  - [ ] All-error results handled without division by zero

  **QA Scenarios**:
  ```
  Scenario: Stats calculator tests pass
    Tool: Bash (vitest)
    Preconditions: Tests with mock BenchmarkResult arrays
    Steps:
      1. Run `npx vitest run src/services/__tests__/stats`
      2. Verify all 5+ test cases pass
    Expected Result: All stats calculations correct
    Failure Indicators: Any test failure, NaN or Infinity in results
    Evidence: .sisyphus/evidence/task-7-stats-tests.txt
  ```

  **Commit**: YES (groups with Task 8)
  - Message: `feat(core): add stats and cost calculators`
  - Files: `src/services/stats.ts`, tests
  - Pre-commit: `npx vitest run`

- [x] 8. Cost Calculator

  **What to do**:
  - Create `src/services/cost.ts`:
    - `calculateCost(tokens: TokenUsage, pricing: OpenRouterPricing | null): number | null`:
      - If pricing is null → return null
      - Formula: `(pricing.prompt × tokens.inputTokens) + (pricing.completion × tokens.outputTokens) + ((pricing.inputCacheRead ?? 0) × tokens.cacheReadTokens) + ((pricing.inputCacheWrite ?? 0) × tokens.cacheWriteTokens)`
      - If any price component is null (from "-1" parsing), that component is 0 (not N/A for whole cost)
    - `formatCost(cost: number | null): string`:
      - null → "N/A"
      - 0 → "$0.0000"
      - Otherwise → `$X.XXXX` (4 decimal places, or scientific notation if < $0.0001)
  - Write TDD tests `src/services/__tests__/cost.test.ts`:
    - Test: known tokens + known pricing → exact expected cost
    - Test: null pricing → null
    - Test: cache pricing null → cache component treated as $0, rest still calculated
    - Test: all zero tokens → $0
    - Test: formatCost with various values

  **Must NOT do**:
  - Use any currency/decimal library (basic JS arithmetic is fine for this precision)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 5, 6, 7)
  - **Blocks**: Task 9
  - **Blocked By**: Task 2

  **References**:
  **API/Type References**:
  - `src/types/index.ts:TokenUsage` — inputTokens, outputTokens, cacheReadTokens, cacheWriteTokens
  - `src/types/index.ts:OpenRouterPricing` — prompt, completion, inputCacheRead (number|null), inputCacheWrite (number|null)
  - Cost formula: `(prompt_price × input_tokens) + (completion_price × output_tokens) + (cache_read_price × cache_read_tokens) + (cache_write_price × cache_write_tokens)`

  **Acceptance Criteria**:
  - [ ] `npx vitest run src/services/__tests__/cost` — all tests pass
  - [ ] `calculateCost({inputTokens: 100, outputTokens: 50, cacheReadTokens: 0, cacheWriteTokens: 0}, {prompt: 0.00003, completion: 0.00015, inputCacheRead: null, inputCacheWrite: null})` → `0.0105`
  - [ ] null pricing → null result
  - [ ] formatCost(null) → "N/A"

  **QA Scenarios**:
  ```
  Scenario: Cost calculator tests pass
    Tool: Bash (vitest)
    Preconditions: Tests with mock data
    Steps:
      1. Run `npx vitest run src/services/__tests__/cost`
      2. Verify 5+ test cases pass
    Expected Result: All cost calculations correct
    Failure Indicators: Any test failure, floating point precision issues
    Evidence: .sisyphus/evidence/task-8-cost-tests.txt
  ```

  **Commit**: YES (groups with Task 7)
  - Message: `feat(core): add stats and cost calculators`
  - Files: `src/services/cost.ts`, tests
  - Pre-commit: `npx vitest run`

- [x] 9. Benchmark Runner — Iterations, Concurrency, Both Modes

  **What to do**:
  - Create `src/services/runner.ts`:
    - `runBenchmark(config: BenchmarkConfig, pricing: OpenRouterPricing | null, onResult: (result: BenchmarkResult) => void): Promise<BenchmarkResult[]>`
      - Execution order: all non-streaming first, then all streaming
      - Concurrency: use a Promise pool pattern — run up to `config.concurrency` requests in parallel within each mode
      - For each request: call `sendNonStreaming` or `sendStreaming`, then `calculateCost`, populate result with cost
      - Call `onResult(result)` after each individual request completes (for live UI updates)
      - Generate unique ID for each result (e.g., `ns-1`, `ns-2`, `s-1`, `s-2`)
      - Error handling: if a request throws, catch and create a BenchmarkResult with `error` field set, continue with remaining requests
    - Helper: `promisePool<T>(tasks: (() => Promise<T>)[], concurrency: number): Promise<T[]>` — generic concurrency-limited executor
  - Write TDD tests `src/services/__tests__/runner.test.ts`:
    - Test concurrency: mock API with delays, verify no more than N concurrent (use timing analysis)
    - Test order: non-streaming results come before streaming
    - Test error handling: one failing request doesn't stop others
    - Test onResult callback: called for each result as it completes
    - Test result count: iterations=3 → 6 results (3 non-stream + 3 stream)

  **Must NOT do**:
  - Add abort/cancel functionality
  - Add retry logic for failed requests
  - Add warm-up requests

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []
    - Reason: Promise pool concurrency control, orchestration of multiple services

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 10, 11)
  - **Blocks**: Task 12
  - **Blocked By**: Tasks 5, 6, 7, 8

  **References**:
  **Pattern References**:
  - Promise pool pattern: maintain a running set of promises, start new one as each completes, never exceed concurrency limit
  - `src/services/anthropic.ts:sendNonStreaming` — non-streaming call
  - `src/services/stream.ts:sendStreaming` — streaming call
  - `src/services/cost.ts:calculateCost` — per-request cost

  **API/Type References**:
  - `src/types/index.ts:BenchmarkConfig` — input config
  - `src/types/index.ts:BenchmarkResult` — output per request
  - `src/types/index.ts:OpenRouterPricing` — for cost calculation

  **Acceptance Criteria**:
  - [ ] `npx vitest run src/services/__tests__/runner` — all tests pass
  - [ ] iterations=3 produces exactly 6 results
  - [ ] Concurrency limit respected (verified via timing)
  - [ ] One failure doesn't stop remaining requests

  **QA Scenarios**:
  ```
  Scenario: Runner tests pass
    Tool: Bash (vitest)
    Preconditions: Tests with mocked sendNonStreaming/sendStreaming
    Steps:
      1. Run `npx vitest run src/services/__tests__/runner`
      2. Verify all tests pass (4+ test cases)
    Expected Result: All runner orchestration tests pass
    Failure Indicators: Any test failure
    Evidence: .sisyphus/evidence/task-9-runner-tests.txt

  Scenario: Concurrency limit is respected
    Tool: Bash (vitest)
    Preconditions: Mock API with 100ms delay, concurrency=2, iterations=4
    Steps:
      1. Run concurrency test
      2. Verify total time is ~200ms (2 batches of 2) not ~100ms (all parallel) or ~400ms (all serial)
    Expected Result: Timing confirms at most 2 concurrent requests
    Failure Indicators: Timing suggests wrong concurrency level
    Evidence: .sisyphus/evidence/task-9-concurrency.txt
  ```

  **Commit**: YES
  - Message: `feat(bench): add benchmark runner with concurrency control`
  - Files: `src/services/runner.ts`, tests
  - Pre-commit: `npx vitest run`

- [x] 10. Config UI Panel — Form, Model Picker, LocalStorage Binding

  **What to do**:
  - Create `src/components/ConfigPanel.tsx`:
    - Form with 7 config fields, each bound to useLocalStorage:
      1. **Base URL**: text input, default `https://api.anthropic.com`
      2. **API Key**: password input (with show/hide toggle), default empty
      3. **Model**: combobox-style input — text input with dropdown suggestions from OpenRouter models, type to filter. Supports manual entry for custom models not in the list.
      4. **Prompt**: textarea, 3 rows, default "Say hello in one sentence."
      5. **Max Tokens**: number input, default 256, min 1
      6. **Iterations**: number input, default 3, min 1, max 100
      7. **Concurrency**: number input, default 1, min 1, max 20
    - "Run Benchmark" button: disabled when API key is empty or benchmark is running
    - Running state indicator: show "Running... (3/6)" with progress count
    - Each input change immediately persists to localStorage via useLocalStorage hook
  - Model picker implementation:
    - Accept `models: OpenRouterModel[]` as prop
    - Text input + filtered dropdown list (show top 20 matches)
    - Filter by `model.id` and `model.name` (case-insensitive substring match)
    - Click to select fills the input; manual typing is also allowed
    - Dropdown closes on selection or click-outside
  - Styling: Dark theme with Tailwind — `bg-gray-900` cards, `bg-gray-800` inputs, `text-gray-100`, `border-gray-700`, `focus:ring-blue-500`

  **Must NOT do**:
  - Use any component library (no shadcn, Radix, MUI, Ant Design)
  - Add form validation beyond disabling Run button when API key is empty
  - Add a "Save" button — all changes auto-persist
  - Render 500+ models in DOM simultaneously — limit visible dropdown to 20 filtered results

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`ui-ux-pro-max`]
    - `ui-ux-pro-max`: Generate design system for dark-themed developer tool dashboard. Run `python3 .opencode/skills/ui-ux-pro-max/scripts/search.py "developer tool dark dashboard benchmark api testing" --design-system -p "API Benchmark"` to get style/color/typography recommendations, then `python3 .opencode/skills/ui-ux-pro-max/scripts/search.py "layout responsive form" --stack react` for React-specific implementation patterns. Follow the Pre-Delivery Checklist (no emoji icons, cursor-pointer on clickable elements, smooth transitions, consistent spacing).
    - Reason: UI component with interactive model picker, form layout, dark theme styling

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 9, 11)
  - **Blocks**: Task 12
  - **Blocked By**: Tasks 3, 4

  **References**:
  **Pattern References**:
  - `src/hooks/useLocalStorage.ts` — hook for each config field
  - `src/config/defaults.ts` — default values for all fields

  **API/Type References**:
  - `src/types/index.ts:BenchmarkConfig` — config shape
  - `src/types/index.ts:OpenRouterModel` — model picker data

  **Acceptance Criteria**:
  - [ ] `npm run build` succeeds
  - [ ] All 7 config fields render with correct defaults
  - [ ] Model picker shows filtered suggestions when typing
  - [ ] Run button disabled when API key is empty

  **QA Scenarios**:
  ```
  Scenario: Config panel renders with defaults
    Tool: Playwright
    Preconditions: Dev server running, fresh localStorage
    Steps:
      1. Navigate to http://localhost:5173
      2. Verify input[placeholder*="api.anthropic.com"] or input with value "https://api.anthropic.com" exists
      3. Verify textarea contains "Say hello in one sentence."
      4. Verify Run button exists and is disabled (no API key)
      5. Screenshot
    Expected Result: All 7 fields visible with defaults, Run button disabled
    Failure Indicators: Missing fields, wrong defaults, Run button enabled without API key
    Evidence: .sisyphus/evidence/task-10-config-defaults.png

  Scenario: Config persists after refresh
    Tool: Playwright
    Preconditions: Dev server running
    Steps:
      1. Navigate to http://localhost:5173
      2. Fill API key input with "test-key-12345"
      3. Change iterations to "5"
      4. Reload page
      5. Verify API key input still has "test-key-12345"
      6. Verify iterations input has "5"
    Expected Result: Values persist across page reload
    Failure Indicators: Values reset to defaults after reload
    Evidence: .sisyphus/evidence/task-10-config-persist.png

  Scenario: Model picker filters suggestions
    Tool: Playwright
    Preconditions: Dev server running, OpenRouter models loaded
    Steps:
      1. Click on model input
      2. Type "claude"
      3. Verify dropdown appears with filtered results containing "claude" in name or id
      4. Verify no more than 20 items in dropdown
      5. Click on a suggestion
      6. Verify input value updates to selected model
    Expected Result: Dropdown filters and selection works
    Failure Indicators: No dropdown, no filtering, selection doesn't update input
    Evidence: .sisyphus/evidence/task-10-model-picker.png
  ```

  **Commit**: YES
  - Message: `feat(ui): add config panel with model picker`
  - Files: `src/components/ConfigPanel.tsx`
  - Pre-commit: `npm run build`

- [x] 11. Results Table UI — Per-Request Rows, Summary Stats

  **What to do**:
  - Create `src/components/ResultsTable.tsx`:
    - **Per-request table**: columns — #, Mode, Iteration, Response Time (ms), TTFT (ms), Input Tokens, Output Tokens, Cache Read, Cache Write, Cost
      - Mode column: "Stream" / "Non-Stream" badges with different colors
      - TTFT: show value for streaming, "—" for non-streaming
      - Cost: formatted with `formatCost()`
      - Error rows: show error message spanning columns, red background
    - **Summary section**: two rows (one per mode) — Mode, Avg/Min/Max/Median Response Time, Avg TTFT, Total Input/Output/Cache Tokens, Total Cost
    - **Empty state**: "No results yet. Configure and run a benchmark." message
    - **Running state**: Show results as they arrive (each `onResult` callback adds a row)
  - Styling: Dark theme table — `bg-gray-900` background, `divide-gray-800` rows, `text-sm`, compact numbers with monospace font for alignment

  **Must NOT do**:
  - Add sorting, filtering, or pagination
  - Add row click/expand for response body
  - Add export functionality
  - Use a table library (no tanstack-table etc.)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
  - **Skills**: [`ui-ux-pro-max`]
    - `ui-ux-pro-max`: Reuse the design system generated in Task 1 (read `design-system/MASTER.md` if it exists, otherwise run `python3 .opencode/skills/ui-ux-pro-max/scripts/search.py "developer tool dark dashboard data table" --design-system -p "API Benchmark"`). Apply consistent table styling — monospace numbers, compact rows, color-coded badges for stream/non-stream modes, error row styling. Follow Pre-Delivery Checklist.
    - Reason: Data table with conditional formatting, responsive layout, dark theme

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 9, 10)
  - **Blocks**: Task 12
  - **Blocked By**: Task 2

  **References**:
  **API/Type References**:
  - `src/types/index.ts:BenchmarkResult` — row data shape
  - `src/types/index.ts:BenchmarkSummary` — summary row data
  - `src/services/cost.ts:formatCost` — cost formatting
  - `src/services/stats.ts:calculateSummary` — compute summary from results

  **Acceptance Criteria**:
  - [ ] `npm run build` succeeds
  - [ ] Table renders correct number of columns (10)
  - [ ] Empty state shows placeholder message
  - [ ] Error rows show error message with red styling

  **QA Scenarios**:
  ```
  Scenario: Empty state renders
    Tool: Playwright
    Preconditions: Dev server running, no benchmark run yet
    Steps:
      1. Navigate to http://localhost:5173
      2. Look for text containing "No results" or similar empty state message
      3. Screenshot
    Expected Result: Empty state message visible, no table rendered
    Failure Indicators: Table rendered with no data, no empty state message
    Evidence: .sisyphus/evidence/task-11-empty-state.png

  Scenario: Build succeeds with ResultsTable
    Tool: Bash
    Preconditions: Component implemented
    Steps:
      1. Run `npm run build`
      2. Check exit code 0
    Expected Result: Build succeeds
    Failure Indicators: Type errors, import errors
    Evidence: .sisyphus/evidence/task-11-build.txt
  ```

  **Commit**: YES
  - Message: `feat(ui): add results table with summary stats`
  - Files: `src/components/ResultsTable.tsx`
  - Pre-commit: `npm run build`

- [x] 12. App Integration — Wire All Together

  **What to do**:
  - Update `src/App.tsx` to wire all components and services:
    - State management (all via useState):
      - `config: BenchmarkConfig` — from useLocalStorage
      - `models: OpenRouterModel[]` — fetched on mount
      - `results: BenchmarkResult[]` — populated during/after benchmark
      - `isRunning: boolean` — benchmark in progress
      - `progress: { current: number, total: number }` — live progress
    - On mount: call `fetchModels()` to populate model list, store in state. If fetch fails, show a warning banner but don't block the app.
    - "Run Benchmark" handler:
      1. Set `isRunning = true`, clear previous results
      2. Find pricing via `findModelPricing(models, config.model)`
      3. Call `runBenchmark(config, pricing, (result) => { setResults(prev => [...prev, result]); setProgress(...) })`
      4. After completion: `isRunning = false`
    - Layout: simple vertical stack — header, ConfigPanel, ResultsTable
    - Pass `calculateSummary` results to ResultsTable for summary rows
  - Create `src/components/Header.tsx`:
    - Simple app title: "Anthropic API Benchmark"
    - Subtitle: "Performance testing for /v1/messages endpoint"
    - Minimal styling, dark theme
  - Ensure `npm run build` and `npx vitest run` both pass

  **Must NOT do**:
  - Add React Router
  - Add state management library
  - Add error boundary (keep it simple)
  - Persist results to localStorage

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []
    - Reason: Integration task wiring multiple services and components together

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (sequential)
  - **Blocks**: Task 13
  - **Blocked By**: Tasks 9, 10, 11

  **References**:
  **Pattern References**:
  - `src/services/runner.ts:runBenchmark` — main benchmark function with onResult callback
  - `src/services/openrouter.ts:fetchModels` and `findModelPricing` — model data
  - `src/services/stats.ts:calculateSummary` — summary computation
  - `src/hooks/useLocalStorage.ts` — config persistence
  - `src/config/defaults.ts` — default config values

  **API/Type References**:
  - `src/components/ConfigPanel.tsx` — props: config, onConfigChange, models, isRunning, progress, onRun
  - `src/components/ResultsTable.tsx` — props: results, summaries

  **Acceptance Criteria**:
  - [ ] `npm run build` exits 0
  - [ ] `npx vitest run` all tests still pass
  - [ ] App renders: header + config panel + results area
  - [ ] Config → Run → Results flow works end to end (with mock or real API)

  **QA Scenarios**:
  ```
  Scenario: Full app renders correctly
    Tool: Playwright
    Preconditions: Dev server running
    Steps:
      1. Navigate to http://localhost:5173
      2. Assert page title or h1 contains "Benchmark" or "Anthropic"
      3. Assert config panel visible (API key input exists)
      4. Assert results area visible (empty state or table)
      5. Screenshot full page
    Expected Result: All three sections visible
    Failure Indicators: Missing sections, JS errors in console
    Evidence: .sisyphus/evidence/task-12-full-app.png

  Scenario: Build and all tests pass
    Tool: Bash
    Preconditions: All previous tasks completed
    Steps:
      1. Run `npm run build`
      2. Run `npx vitest run`
      3. Both exit 0
    Expected Result: Clean build + all tests pass
    Failure Indicators: Build or test failures
    Evidence: .sisyphus/evidence/task-12-build-tests.txt
  ```

  **Commit**: YES
  - Message: `feat: wire up app integration`
  - Files: `src/App.tsx`, `src/components/Header.tsx`
  - Pre-commit: `npm run build && npx vitest run`

- [x] 13. Polish — Error States, Edge Cases, Final Cleanup

  **What to do**:
  - Error states:
    - OpenRouter fetch failure: show a yellow warning banner "Could not load model list. You can still enter a model name manually. Cost calculation will be unavailable."
    - API error in result row: red background, error message in place of metrics
    - Empty API key: Run button disabled with tooltip or helper text
  - Edge cases:
    - Base URL normalization: strip trailing `/`, remove `/v1/messages` suffix if accidentally included
    - Max tokens validation: clamp to 1-100000
    - Iterations/concurrency validation: clamp to 1-100 / 1-20
  - UI polish:
    - Loading spinner next to "Run Benchmark" button when running
    - Monospace font for numbers in results table (`font-mono`)
    - Responsive: stack vertically on small screens
    - Add `<title>` to HTML: "API Benchmark Tool"
  - Code cleanup:
    - Remove any `console.log` statements left from development
    - Ensure no unused imports
    - Verify all TypeScript types are correct (`npx tsc --noEmit`)
  - Final verification:
    - `npm run build` — zero errors, zero warnings
    - `npx vitest run` — all tests pass
    - Manual check: page loads, dark theme applied

  **Must NOT do**:
  - Add dark/light theme toggle
  - Add toast notifications
  - Add animation/transitions (beyond Tailwind defaults)
  - Add result export
  - Add abort/cancel button

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (after Task 12)
  - **Blocks**: F1-F4
  - **Blocked By**: Task 12

  **References**:
  **Pattern References**:
  - All existing `src/components/*.tsx` files — review for edge case handling
  - `src/services/anthropic.ts:normalizeBaseUrl` — URL normalization logic

  **Acceptance Criteria**:
  - [ ] `npm run build` zero errors zero warnings
  - [ ] `npx vitest run` all tests pass
  - [ ] `npx tsc --noEmit` zero type errors
  - [ ] No `console.log` in source files (except test files)
  - [ ] Warning banner appears when OpenRouter fetch fails

  **QA Scenarios**:
  ```
  Scenario: Clean build with no warnings
    Tool: Bash
    Preconditions: All implementation complete
    Steps:
      1. Run `npm run build 2>&1`
      2. Verify exit code 0
      3. Grep output for "warning" — should be 0 matches
    Expected Result: Clean build, no warnings
    Failure Indicators: Warnings or errors in build output
    Evidence: .sisyphus/evidence/task-13-clean-build.txt

  Scenario: No console.log in production code
    Tool: Bash
    Preconditions: All source files written
    Steps:
      1. Run `grep -r "console.log" src/ --include="*.ts" --include="*.tsx" | grep -v "__tests__" | grep -v "node_modules"`
      2. Verify 0 matches
    Expected Result: No console.log outside test files
    Failure Indicators: Any match found
    Evidence: .sisyphus/evidence/task-13-no-console.txt

  Scenario: App loads and shows error state gracefully
    Tool: Playwright
    Preconditions: Dev server running
    Steps:
      1. Navigate to http://localhost:5173
      2. Verify page loads without JS errors (check console)
      3. Verify dark theme (body has dark background class)
      4. Verify document title contains "Benchmark"
      5. Screenshot
    Expected Result: Clean page load, dark theme, correct title
    Failure Indicators: JS errors, missing styles, wrong title
    Evidence: .sisyphus/evidence/task-13-final-page.png
  ```

  **Commit**: YES
  - Message: `fix: polish error states, edge cases, and cleanup`
  - Files: various
  - Pre-commit: `npm run build && npx vitest run`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, run command). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in `.sisyphus/evidence/`. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `npx tsc --noEmit` + `npx vitest run`. Review all changed files for: `as any`/`@ts-ignore`, empty catches, `console.log` in prod, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp).
  Output: `Build [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high` (+ `playwright` skill)
  Start from clean state (`npm run dev`). Load the page, verify all 7 config fields render with defaults, change values and refresh to verify persistence, verify OpenRouter model list loads. If API key available: run a minimal benchmark (1 iteration) and verify results table renders with all columns.
  Output: `Scenarios [N/N pass] | Evidence saved | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  Count source files (must be ≤15). Verify no forbidden deps (Router, state lib, component lib, chart lib). Verify no export functionality. Verify no abort/cancel UI. Check each task's "What to do" against actual implementation.
  Output: `Tasks [N/N compliant] | File count [N] | Forbidden deps [CLEAN/N issues] | VERDICT`

---

## Commit Strategy

| # | Scope | Message | Files | Pre-commit |
|---|-------|---------|-------|------------|
| 1 | Scaffold | `chore: scaffold vite + react + ts + tailwind + vitest` | entire project scaffold | `npm run build` |
| 2 | Types + Config | `feat(core): add type definitions and useLocalStorage hook` | `src/types/`, `src/hooks/useLocalStorage.ts` | `npx vitest run` |
| 3 | OpenRouter | `feat(openrouter): add model list service with pricing parser` | `src/services/openrouter.ts`, tests | `npx vitest run` |
| 4 | API Client | `feat(api): add anthropic non-streaming client with timing` | `src/services/anthropic.ts`, tests | `npx vitest run` |
| 5 | SSE Parser | `feat(api): add SSE stream parser with TTFT measurement` | `src/services/stream.ts`, tests | `npx vitest run` |
| 6 | Stats + Cost | `feat(core): add stats and cost calculators` | `src/services/stats.ts`, `src/services/cost.ts`, tests | `npx vitest run` |
| 7 | Runner | `feat(bench): add benchmark runner with concurrency control` | `src/services/runner.ts`, tests | `npx vitest run` |
| 8 | Config UI | `feat(ui): add config panel with model picker` | `src/components/ConfigPanel.tsx` | `npm run build` |
| 9 | Results UI | `feat(ui): add results table with summary stats` | `src/components/ResultsTable.tsx` | `npm run build` |
| 10 | Integration | `feat: wire up app integration and polish` | `src/App.tsx`, remaining files | `npm run build && npx vitest run` |

---

## Success Criteria

### Verification Commands
```bash
npm run build          # Expected: exit 0, no errors
npx vitest run         # Expected: all tests pass
npm run dev            # Expected: dev server at localhost:5173
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] All tests pass
- [ ] Build succeeds
- [ ] Config persists across refresh
- [ ] OpenRouter model list loads
- [ ] Results table shows all required columns
