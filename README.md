# Effect MCP conformance fixtures

This repository is an executable compatibility map for Effect's MCP server.
It runs the official [MCP conformance runner](https://github.com/modelcontextprotocol/conformance)
against small, purpose-built Effect servers so that a pass or failure can be
attributed to one protocol behavior at a time.

It is not a sample application and does not attempt to make one server pass
every scenario. Each conformance scenario gets its own independent server app.
That keeps a tool, resource, prompt, or transport feature from accidentally
making an unrelated scenario pass.

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
    ├── logging-set-level/
    └── ...
```

`apps/conformance` owns orchestration only. It uses Effect CLI and scoped
`ChildProcess` commands to start a selected scenario, wait until its `/mcp`
endpoint responds, run the official checker, and terminate the fixture.

`packages/mcp-fixture` owns only the common HTTP transport and server metadata.
Scenario apps own their capabilities and handlers. This is where each new
conformance behavior belongs.

## Setup

Requirements:

- Bun
- A local checkout of this repository

Install the lockfile-pinned workspace dependencies:

```sh
bun install
```

The Effect version under test is pinned in
[`packages/mcp-fixture/package.json`](./packages/mcp-fixture/package.json).
Record that version together with the conformance runner version whenever you
report a result.

## Use

List the scenarios exposed by the installed conformance runner:

```sh
bun run conformance:list
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

The result is a bordered terminal report with colour-coded statuses (and a
plain-text fallback for redirected output), such as:

```text
scenario | v2025-11-25 | v2025-06-18 | v2025-03-26 | v2024-11-05
ping     | PASS        | PASS        | PASS        | PASS
```

`FAIL` means the conformance runner exited unsuccessfully; `TIMEOUT` means the
cell exceeded the ten-second limit (use `--timeout <milliseconds>` to adjust
it); and `SKIP` means the scenario has not declared support for that protocol.
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

The fixture exposes every adapter available in Effect `4.0.0-rc.110`, from
newest to oldest: `2025-11-25`, `2025-06-18`, `2025-03-26`, and `2024-11-05`.

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

| Scenario                       | Status  | What it establishes / exposes                                      |
| ------------------------------ | ------- | ------------------------------------------------------------------ |
| `server-initialize`            | Passing | Effect's Streamable HTTP server completes MCP initialization.      |
| `logging-set-level`            | Passing | Effect accepts the built-in `logging/setLevel` request.            |
| `ping`                         | Passing | Effect responds to the built-in `ping` request.                    |
| `tools-list`                   | Passing | A scenario-owned Effect tool has a valid MCP definition.           |
| `tools-call-simple-text`       | Passing | Direct MCP tool registration returns text content.                 |
| `tools-call-image`             | Passing | Direct registration encodes image bytes as MCP image content.      |
| `tools-call-audio`             | Passing | Direct registration encodes audio bytes as MCP audio content.      |
| `tools-call-embedded-resource` | Passing | Direct registration returns embedded resources.                    |
| `tools-call-mixed-content`     | Passing | Direct registration returns mixed MCP content blocks.              |
| `tools-call-error`             | Passing | Tool-level errors are represented with `isError: true`.            |
| `tools-call-with-logging`      | Failing | Outbound logging notifications are not received by the client.     |
| `tools-call-with-progress`     | Failing | Tool handlers cannot access the request progress token.            |
| `tools-call-sampling`          | Blocked | Reverse sampling request does not complete over this transport.    |
| `tools-call-elicitation`       | Blocked | Reverse elicitation request does not complete over this transport. |

These are individual scenario results, not a claim that the Effect MCP server
conforms to a whole MCP revision.

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

## What remains

The tool group is now fully represented by individual scenario apps. The next
fixtures should be implemented in narrow groups, following the contracts
published by the conformance runner:

- Resources: list/read text/read binary, URI templates and completion,
  subscriptions, updates, and unsubscribe behavior.
- Prompts and completion: listing prompts, argument handling, embedded content,
  images, and `completion/complete`.
- Version-specific and transport/security coverage: the runner's applicable
  JSON Schema, SSE, DNS-rebinding, and newer-protocol scenarios.

For each group, add one scenario app at a time and preserve a passing run before
moving on. Once all scenarios required by a particular MCP revision have
dedicated fixtures, run the conformance runner's corresponding `--requirements`
set and publish the complete result with the pinned Effect and runner versions.
