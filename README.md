# Effect MCP conformance fixtures

This repository is an executable compatibility map for Effect's MCP server and client.
It runs the official [MCP conformance runner](https://github.com/modelcontextprotocol/conformance)
against small, purpose-built Effect fixtures so that a pass or failure can be
attributed to one protocol behavior at a time.

It is not a sample application. Each conformance scenario has an independent
server or client app that remains the causal baseline. Suffixed variants such as
`tools-list-II` deliberately implement the same contract through a different
Effect API or runtime path. That lets the same upstream check probe more than
one implementation without changing its official scenario name.

## Published baseline

The baseline PR uses published Effect `4.0.6` and conformance
`0.2.0-alpha.12`. All 275 core server adapter checks pass. Client, Skills, and
Tasks fixtures are reviewed in separate stacked PRs. Tasks remains a draft
because the published package does not export `McpTasks`.

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
    ├── client-tools-call/      # independent MCP client workload
    ├── client-tools-call-II/   # Layer variant
    ├── client-tools-call-III/  # toolkit variant
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
protocols. Every server row launches its matching `scenarios/<name>/src/index.ts`.
[`apps/conformance/src/matrix/scenarios.ts`](./apps/conformance/src/matrix/scenarios.ts)
combines those server definitions with the client definitions. Each matrix row
records its direction, upstream name, entrypoint, and applicable protocols.

## Setup

### Install workspace dependencies

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

### Test the MCP client

Run the client matrix against the published Effect dependency:

```sh
bun run conformance:client
```

Use `bun run effect:local` first only when testing a sibling Effect checkout.

To run one scenario:

```sh
bun run conformance:client http-custom-headers
```

To select one implementation as well:

```sh
bun run conformance:client http-custom-headers layer
bun run conformance:client tools_call toolkit

# Select an independent entrypoint by its folder name.
bun run conformance:client client-http-standard-headers-II
bun run conformance:client client-tools-call-III
```

The command builds each selected entrypoint into its own Bun bundle and
launches it against the official runner's HTTP test servers. Eight scenarios
have 26 applicable implementation/protocol combinations across
`2025-11-25` and `2026-07-28`:

| Implementation | Public API path                                                      | Combinations |
| -------------- | -------------------------------------------------------------------- | ------------ |
| `direct`       | Scoped `McpClient.http` and `McpClient.make`, list/call methods      | 10           |
| `layer`        | `McpClient.layerHttp`, concurrent tool, prompt, and resource probes  | 10           |
| `toolkit`      | `McpClient.toolkit` with prefixed tool names and model-tool dispatch | 6            |

Each independent entrypoint lives in `scenarios/client-*/src/index.ts`, with
its own workspace package. The unsuffixed fixture uses direct constructors,
`-II` uses Layers, and `-III` uses toolkit dispatch where applicable. These
20 apps preserve the eight official scenarios and 26 protocol combinations.
[`apps/conformance/src/matrix/scenarios.ts`](./apps/conformance/src/matrix/scenarios.ts) maps each local
name to the exact upstream scenario and its supported protocols. Shared runner
configuration lives in `packages/mcp-fixture/src/client.ts`. Discovery returns complete arrays, and prompt retrieval uses
a discovered prompt definition. The standard-header scenario exercises tool
calls, resource reads, and prompt retrieval. The toolkit variant checks tool
calls, JSON Schema preservation, and custom parameter headers.

The reduced client exposes tools, prompts, and resources. Elicitation defaults,
MRTR request state, generic requests, and discovery streams are no longer in
this matrix because their public client APIs were removed. Unsupported
selections fail explicitly.

Each run saves the bundle, build log, environment metadata, runner logs,
raw checks, and `summary.json` under `.cache/conformance/<timestamp>-client/`.
Client process errors and missing checker output fail the run even when
observed checks pass. OAuth, automatic SSE retries, skills extensions,
resource templates, and older protocol revisions are outside this fixture's
coverage. See [the published dependency results](reports/dependency-update-2026-10-27.md)
and [the earlier reduced client results](reports/client-conformance-core-2026-10-08.md).

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

Run the matrices through the same CLI and table renderer:

| Command                      | Rows                                   |
| ---------------------------- | -------------------------------------- |
| `bun run conformance:all`    | Every server and client implementation |
| `bun run conformance:server` | Server implementations only            |
| `bun run conformance:client` | Client implementations only            |

Server cells start an isolated Effect server with one configured adapter.
Client cells launch the selected Effect client against the official runner's
HTTP server. Each implementation has its own row, including suffixed variants.

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

`PASS` requires a successful process and at least one successful check, with
no failed checks. `FAIL` includes process errors, failed checks, and missing or
invalid checker output. `TIMEOUT` means the cell exceeded the default 30-second
limit; use `--timeout <milliseconds>` to adjust it. `SKIP` means the runner
skipped every behavioral check. `--` marks an inapplicable protocol and does
not contribute to the summary total.

All three commands save logs, raw checks, environment metadata, and a structured
summary under `.cache/conformance/<timestamp>-<all|client|server>/`.
For a fast local check, limit the matrix to one scenario:

```sh
bun run conformance:all --scenario ping
```

Pass `--verbose` through to the conformance runner when diagnosing a failure:

```sh
bun run conformance:scenario ping --verbose
```

### Protocol selection

Legacy server runs perform an explicit `initialize` probe before the conformance
runner starts. Modern server runs select the stateless protocol directly. It reports the protocol offered by the probe, the ordered
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

The fixture binds to `127.0.0.1` on an OS-assigned port. The CLI reads the
actual listening address before starting the checker or Inspector, then shuts
the fixture down when the command ends. To make the port stable for local inspection, set `MCP_PORT`:

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
