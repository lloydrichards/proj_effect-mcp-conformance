# Tasks wire schema investigation

The seven `wire-schema-valid` failures are caused by the conformance runner applying the core `CallToolResult` schema to extension task responses. None of the 19 captured task creation responses violates the official Tasks extension `CreateTaskResult` schema. This establishes ownership for those schema failures; it does not establish correctness of the separate lifecycle or dispatch assertions.

## Reproduction

Run from the repository root:

```sh
node reports/task-failure-evidence/schema/compare.mjs
```

The script extracts the actual embedded 2026-07-28 core schema from the installed alpha.11 bundle, then validates every recorded failing response against both that schema and the saved official Tasks schema using the runner's installed Ajv 8.20.0. It does not alter the runner, Effect, or scenarios.

Actual result: 19 responses rejected by `CallToolResult`, 19 accepted by `CreateTaskResult`. The affected scenarios are `tasks-lifecycle`, `tasks-capability-negotiation`, `tasks-wire-fields`, `tasks-request-state-removal`, `tasks-mrtr-input`, `tasks-request-headers`, and `tasks-dispatch-and-envelope`. See [comparison.json](task-failure-evidence/schema/comparison.json) for the exact responses and validation errors.

## Cause

Installed `node_modules/@modelcontextprotocol/conformance/dist/index.js`, line 2, is minified. The extracted [validator excerpt](task-failure-evidence/schema/bundled-validator-excerpt.txt) preserves these exact functions:

- `We()` builds `resultDefs` by naming convention: `CallToolRequest` becomes `CallToolResult`.
- `Ke()` special-cases `resultType === "input_required"`, then otherwise selects `resultDefs.get(requestMethod)`. It has no branch for `resultType === "task"` and loads no extension schema.
- The embedded core `CallToolResult` requires `content` and `resultType`. The task response has `resultType: "task"`, task identifiers, status, and timestamps instead of `content`.

The [stable extension specification](https://github.com/modelcontextprotocol/ext-tasks/blob/5246bc3d0253c1c4b09e682f690b7e8b97362500/specification/2026-07-28/tasks.md#capabilities) permits `CreateTaskResult` in place of a standard result when the request declares extension support. Saved specification lines 59–61 describe this; lines 95–102 define the result discriminator. Adding artificial `content` to Effect task responses would hide the runner defect rather than implement the extension contract.

A runner fix should use negotiated extension context to validate task responses against `CreateTaskResult`, while retaining the normal core schema for completed synchronous responses. Capability checks must remain separate: a response that satisfies the task schema could still be invalid if its originating request did not opt in.

## Dispatch malformed unknown input

The runner's dispatch probe sends `inputResponses: {"unknown-key": {"ignored": true}}`. The authoritative extension schema defines `InputResponse` as a union of `CreateMessageResult`, `ListRootsResult`, and `ElicitResult`. `{ignored:true}` satisfies none of these.

The comparison script also checks both the `InputResponses` map and the complete `UpdateTaskRequest`:

| Payload for unknown key                    | InputResponses valid | UpdateTaskRequest valid |
| ------------------------------------------ | -------------------- | ----------------------- |
| `{ignored:true}`                           | false                | false                   |
| `{action:"accept",content:{confirm:true}}` | true                 | true                    |

See [input-response-comparison.json](task-failure-evidence/schema/input-response-comparison.json) for exact requests and errors. Unknown key handling should be tested with a schema-valid response value. The saved specification line 350 allows ignoring unknown or already satisfied keys, but that does not make arbitrary malformed values valid wire input. Effect rejecting the malformed request before backend key lookup is consistent with this schema. Parent investigation supplies live HTTP evidence for the valid unknown-key control.

## Source identity

- CLI package: `@modelcontextprotocol/conformance@0.2.0-alpha.11`; installed bundle SHA-256 `a10085d0cfc9dd9192cc227f0f4dd6f1af9a94f6a0d3e30af08d4a0bcf268aae`.
- Official Tasks repository revision: `5246bc3d0253c1c4b09e682f690b7e8b97362500`; [revision record](task-failure-evidence/schema/ext-tasks-revision.json).
- Official stable schema: [schema/2026-07-28/schema.json](https://github.com/modelcontextprotocol/ext-tasks/blob/5246bc3d0253c1c4b09e682f690b7e8b97362500/schema/2026-07-28/schema.json); saved SHA-256 `bf30afb7ac251e3e22c037b7a685f60ef6603031b5484c0d08b1fa0bbe86d460`. A second fetch from the pinned revision produced the identical hash.
- Original Effect run revision and packed dependency hashes are recorded in [conformance-2026-10-01.json](conformance-2026-10-01.json), lines 8–23.

The schema comparison uses captured messages from the original run. Live reruns are recorded separately by the main investigation.
