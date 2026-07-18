# AI-Wonder Canvas — Remaining Work

> Items marked DONE are removed. Below are PARTIAL and NOT STARTED items
> from the original plan, updated to reflect current code state.
> All work targets `AIWonderCanvas.tsx` unless noted.

---

## Phase 1: Real Execution (Foundation)

### [~] Node input/output inspector — PARTIAL
- **Done:** NDV overlay opens on double-click (3-column layout), Output pane shows
  status/output/tokens/duration/timestamp, "Execute Single Node Test" button exists,
  bottom drawer has step output + execution trace tabs.
- **Remaining:**
  - Input pane shows editable `mockInputs`, not the actual data that entered the node
    during a real run — wire it to real execution input
  - Add execution log as a THIRD pane inside the NDV (currently in separate bottom drawer)
  - JSON viewer is plain `<pre>{JSON.stringify(...)}</pre>` — make it a collapsible tree
    with syntax highlighting
  - Re-run single node is gated to AI nodes only (line ~2939) — extend to HTTP, Code,
    IF, and all other executable node types
  - Show timestamps, duration, and status for each execution inside the NDV
- **Effort:** Medium (~1.5hr remaining)

---

## Phase 2: Flow Control

### [~] Conditional branching (IF/Switch) — PARTIAL
- **Done:** IF node fully works — operators (equals/not_equals/greater_than/less_than/
  contains/starts_with/regex), true/false output branches, port routing, visual
  T✔/F✘ labels, expression-resolved comparisons.
- **Remaining:**
  - Switch node is a UI stub only (add-panel line ~2218) — NO execution logic
  - Implement Switch execution: multiple cases + default, multi-output pins
  - Add Switch config UI (cases list with values, default branch)
  - Render multiple outputs on the canvas as separate pin connections
- **Effort:** Medium (~1.5hr remaining)

### [~] Loops (for/while) — PARTIAL
- **Done:** `loop_for` and `loop_while` node types exist in add-panel, basic execution
  (loop_for outputs array, loop_while runs while loop capped at max iterations).
- **Remaining:**
  - Loop node does NOT iterate downstream nodes per item — it just outputs the array.
    Need real per-item iteration: run downstream chain once per item
  - Expose `$index`, `$value`, `$items` inside loop body to downstream nodes
  - Render loop body nodes as a contained area on the canvas (visual grouping)
  - loop_for: properly parse `loopItems` from upstream node output, not just config
- **Effort:** Large (~2.5hr remaining)

### [~] Merge / split data nodes — PARTIAL
- **Done:** Merge node (array concat, object assign), Split node (first/all modes).
- **Remaining:**
  - Merge: add `text` mode (currently unimplemented in execution), add `intersect` and
    `zip` modes
  - Split: implement fan-out — one output stream per item (currently outputs single value)
  - Add **Aggregate** node type (does not exist at all) — combine items back into a list
  - Support true fan-out/fan-in patterns across the execution engine
- **Effort:** Medium (~1.5hr remaining)

---

## Phase 3: Integrations & Triggers

### [ ] Real webhook trigger — NOT STARTED
- **Files:** `AIWonderCanvas.tsx`, `App.tsx`, `server/index.ts`
- Webhook node exists in add-panel but URL is hardcoded mock
- Generate a real unique URL per workflow: `POST /api/webhooks/{workflowId}`
- Add Express/Node endpoint in `server/index.ts` to receive requests
- Parse request body, headers, query params and pass as node input
- Show webhook URL in trigger node config with copy button
- Add curl/Postman test button in the UI
- **Effort:** Large (~4hr, depends on backend)

### [~] Scheduled / cron triggers — PARTIAL
- **Done:** Schedule node works via real `setInterval` (9 interval options, enable/disable
  toggle, "next 5 execution times" preview).
- **Remaining:**
  - Cron node is cosmetic — `cronExpression` config field exists but is NOT parsed
  - Add `cron-parser` dependency and real cron execution in the `useEffect` interval logic
  - Currently falls back to hardcoded 15-min interval for cron nodes (line ~1018)
- **Effort:** Small (~1hr remaining)

### [ ] Credentials vault — NOT STARTED
- **Files:** new `src/components/CredentialsVault.tsx`, `AIWonderCanvas.tsx`
- "Credentials" sidebar tab exists but renders placeholder text only
- Credential types: API Key (bearer), Basic Auth (username/password),
  OAuth2 (client ID + secret)
- Store encrypted in localStorage (at minimum base64 encoded)
- Reference credentials in nodes via `$credentials.my_key`
- Never expose credential values in the output inspector
- **Effort:** Medium (~2hr)

