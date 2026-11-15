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

The workspace pins published Effect `4.1.4` and conformance
`0.2.0-alpha.12`. Skills fixtures use `McpServer.skill` to register the
extension, its methods, and its resources. Tasks fixtures remain on separate
PR #5.

## Direction

The repository has three deliberate boundaries:

```txt
.
├── apps/
│   ├── cli-app/                # Stack Effect CLI template/reference
│   └── conformance/            # Effect CLI that starts and tests scenarios
├── packages/
│   ├── config-typescript/      # shared TypeScript defaults
│   └── mcp-fixture/            # shared runner configuration and fixture data
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

Each server entrypoint declares its MCP features, builds the HTTP transport with
`McpServer.layerHttp`, and launches the HTTP server with `BunRuntime.runMain`.
The examples share environment settings for the listener, protocol adapters, and origins.
Each scenario ID has a runnable entrypoint. When several checks intentionally
exercise the same server, the entrypoints import the same registration layer.

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

To return to the published baseline, unapply this stacked branch and restore
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
coverage.

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

### Choosing a scenario variant

Start with [tools-list](scenarios/tools-list/src/index.ts). Follow the tool
declaration through its handler, toolkit registration, HTTP route, and Bun
launch. To start that example directly from the repository root, run:

```sh
MCP_HOST=127.0.0.1 MCP_PORT=9009 bun run scenarios/tools-list/src/index.ts
```

The endpoint is `http://127.0.0.1:9009/mcp`. When copying the example into
an application, you can pass a fixed adapter such as `[McpProtocol.v2025_11_25]`
and your allowed origins directly to `McpServer.layerHttp`. Supply the listener
with `BunHttpServer.layer({ hostname: "127.0.0.1", port: 9009 })`. Those
choices replace the two configuration imports from `@repo/mcp-fixture`.

In the table, I is the unsuffixed scenario.

