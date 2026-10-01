# Tasks failures are caused by the runner and fixture stimuli

The collected evidence does not establish an Effect Tasks backend defect. The seven failing adapter cells contain nine failed assertions with three causes:

| Failure                                            | Owner                            | Evidence                                                                                                                                                                 |
| -------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Seven `wire-schema-valid` assertions               | Conformance runner               | All 19 rejected task responses pass the official extension schema. The runner selects the core `CallToolResult` schema instead.                                          |
| `tasks-result-type-complete-on-non-task-responses` | Upstream dispatch scenario       | Its unknown-key response value violates the official schema. Replacing only that value with a valid response makes the assertion pass.                                   |
| `sep-2663-tasks-get-status-failed`                 | Local lifecycle fixture stimulus | `Effect.die` becomes a tool error inside the typed toolkit. It never becomes a JSON-RPC failure. A protocol-timeout control makes the original lifecycle assertion pass. |

The status-notification scenario remains an upstream skip and is not a failure. The original matrix and its failures remain unchanged. The controls are diagnostic comparisons, not a new passing baseline.

## Exact requests and responses

Run both reproducible comparisons from the repository root:

```sh
bun run conformance:evidence
node reports/task-failure-evidence/schema/compare.mjs
```

The live collector starts the existing fixtures, captures request headers and bodies, HTTP statuses, response headers, raw response bodies, server logs, and runner assertions. It asserts the observed differences before exiting successfully. It uses the installed local Effect packages. It does not modify the existing scenarios or the sibling Effect checkout.

The control runner is a temporary copy of the installed bundle with one request-value substitution. The collector removes that copy afterward. A temporary fixture under `apps/conformance/.cache/` is derived from the original lifecycle fixture with only its protocol-error handler and task timeout changed.

| Artifact                                                                             | Contents                                                                                                                |
| ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| [toolkit-defect.json](task-failure-evidence/toolkit-defect.json)                     | Original `protocol_error_job` call and completed task containing `isError: true`.                                       |
| [dispatch-input-responses.json](task-failure-evidence/dispatch-input-responses.json) | Invalid and valid responses under unknown and known keys, task state before and after, and corrected-runner assertions. |
| [toolkit-protocol-timeout.json](task-failure-evidence/toolkit-protocol-timeout.json) | Public toolkit protocol-failure control and original lifecycle assertions.                                              |
| [backend-error-controls.json](task-failure-evidence/backend-error-controls.json)     | Direct execution of a defect, explicit JSON-RPC error, and tool-error result.                                           |
| [source-excerpts.json](task-failure-evidence/source-excerpts.json)                   | Owning Effect code, line ranges, source hashes, and checkout revision.                                                  |
| [schema comparison](tasks-schema-investigation.md)                                   | Runner validator excerpts, official extension schema, pinned revision, hashes, and per-message validation results.      |

## Runner selects the wrong response schema

The installed runner maps `tools/call` to `CallToolResult`. Its validator handles `resultType: "input_required"` specially, but has no equivalent branch for `resultType: "task"`. It therefore requires `content` on the flat task response.

