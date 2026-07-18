# Playground — OpenRouter Feature Gap Plan

> Goal: Replace hardcoded provider routing with OpenRouter as the unified backend,
> then add streaming, cost tracking, routing features, and advanced capabilities.

---

## Phase 1: Core API Integration

### [ ] Add OpenRouter as unified API backend
- **Files:** `Playground.tsx`, `ApiKeysModal.tsx`, `types.ts`, `src/utils.ts`
- Install `openai` SDK (OpenRouter is OpenAI-compatible)
- Add `openrouterKey` to `ApiKeysModal.tsx` with input + localStorage save
- Create a model-to-OpenRouter-path mapping in `utils.ts`:
  ```ts
  const MODEL_ROUTES: Record<string, string> = {
    'fugu-ultra': 'sakana/fugu-ultra',
    'gemini-3-flash-preview': 'google/gemini-3-flash',
    'gpt-4o': 'openai/gpt-4o',
    ...
  }
  ```
- Replace all provider-specific `fetch` branches in `Playground.tsx` with a single
  `POST https://openrouter.ai/api/v1/chat/completions` call using the OpenRouter key
- Keep Gemini as final fallback if OpenRouter key is missing or fails
- **Effort:** Medium (~3hr)

### [x] Add streaming responses (SSE)
- **Files:** `Playground.tsx`, `server/index.ts`, `server/providers/registry.ts`
- [/api/chat/stream SSE endpoint on server](server/index.ts)
- ReadableStream parsing in `Playground.tsx`
- Stop button during streaming
- Blinking cursor via existing `isStreaming` state → `ResponseView` cursor
- **Effort:** Done (~2hr)

### [x] Token & cost display per message
- **Files:** `Playground.tsx`
- Parse `usage` from OpenRouter SSE response and non-streaming fallback
- Footer format: `↑ {prompt} · ↓ {completion} · {total}t${cost ? ` · ${cost}` : ''}`
- **Effort:** Done (~1hr)
- **Remaining:** Session running total in sidebar

---

## Phase 2: Reliability & Routing

### [ ] Fallback chains
- **Files:** `Sidebar.tsx`, `Playground.tsx`, `types.ts`
- Add fallback model selector in Sidebar (multi-select, ordered)
- Send as `models: ['primary', 'fallback1', 'fallback2']` via OpenRouter's
  `extra_body.models` parameter
- Show which model actually served the response in the message footer
- **Effort:** Medium (~2hr)

### [x] Rate-limit & retry logic
- **Files:** `Playground.tsx`
- `fetchWithRetry` with exponential backoff (1s → 2s → 4s → 8s, max 3 retries)
- Detects 429 and 503 status codes
- **Effort:** Done (~1hr)
- **Remaining:** Warning badge when retrying, surface rate-limit headers

### [ ] Request log / history drawer
- **Files:** `new src/components/RequestLog.tsx`, `App.tsx`, `types.ts`
- Store last 100 requests in localStorage: model, tokens, cost, status, timestamp
- Add collapsible drawer at bottom of playground
- Show table with model, tokens, cost, duration, status
- Allow re-sending a logged request
- **Effort:** Medium (~2hr)

---

## Phase 3: Advanced Features

### [ ] Structured outputs / JSON mode
- **Files:** `Sidebar.tsx`, `Playground.tsx`, `types.ts`
- Add JSON mode toggle in Sidebar
- Add optional JSON schema textarea
- Pass `response_format: { type: 'json_object' }` in request
- Validate response JSON and show parse errors
- **Effort:** Medium (~2hr)

### [ ] Multimodal input (image upload)
- **Files:** `Playground.tsx`
- Add image upload button (camera icon) next to text input
- Accept clipboard paste of images
- Convert to base64 data URI, include in message content
  `[{ type: 'text', text: '...' }, { type: 'image_url', image_url: { url: '...' } }]`
- Show image thumbnail preview in input area
- **Effort:** Medium (~2hr)

### [ ] Model comparison view
- **Files:** `new src/components/ModelComparator.tsx`, `App.tsx`
- New tab with model selector (add 2+ models)
- Single prompt input, sent to all selected models simultaneously
- Show outputs in side-by-side panes or tabbed view
- Highlight differences between responses
- Show cost and latency per model
- **Effort:** Large (~4hr)

### [ ] Token counter & cost estimator
- **Files:** `new src/components/TokenEstimator.tsx`, `App.tsx`
- New tool tab with textarea input
- Estimate token count (rough: `text.length / 4`)
- Show estimated cost across 5 popular models
- Show running session total
- **Effort:** Small (~1hr)

---

## Phase 4: Quality of Life

### [ ] Web search / fetch for models
- **Files:** `Playground.tsx`, `Sidebar.tsx`, `types.ts`
- Add "Web Search" toggle in Sidebar
- Pass OpenRouter's plugin parameter:
  ```ts
  extra_body: { plugins: [{ id: 'web', max_results: 5 }] }
  ```
- Show search snippets as context in system prompt
- **Effort:** Medium (~1.5hr)

### [ ] Prompt caching
- **Files:** `Playground.tsx`
- Auto-detect repeated prompt prefixes across messages
- Send `extra_body: { cache: { enabled: true } }` when supported
- Track cache hit/miss rate in message footer
- **Effort:** Small (~1hr)

### [ ] Auto Router integration
- **Files:** `Sidebar.tsx`, `Playground.tsx`, `ModelsCatalog.tsx`
- Add "Auto Router" as a selectable model in the catalog
- Users pick quality tier: cheap / balanced / best
- Send `route: 'auto'` with optional `min_score` or `max_cost` parameters
- Show which model was selected in the response footer
- **Effort:** Small (~1hr)

### [ ] Free model tier support
- **Files:** `Playground.tsx`, `ApiKeysModal.tsx`
- When no OpenRouter key is configured, route to OpenRouter's free tier
- Free models include: Llama 4 Scout, Mistral Small 3, etc. (rate-limited)
- Show rate-limit remaining indicator (X/60 req/min)
- **Effort:** Small (~1hr)