| Family                                 | Variants                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tools-list`                           | [I](scenarios/tools-list/src/index.ts) declare a typed tool with `Tool.make` and `McpServer.toolkit`. [II](scenarios/tools-list-II/src/index.ts) publish JSON Schema with `Tool.dynamic`. [III](scenarios/tools-list-III/src/index.ts) register a typed toolkit with `McpServer.registerToolkit`. [IV](scenarios/tools-list-IV/src/index.ts) supply the MCP descriptor with `registry.addTool`. [V](scenarios/tools-list-V/src/index.ts) compose tools, prompts, and resources with `Layer.mergeAll`. |
| `resources-read-text`                  | [I](scenarios/resources-read-text/src/index.ts) declare a layer with `McpServer.resource`. [II](scenarios/resources-read-text-II/src/index.ts) register during acquisition with `McpServer.registerResource`. [III](scenarios/resources-read-text-III/src/index.ts) construct the read result with `registry.addResource`. [IV](scenarios/resources-read-text-IV/src/index.ts) compose the resource with other capabilities.                                                                          |
| `json-schema-2020-12`                  | [I](scenarios/json-schema-2020-12/src/index.ts) pass the input schema to `McpSchema.Tool` and return a text block. [II](scenarios/json-schema-2020-12-II/src/index.ts) pass the same schema to `Tool.dynamic` and return a typed string.                                                                                                                                                                                                                                                              |
| `http-header-validation`               | [I](scenarios/http-header-validation/src/index.ts) use `Tool.make` with an empty parameter schema. [II](scenarios/http-header-validation-II/src/index.ts) use `registry.addTool` with an explicit text result and a second tool with a parameter header.                                                                                                                                                                                                                                              |
| `http-custom-header-server-validation` | [I](scenarios/http-custom-header-server-validation/src/index.ts) declare `x-mcp-header` in the JSON Schema passed to `Tool.dynamic`. [II](scenarios/http-custom-header-server-validation-II/src/index.ts) supply the annotated descriptor with `registry.addTool`.                                                                                                                                                                                                                                    |
| `completion-complete`                  | [I](scenarios/completion-complete/src/index.ts) declare the completion callback with `McpServer.prompt`. [II](scenarios/completion-complete-II/src/index.ts) register it with `McpServer.registerPrompt`. [III](scenarios/completion-complete-III/src/index.ts) compose the prompt with other capabilities.                                                                                                                                                                                           |
| `prompts-get-with-args`                | [I](scenarios/prompts-get-with-args/src/index.ts) declare both required arguments with `McpServer.prompt`. [II](scenarios/prompts-get-with-args-II/src/index.ts) register the prompt during layer acquisition. [III](scenarios/prompts-get-with-args-III/src/index.ts) compose the prompt with other capabilities.                                                                                                                                                                                    |
| `prompts-get-simple`                   | [I](scenarios/prompts-get-simple/src/index.ts) return a string from `McpServer.prompt`. [II](scenarios/prompts-get-simple-II/src/index.ts) use `McpServer.registerPrompt`. [III](scenarios/prompts-get-simple-III/src/index.ts) construct a `GetPromptResult` with `registry.addPrompt`. [IV](scenarios/prompts-get-simple-IV/src/index.ts) compose prompt, tool, and resource layers.                                                                                                                |
| `prompts-list`                         | [I](scenarios/prompts-list/src/index.ts) declare one prompt layer. [II](scenarios/prompts-list-II/src/index.ts) register three prompts with `McpServer.registerPrompt`. [III](scenarios/prompts-list-III/src/index.ts) supply two descriptors with `registry.addPrompt`. [IV](scenarios/prompts-list-IV/src/index.ts) compose three prompt layers with tools and resources.                                                                                                                           |
| `resources-list`                       | [I](scenarios/resources-list/src/index.ts) declare one resource layer. [II](scenarios/resources-list-II/src/index.ts) register two resources with `McpServer.registerResource`. [III](scenarios/resources-list-III/src/index.ts) supply both descriptors with `registry.addResource`. [IV](scenarios/resources-list-IV/src/index.ts) compose resource layers with tools and prompts.                                                                                                                  |
| `tools-call-simple-text`               | [I](scenarios/tools-call-simple-text/src/index.ts) register an explicit text result and launch the HTTP server in the entrypoint. [II](scenarios/tools-call-simple-text-II/src/index.ts) pass the registration layer to `McpServer.layerHttp` using its `registrations` option. [III](scenarios/tools-call-simple-text-III/src/index.ts) compose the text tool with other capabilities using `Layer.mergeAll`.                                                                                        |
| `server-stateless`                     | [I](scenarios/server-stateless/src/index.ts) add a tool from inside a handler with `registry.addTool`. [II](scenarios/server-stateless-II/src/index.ts) call `McpServer.registerToolkit` from the handler.                                                                                                                                                                                                                                                                                            |

In Effect 4.1.4, a string returned by a resource handler inherits the registered MIME type. A tool with a typed string result can return `structuredContent` on the July 2026 adapter. Use an explicit `CallToolResult` when the example needs a particular MCP content block.

Several notification and multi-round input checks intentionally run the same server. Their alternate entrypoints share the following registrations.

| Alternate implementation                                                                 | Checks sharing the server                                                                     | Effect API or behavior                                                                                      |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| [Interactive tools](scenarios/tools-call-with-progress-II/src/tools.ts)                  | Logging and progress                                                                          | Emit server notifications while a tool call is running. Progress reads the request's progress token.        |
| [Client input tools](scenarios/input-required-result-basic-elicitation-II/src/tools.ts)  | Basic elicitation, sampling, and list-roots                                                   | Use the request context and return `InputRequired` with the requested client method.                        |
| [Request state tools](scenarios/input-required-result-request-state-II/src/tools.ts)     | Request state, multiple input requests, multi-round, and tampered state                       | Return continuations, inspect replies, and validate the signed continuation in the tampered-state case.     |
| [Input validation tools](scenarios/input-required-result-validate-input-II/src/tools.ts) | Missing input response, result type, capability check, extra parameters, and input validation | Inspect client capabilities and use an Effect Schema guard on the returned name before completing the tool. |

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

The full matrix runs server fixtures across their applicable protocol adapters
and 26 client implementation/protocol combinations. Run
`bun run conformance:all --timeout 30000` for current results. The command saves
raw checker output, package versions, and a machine-readable summary under
`.cache/conformance/`.

These are individual scenario results, not a claim that the Effect MCP server
conforms to a whole MCP revision.

## Skills extension coverage

Three independent fixtures exercise SEP-2640 on protocol `2026-07-28`:

- `sep-2640-skills-manifest` checks the manifest resource and frontmatter.
- `sep-2640-skills-enumeration` checks listing, retrieval, file manifests, and caching attributes.
- `sep-2640-skills-directory` checks directory traversal, a nested reference, and invalid directory requests.

Each fixture registers its files with `McpServer.skill`. Effect derives the
extension capabilities, resource metadata, SHA-256 digests, and byte sizes.
Single-page catalogs satisfy the pagination checks; these fixtures do not
exercise multiple pages or the resource and size limits.

Run a fixture with the official checker:

```sh
bun run conformance:all --scenario sep-2640-skills-enumeration --timeout 30000
```

The coverage inventory accounts separately for the nine Tasks fixtures on PR #5.

## Add a scenario

Before implementing a fixture, inspect the official scenario's source and
identify its exact server contract: required capability advertisement, request
payload, response shape, notifications, and protocol-version applicability.
Do not invent a plausible server behavior—otherwise a failure cannot tell us
anything useful about Effect.

Then:

1. Create `scenarios/<scenario-name>/` with its own `package.json`,
   `tsconfig.json`, and `src/index.ts`.
2. Build the transport with `McpServer.layerHttp` and provide it to the
   scenario’s capability layers.
3. Serve the router with `HttpRouter.serve`, provide the Bun listener, and
   launch the assembled layer with `Layer.launch` and `BunRuntime.runMain`.
4. Add the scenario name to the `scenarios` list in
   [`apps/conformance/src/scenarios.ts`](./apps/conformance/src/scenarios.ts),
   including only the protocol revisions to which the scenario applies.
5. Run `bun run conformance:scenario <scenario-name> --verbose`, then add its
   result to the coverage table above.

The `tools-list` fixture establishes the high-level `Toolkit` shape to follow
for ordinary application tools. The content fixtures use the lower-level
`McpServer.addTool` API intentionally: its `CallToolResult` supports MCP's
text, image, audio, resource, and mixed-content results. The
[tool error fixture](scenarios/tools-call-error/src/index.ts) uses a declared
toolkit failure and lets Effect map its message into the MCP error result.

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

The published Effect server cannot represent `resources-subscribe`,
`resources-unsubscribe`, or `server-sse-polling` truthfully over `layerHttp`.
The optional `io.modelcontextprotocol/tasks` scenarios remain outside this
workspace until Open Effect implements that extension.