The official [Tasks specification](https://github.com/modelcontextprotocol/ext-tasks/blob/5246bc3d0253c1c4b09e682f690b7e8b97362500/specification/2026-07-28/tasks.md#capabilities) permits `CreateTaskResult` instead of the normal tool result when the client declares extension support. The captured task responses satisfy the [released extension schema](https://github.com/modelcontextprotocol/ext-tasks/blob/5246bc3d0253c1c4b09e682f690b7e8b97362500/schema/2026-07-28/schema.json).

The comparison uses the runner's installed Ajv and actual embedded core schema. All 19 samples fail core `CallToolResult` and pass extension `CreateTaskResult`. Each result and validation error is saved in [comparison.json](task-failure-evidence/schema/comparison.json). This confirms a runner schema-selection defect, rather than malformed Effect task envelopes. It does not prove every untested task response conforms.

## Dispatch probes invalid input before unknown-key handling

The upstream dispatch scenario sends:

```json
{ "inputResponses": { "unknown-key": { "ignored": true } } }
```

The official extension schema accepts sampling, roots, and elicitation response shapes. `{ "ignored": true }` is none of those. Both `InputResponses` and the complete `UpdateTaskRequest` reject it. [input-response-comparison.json](task-failure-evidence/schema/input-response-comparison.json) contains the official validation errors.

The live controls establish the difference:

| Response value                                           | Key         | Effect outcome                                                              |
| -------------------------------------------------------- | ----------- | --------------------------------------------------------------------------- |
| `{ "ignored": true }`                                    | Unknown     | JSON-RPC `-32602`, `Invalid method parameters`.                             |
| `{ "action": "accept", "content": { "confirm": true } }` | Unknown     | Empty complete acknowledgement. Original pending request remains unchanged. |
| `{ "ignored": true }`                                    | Outstanding | JSON-RPC `-32602`, `Invalid method parameters`.                             |
| `{ "action": "accept", "content": { "confirm": true } }` | Outstanding | Empty complete acknowledgement. Task completes with the expected result.    |

Effect's RPC payload schema validates every response value before dispatch. Its memory backend ignores unknown keys after that validation. The owning code is `internal/mcpSchema/v2026_07_28.ts`, lines 433–445 and 749–754, followed by `internal/mcpTasks.ts`, lines 367–374. The [released specification](https://github.com/modelcontextprotocol/ext-tasks/blob/5246bc3d0253c1c4b09e682f690b7e8b97362500/specification/2026-07-28/tasks.md#response-1) recommends ignoring unknown keys, but does not make an invalid response value schema-valid.

The temporary runner changes only:

```text
inputResponses:{"unknown-key":{ignored:!0}}
```

to:

```text
inputResponses:{"unknown-key":{action:"accept",content:{confirm:!0}}}
```

All eight dispatch behavioral assertions then pass against the unchanged Effect server. The unrelated generic schema assertion still fails. This isolates the upstream scenario payload as the cause of the dispatch failure.

## The original lifecycle fixture did not produce a JSON-RPC fault

The original local fixture implemented `protocol_error_job` as `Effect.die("Expected protocol failure")` in `McpTasks.toolkit`. `McpServer.registerToolkit` catches handler defects, reports them, and returns a scrubbed `CallToolResult` with `isError: true`. See `McpServer.ts`, lines 1859–1872 and 1895–1909, in [source-excerpts.json](task-failure-evidence/source-excerpts.json).

The task backend therefore receives a successful tool-result value. Its success branch sets `status: "completed"` and stores that result. The original task contains:

```json
{
  "status": "completed",
  "result": {
    "isError": true,
    "content": [
      {
        "type": "text",
        "text": "Tool execution failed due to an internal server error."
      }
    ]
  }
}
```

The [error rule](https://github.com/modelcontextprotocol/ext-tasks/blob/5246bc3d0253c1c4b09e682f690b7e8b97362500/specification/2026-07-28/tasks.md#task-execution-errors) reserves `failed` for JSON-RPC errors. A tool result with `isError: true` must use `completed`. A handler defect is not automatically a JSON-RPC error after an API boundary converts it to a tool result.

Controls show that the backend preserves the required distinction:

| Execution path                                                    | Observed task                                 |
| ----------------------------------------------------------------- | --------------------------------------------- |
| Typed toolkit handler defect                                      | `completed`, tool error result.               |
| Direct `Execution.create` defect                                  | `failed`, JSON-RPC error `-32603`.            |
| Direct `Execution.create` with explicit `TaskError`               | `failed`, original JSON-RPC error preserved.  |
| Direct tool-error result                                          | `completed`, tool error result.               |
| Public toolkit with nonterminating handler and 40 ms task timeout | `failed`, JSON-RPC error `-32603`, no result. |

The timeout control keeps the original lifecycle runner and assertion. All eight lifecycle behavioral assertions pass. The generic schema assertion remains the only failure.

The earlier statement that the lifecycle failure exposed an Effect task defect was too strong. The confirmed cause is that the fixture equates a typed tool handler defect with a JSON-RPC fault. Whether Effect should offer a public typed-handler mechanism for explicitly producing protocol errors is a separate API decision. These results do not justify changing its existing tool-error behavior or its task backend.

## Follow-up ownership

Fix the runner's extension schema selection and its dispatch probe value upstream. The local lifecycle fixture now uses `Effect.never` with a 40 millisecond task policy timeout. The [fixed run](tasks-lifecycle-fixed-2026-10-01.json) passes all eight lifecycle behavioral assertions against local Effect. Only the runner's generic schema assertion fails. This tests the failed-task protocol contract using a timeout; it does not simulate the upstream description's literal panic. No Tasks feature changes were needed. The evidence collector derives the original handler-defect control from the corrected fixture so both paths remain reproducible.

Evidence was collected against local Effect `4.0.0-rc.118` at `c5925879305c8fee11132372604353dd4c8673c6` and conformance `0.2.0-alpha.11`. Package hashes are in the [original run](conformance-2026-10-01.json). The schema investigation records its pinned authoritative source revision and runner bundle hash.
