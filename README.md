# Effect MCP conformance fixtures

This repository is an executable compatibility map for Effect's MCP server.
It runs the official [MCP conformance runner](https://github.com/modelcontextprotocol/conformance)
against small, purpose-built Effect servers so that a pass or failure can be
attributed to one protocol behavior at a time.

It is not a sample application. Each conformance scenario has an independent
server app that remains the causal baseline. Suffixed variants such as
`tools-list-II` deliberately implement the same contract through a different
Effect API or runtime path. That lets the same upstream check probe more than
one implementation without changing its official scenario name.

## Direction

The repository has three deliberate boundaries:

```txt
.
├── apps/
│   ├── cli-app/                # Stack Effect CLI template/reference
│   └── conformance/            # Effect CLI that starts and tests scenarios
├── packages/
│   ├── config-typescript/      # shared TypeScript defaults
│   └── mcp-fixture/            # shared Streamable HTTP server setup
└── scenarios/
    ├── server-initialize/      # one independent MCP server per scenario
    ├── tools-list-II/          # alternate implementation of tools-list
    ├── tools-list-III/
    ├── logging-set-level/
    └── ...
```

`apps/conformance` owns orchestration only. It uses Effect CLI and scoped
`ChildProcess` commands to start a selected scenario, wait until its `/mcp`
endpoint responds, run the official checker, and terminate the fixture.

`packages/mcp-fixture` owns only the common HTTP transport and server metadata.
Scenario apps own their capabilities and handlers. Every suffixed variant is
self-contained, so its alternate implementation can be read and run in place.
This is where each new conformance behavior belongs.

[`apps/conformance/src/scenarios.ts`](./apps/conformance/src/scenarios.ts)
maps each suffixed row to its official conformance scenario and applicable
protocols. Every row launches its matching `scenarios/<name>/src/index.ts`.

## Setup

Requirements:

- Bun
- A local checkout of this repository

Install the lockfile-pinned workspace dependencies:

```sh
bun install
```

The stacked local-development branch can switch the installed packages to a
publish-shaped build of the sibling `open_effect` checkout:

```sh
bun run effect:local
```

Set `OPEN_EFFECT_DIR` when that checkout is elsewhere. The command builds and
packs `effect`, `@effect/platform-node-shared`, and `@effect/platform-bun`, then
installs the tarballs without retaining local paths in `package.json` or
`bun.lock`.

To return to the published RC baseline, unapply this stacked branch and restore
the lockfile packages:

```sh
bun install --force
```

The Effect version under test is pinned in
[`packages/mcp-fixture/package.json`](./packages/mcp-fixture/package.json).
The conformance runner is also pinned exactly in the root `package.json`
because its `0.2.0` line is still alpha. Record both versions whenever you
report a result.

## Use

List the scenarios exposed by the installed conformance runner:

```sh
bun run conformance:list
bun run conformance:coverage
```

Run one implemented fixture:

```sh
bun run conformance:scenario server-initialize
bun run conformance:scenario logging-set-level
bun run conformance:scenario ping
bun run conformance:scenario tools-list
bun run conformance:scenario tools-call-image
```

Run the full adapter matrix. Each cell starts an isolated server with exactly
one configured adapter, then runs the matching upstream conformance scenario:

```sh
bun run conformance:all
```

Run alternate implementations like ordinary scenarios:

```sh
bun run conformance:scenario tools-list-II
bun run conformance:scenario tools-list-III
bun run conformance:all
```

The unsuffixed scenario is implementation I. `-II`, `-III`, and later rows are
additional implementations of the same upstream contract. `conformance:all`
runs every original and alternate row automatically.

The result is a bordered terminal report with colour-coded statuses (and a
plain-text fallback for redirected output), such as:

```text
scenario | v2025-11-25 | v2025-06-18 | v2025-03-26 | v2024-11-05
ping     | PASS        | PASS        | PASS        | PASS
```

`FAIL` means the conformance runner exited unsuccessfully; `TIMEOUT` means the
cell exceeded the ten-second limit (use `--timeout <milliseconds>` to adjust
it); `SKIP` means the upstream runner skipped all checks, and `--` means the
scenario does not apply to that adapter. The local applicability matrix is derived from the actual Effect
adapter behavior, rather than only the upstream runner's dated labels.
For a fast local check, limit the matrix to one scenario:

```sh
bun run conformance:all --scenario ping
```

Pass `--verbose` through to the conformance runner when diagnosing a failure:

```sh
bun run conformance:scenario ping --verbose
```

### Protocol selection

Every run performs an explicit `initialize` probe before the conformance
runner starts. It reports the protocol offered by the probe, the ordered
adapter list configured in the fixture, and the adapter Effect actually
negotiated.

The fixture can expose the five adapters implemented by the linked Open Effect
checkout, from `2026-07-28` through `2024-11-05`. The published dependency may
support a smaller set; keep published-package and linked-checkout results
separate when reporting them.

```sh
# The fixture exposes only 2025-11-25.
bun run conformance:scenario ping \
  --protocol 2025-11-25 \
  --protocol-case only

# The first adapter is selected exactly; the older adapter is present as a
# fallback without changing that result.
bun run conformance:scenario ping \
  --protocol 2025-11-25 \
  --protocol-case with-fallback \
  --fallback-protocol 2025-06-18

# The offered 2025-11-25 adapter is absent. Effect selects the first configured
# adapter, 2025-06-18.
bun run conformance:scenario ping \
  --protocol 2025-11-25 \
  --protocol-case fallback-only \
  --fallback-protocol 2025-06-18
```

`only` configures `[protocol]`; `with-fallback` configures
`[protocol, fallback-protocol]`; and `fallback-only` configures
`[fallback-protocol]`. An empty or truly missing adapter set is not a valid
`McpServer.layerHttp` configuration: Effect requires at least one adapter and
selects the first configured adapter when the offered version is unavailable.

The upstream runner's `--spec-version` flag filters scenario lists and suites.
It does not force a protocol version for an explicitly named server scenario.
This CLI instead validates the negotiated protocol against each scenario's
local applicability metadata in
[`apps/conformance/src/scenarios.ts`](./apps/conformance/src/scenarios.ts).

Open a scenario in the [MCP Inspector](https://github.com/modelcontextprotocol/inspector):

```sh
bun run --cwd=apps/conformance start -- inspect ping
bun run --cwd=apps/conformance start -- inspect tools-list-II
```

The command starts the fixture, then launches the Inspector with its Streamable
HTTP URL. Close the Inspector to stop the fixture.

The fixture binds to `127.0.0.1` on a random high port, then shuts down when
the command ends. To make the port stable for local inspection, set `MCP_PORT`:

```sh
MCP_PORT=9009 bun run conformance:scenario ping
```

The Effect CLI can also be used directly:

```sh
bun run --cwd=apps/conformance start -- --help
bun run --cwd=apps/conformance start -- run ping --verbose
```

Validate the workspace after a fixture or dependency change:

```sh
bun run format:check
bun run type-check
```

## Current coverage

The 2026-10-01 run uses conformance `0.2.0-alpha.11` and locally packed
Open Effect `4.0.0-rc.118`, including the Tasks branch. The CLI already pins
the newest published alpha; npm's `latest` tag remains `0.1.16`.

The final matrix has 276 passes, seven failures, and one upstream skip across
284 applicable adapter checks. All 275 existing adapter checks pass.

The workspace implements 58 of the runner's 62 server scenarios, with 98
fixture implementations including alternates. `bun run conformance:coverage`
checks the installed runner's inventory and reports any unaccounted scenario.
Four scenarios require APIs the local Effect server does not expose:

| Scenario                 | Missing API or behavior                                                                                                                      |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `tasks-mrtr-composition` | Return MRTR input before creating a task, then create the task on the final round. `McpTasks.toolkit` creates tasks before running handlers. |
| `resources-subscribe`    | Stateful resource subscription registration.                                                                                                 |
| `resources-unsubscribe`  | Stateful resource subscription registration.                                                                                                 |
| `server-sse-polling`     | Disconnect and resume POST SSE streams with event replay and `Last-Event-ID`.                                                                |

These scenarios are recorded in `unavailableScenarios` rather than replaced
with fixtures that simulate unsupported Effect behavior.

### Tasks extension coverage

The [6 October alpha.12 recheck](reports/tasks-alpha12-2026-10-06.md) supersedes
the runner-schema failures in the historical results below. Seven scenarios
pass, dispatch retains its invalid-input failure, and notifications is skipped.
The Tasks PR remains a draft until Effect publishes the required APIs.

The [failure investigation](./reports/task-failures-investigation.md) now identifies
the causes with live controls and official schema comparisons. The generic
schema failures and dispatch payload come from the runner. The lifecycle
fixture now uses a task timeout to produce a JSON-RPC fault. All eight lifecycle
behavior checks pass; the generic schema failure remains. See the
[fixed lifecycle run](./reports/tasks-lifecycle-fixed-2026-10-01.json).

Nine independent fixtures exercise `io.modelcontextprotocol/tasks` on the
`2026-07-28` adapter through `McpTasks.toolkit` and `McpTasks.layerMemory`.
The runner needs `--force` when an extension scenario is selected together
with `--spec-version`; the local CLI adds it from scenario metadata.

```sh
bun run conformance:scenario tasks-lifecycle --protocol 2026-07-28 --protocol-case only --verbose
bun run conformance:all --scenario tasks-mrtr-input --timeout 30000
```

The checked-in [run evidence](./reports/conformance-2026-10-01.json) records
individual checks, versions, the local checkout revision, and package hashes.
Detailed runner `checks.json` files remain under `.cache/conformance/`.

| Scenario                       | Behavioral checks                                                                                                                                                           | Other outcome                                                                           |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `tasks-lifecycle`              | Pass after the fixture fix: all eight behavior checks pass using a task timeout to produce the protocol error.                                                              | Generic schema check fails.                                                             |
| `tasks-capability-negotiation` | Pass.                                                                                                                                                                       | Generic schema check fails.                                                             |
| `tasks-wire-fields`            | Pass.                                                                                                                                                                       | Generic schema check fails.                                                             |
| `tasks-request-state-removal`  | Pass.                                                                                                                                                                       | Generic schema check fails.                                                             |
| `tasks-mrtr-input`             | Pass, including partial fulfillment of two concurrent input requests.                                                                                                       | Generic schema check fails.                                                             |
| `tasks-request-headers`        | Pass.                                                                                                                                                                       | Generic schema check fails.                                                             |
| `tasks-dispatch-and-envelope`  | One check fails when the runner sends `inputResponses: { "unknown-key": { "ignored": true } }`. Effect rejects it as invalid method parameters. Other dispatch checks pass. | Generic schema check fails.                                                             |
| `tasks-required-task-error`    | Pass.                                                                                                                                                                       | No schema failure.                                                                      |
| `tasks-status-notifications`   | Upstream skip.                                                                                                                                                              | The runner awaits a `subscriptions/listen` harness rewrite. This is `SKIP`, not `PASS`. |

The generic `wire-schema-valid` check treats task creation responses as
ordinary `CallToolResult` objects and requires `content`. The
[Tasks lifecycle scenario](https://github.com/modelcontextprotocol/conformance/blob/main/src/scenarios/server/tasks/lifecycle.ts)
expects a flat `CreateTaskResult` instead. The failures are consistent with a
runner schema limitation; they remain visible and are not baselined away.

The investigation confirms that the dispatch response violates the official
Tasks schema, while a valid unknown-key response is acknowledged and ignored.
Direct backend defects and a public toolkit timeout both produce failed tasks
correctly. The lifecycle fixture therefore does not establish a task backend
defect. See the linked investigation for the captured requests and controls.

## Add a scenario

Before implementing a fixture, inspect the official scenario's source and
identify its exact server contract: required capability advertisement, request
payload, response shape, notifications, and protocol-version applicability.
Do not invent a plausible server behavior—otherwise a failure cannot tell us
anything useful about Effect.

Then:

1. Create `scenarios/<scenario-name>/` with its own `package.json`,
   `tsconfig.json`, and `src/index.ts`.
2. Start from an existing scenario and compose the shared `server(...)` layer
   with only the capability layers and handlers required by the scenario.
3. The scenario starts its own Effect runtime; `mcp-fixture` only supplies the
   MCP server transport, metadata, and configuration.
4. Add the scenario name to the `scenarios` list in
   [`apps/conformance/src/scenarios.ts`](./apps/conformance/src/scenarios.ts),
   including only the protocol revisions to which the scenario applies.
5. Run `bun run conformance:scenario <scenario-name> --verbose`, then add its
   result to the coverage table above.

The `tools-list` fixture establishes the high-level `Toolkit` shape to follow
for ordinary application tools. The content fixtures use the lower-level
`McpServer.addTool` API intentionally: its `CallToolResult` supports MCP's
text, image, audio, resource, mixed-content, and error result shapes. The
shared fixture is not involved in capability registration.

## CI validation

The `Validate` workflow runs on pull requests, pushes to `main`, and manual runs.
It installs published dependencies with `bun install --frozen-lockfile`, then
checks workspace types, lint, formatting, unit tests, and the CLI build.
A separate job runs `bun run conformance:all --timeout 30000` and uploads its
matrix log and raw checker results, including on failure. No local Effect build
or checkout is used in CI.

Published Effect rc.118 does not export `McpTasks`, so the Tasks draft cannot pass
all checks yet. It must wait for an Effect release containing the Tasks APIs,
and for the upstream conformance fixes to be published and verified. Failures
remain visible and fail CI.