### [ ] Workflow templates enhancement — NOT STARTED (optional)
- **Done:** 8 templates exist, gallery + import working.
- **Remaining (polish):**
  - Add "Import Template" button inside the workflows sidebar (currently in dedicated
    Templates tab — minor deviation)
  - Add template categories/tags for filtering
- **Effort:** Small (~0.5hr, optional)

---

## Phase 4: Advanced AI & Production

### [ ] Multi-agent orchestration — NOT STARTED
- **Files:** `AIWonderCanvas.tsx`, `types.ts`
- Multiple agent nodes can be wired via ordinary connections, but no handoff semantics
- Add "Agent Handoff" node: passes conversation context to another agent
- Add "Tool" node types that AI agents can invoke:
  - HTTP Request tool, Code tool, Knowledge Search tool
- AI agent config: list of available tools, max iterations, memory type
- Show agent reasoning trace in output inspector (thought/action/observation)
- Move `WorkflowNode`/`WorkflowConnection` types into `types.ts` for shared use
- **Effort:** Very Large (~6hr)

### [ ] Human-in-the-loop approvals — NOT STARTED
- **Files:** `AIWonderCanvas.tsx`
- Add "Approval" node type
- Pauses execution and sends notification (in-app toast/notification)
- Config: approval prompt, timeout duration, auto-reject after timeout
- Two output branches: "Approved" and "Rejected"
- Show pending approvals count in the sidebar
- **Effort:** Medium (~2hr)

### [~] Expressions / templating engine — PARTIAL
- **Done:** `{{ ... }}` substitution, `resolveConfig` recursively resolves all string
  values at runtime, functions: `$now`, `$today`, `$json`, `$items`, `$index`,
  `$node["Name"].data.property` references, expression preview in NDV config UI.
- **Remaining:**
  - Add `$jmespath` function (not implemented)
  - Add auto-suggest/autocomplete expression editor (currently plain inputs/textareas)
  - Show expression evaluation result preview inline in more config fields
- **Effort:** Medium (~2hr remaining)

### [ ] Sub-workflows — NOT STARTED
- **Files:** `AIWonderCanvas.tsx`, `App.tsx`
- Allow a node to reference and call another saved workflow
- Pass input data and receive output data from the sub-workflow
- Show sub-workflow as a nested container or referenced node
- Track nested execution in the log trace
- Requires workflow persistence (see versioning below)
- **Effort:** Large (~4hr)

### [ ] Workflow versioning — NOT STARTED
- **Files:** `AIWonderCanvas.tsx`
- SAVE button currently does nothing except `showNotification('Workflow saved locally!')`
- Save workflow snapshots on each "Save" (to localStorage or backend)
- Show version history panel with timestamps
- Allow diff between versions (nodes added/removed, config changes)
- Restore to a previous version
- Auto-save draft every 30 seconds
- **Effort:** Medium (~2hr)

### [ ] AI-powered workflow generation — NOT STARTED
- **Files:** new `src/components/WorkflowGenerator.tsx`
- Text input: "Describe the workflow you want to build"
- Send description to Gemini/OpenRouter with a system prompt that generates
  a JSON workflow definition
- Parse the response and render nodes on the canvas
- User can then tweak, rearrange, and refine
- Start with simple patterns: webhook → AI → response
- **Effort:** Large (~4hr)

---

## Summary

| Status | Count | Items |
|--------|-------|-------|
| Partial | 7 | Inspector, IF/Switch, Loops, Merge/Split, Cron, Expressions, Templates |
| Not started | 7 | Webhook, Credentials, Multi-agent, Approvals, Sub-workflows, Versioning, Workflow gen |
| **Total remaining** | **14** | |

## Recommended Priority Order
1. **Workflow versioning** — makes SAVE functional, foundation for sub-workflows (~2hr)
2. **Switch node execution** — finishes existing stub, small (~1.5hr)
3. **Cron parsing** — finishes existing stub, small (~1hr)
4. **Node inspector** — high UX value, medium (~1.5hr)
5. **Loops** — core flow control, large (~2.5hr)
6. **Merge/Split/Aggregate** — completes data flow, medium (~1.5hr)
7. **Credentials vault** — needed for real HTTP auth (~2hr)
8. **Real webhook trigger** — requires backend (~4hr)
9. **Expressions polish** — jmespath + autocomplete (~2hr)
10. **Multi-agent orchestration** — largest effort (~6hr)
11. **Human-in-the-loop** — (~2hr)
12. **Sub-workflows** — depends on versioning (~4hr)
13. **AI workflow generation** — (~4hr)
14. **Templates polish** — optional (~0.5hr)
