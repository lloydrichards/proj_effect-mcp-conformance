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
it); and `SKIP` means the scenario requires a capability absent from that
adapter. The local applicability matrix is derived from the actual Effect
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

The fixture exposes every adapter available in Effect `4.0.0-rc.112`, from
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
| `server-session-lifecycle`     | Blocked | RC.112 does not return an `Mcp-Session-Id`; checks are skipped.    |
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
| `json-schema-2020-12`          | Blocked | RC.112 loses the stateful session before schema checks begin.      |
| `elicitation-sep1034-defaults` | Blocked | RC.112 loses the stateful session before default checks begin.     |
| `elicitation-sep1330-enums`    | Blocked | RC.112 loses the stateful session before enum checks begin.        |

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

### New coverage in conformance `0.2.0-alpha.11`

The alpha runner adds a `2026-07-28` requirement set and scenarios that are
absent from stable `0.1.16`. The new coverage includes stateless server
lifecycle, caching, HTTP header validation, resource-not-found behavior, and
input-required/MRTR flows. It also adds `server-session-lifecycle` for the
existing stateful protocol revisions.

The stacked local-Effect branch supplies the `v2026_07_28` adapter and adds an
independent fixture for every new required July server scenario. Its focused
results are:

| Scenario group                         | Result                  |
| -------------------------------------- | ----------------------- |
| `caching`                              | 8/8 passing             |
| `server-sse-multiple-streams`          | 1/1 passing             |
| `dns-rebinding-protection`             | 2/2 passing             |
| `sep-2164-resource-not-found`          | 4/4 passing             |
| `input-required-result-*`              | 14/14 scenarios passing |
| `http-header-validation`               | 14/14 passing           |
| `http-custom-header-server-validation` | 10/10 passing           |
| `server-stateless`                     | 29/29 passing           |

The local Open Effect implementation passes every required July scenario in
this workspace. These fixtures now cover prompt-based multi-round trips,
tampered request-state rejection, partial Base64 wrapper handling, stateless
metadata errors, removed methods, capability-to-handler consistency, and
resource-not-found error data.

### Still unsupported

The published RC cannot represent `resources-subscribe`,
`resources-unsubscribe`, or `server-sse-polling` truthfully over `layerHttp`.
The optional `io.modelcontextprotocol/tasks` scenarios remain outside this
workspace until Open Effect implements that extension.
