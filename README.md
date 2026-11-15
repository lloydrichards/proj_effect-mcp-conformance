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

Scenario apps own their MCP declarations and handlers. The shared fixture
configures the HTTP transport and provides a Bun launcher for the alternates.
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

### Compare the five tools-list implementations

Each ID runs the same upstream discovery check. Open the entrypoint to see
how the server advertises `test_tool` with an optional string input.

| Scenario                                                | Effect API                                       | What to look for                                                                                                                               |
| ------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| [tools-list](scenarios/tools-list/src/index.ts)         | `Tool.make` and `McpServer.toolkit`              | Define parameters with Effect Schema and provide the toolkit's handler layer. Start here for an application tool.                              |
| [tools-list-II](scenarios/tools-list-II/src/index.ts)   | `Tool.dynamic`                                   | Advertise an existing JSON Schema through a toolkit. With raw JSON Schema the handler receives unknown input. This handler needs no arguments. |
| [tools-list-III](scenarios/tools-list-III/src/index.ts) | `McpServer.registerToolkit`                      | Register the typed toolkit as an Effect during layer acquisition.                                                                              |
| [tools-list-IV](scenarios/tools-list-IV/src/index.ts)   | `McpServer.McpServer.use` and `registry.addTool` | Supply the MCP tool descriptor and construct its returned text block explicitly.                                                               |
| [tools-list-V](scenarios/tools-list-V/src/index.ts)     | `Layer.mergeAll`                                 | Compose toolkit discovery with an explicitly registered text tool, prompts, and resources in one server.                                       |

### Compare the four resources-read-text implementations

All four serve `test://static-text`. With Effect 4.1.4, a public resource
handler can return a string. Effect copies the registered MIME type into
`contents[0].mimeType` in the `resources/read` response.

| Scenario                                                                  | Effect API                   | What to look for                                                                                                    |
| ------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| [resources-read-text](scenarios/resources-read-text/src/index.ts)         | `McpServer.resource`         | Declare a resource layer with `mimeType: "text/plain"` and a string content handler.                                |
| [resources-read-text-II](scenarios/resources-read-text-II/src/index.ts)   | `McpServer.registerResource` | Register the same resource as an Effect during layer acquisition.                                                   |
| [resources-read-text-III](scenarios/resources-read-text-III/src/index.ts) | `registry.addResource`       | Supply an MCP resource descriptor and construct the read result explicitly, including the content item’s MIME type. |
| [resources-read-text-IV](scenarios/resources-read-text-IV/src/index.ts)   | `Layer.mergeAll`             | Serve the text resource alongside another resource, prompts, and tools in one MCP server.                           |

### Compare the two JSON Schema 2020-12 implementations

The [registry fixture](scenarios/json-schema-2020-12/src/index.ts) supplies
`inputSchema` to `McpSchema.Tool` and returns an explicit `CallToolResult`.
The [toolkit fixture](scenarios/json-schema-2020-12-II/src/index.ts) passes
the same JSON Schema to `Tool.dynamic` as `parameters` and returns a
`Schema.String` success value. With raw JSON Schema, the dynamic handler
receives unknown input. This fixture demonstrates schema discovery.

Both adapters advertised the complete input schema unchanged, including
`$defs`, `$anchor`, `$ref`, the conditionals, and `additionalProperties: false`.
The toolkit also advertised default tool annotations on both adapters.

| Protocol     | Registry call result    | Toolkit discovery and call result                                                                                                                                                 |
| ------------ | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `2025-11-25` | One unquoted text block | The same text block plus `isError: false`. Discovery omitted `outputSchema`.                                                                                                      |
| `2026-07-28` | One unquoted text block | Discovery added `outputSchema: { "type": "string" }`. The call returned the original string in `structuredContent`, a JSON-quoted string in the text block, and `isError: false`. |

Both July responses included `resultType: "complete"`.
[Captured tools/list and tools/call results](reports/json-schema-2020-12-effect-4.1.4.json)

### Compare the two HTTP header validation implementations

The [standard fixture](scenarios/http-header-validation/src/index.ts) uses
`Tool.make` with `Tool.EmptyParams` and returns a string. The
[registry fixture](scenarios/http-header-validation-II/src/index.ts) constructs
its own text result and registers a second tool whose `message` parameter
declares `x-mcp-header`. Both run the same standard-header scenario on the
`2026-07-28` adapter. Neither handler reads HTTP headers.

| Request                                                              | Observed response                                                                                                                                               |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lowercase or uppercase method header name on `tools/list`            | HTTP 200 with the tool listing.                                                                                                                                 |
| Matching `Mcp-Name` on `tools/call`, including surrounding spaces    | HTTP 200. The typed tool returned `Headers accepted` as structured content and JSON-quoted text. The registry tool returned a plain text block.                 |
| Missing or mismatched `Mcp-Method`, including the value `TOOLS/LIST` | HTTP 400 with JSON-RPC error `-32020` identifying the method mismatch.                                                                                          |
| Missing or mismatched `Mcp-Name` on `tools/call`                     | HTTP 400 with `-32020` identifying the name mismatch.                                                                                                           |
| Custom tool on variant II with body argument `message: "hello"`      | Matching `Mcp-Param-message: hello` returned HTTP 200 and text `hello`. An omitted or different value returned HTTP 400 with `-32020` identifying the argument. |

[Captured request headers, HTTP statuses, and JSON-RPC responses](reports/http-header-validation-effect-4.1.4.json)

### Compare the two custom parameter header implementations

Both IDs advertise a required string named `message` with
`"x-mcp-header": "message"`. The `2026-07-28` adapter compares
`Mcp-Param-message` with the body argument before the handler runs.

- [http-custom-header-server-validation](scenarios/http-custom-header-server-validation/src/index.ts) uses `Tool.dynamic` to publish the annotated JSON Schema. Its toolkit handler decodes the arguments with Effect Schema and returns the message as a string.
- [http-custom-header-server-validation-II](scenarios/http-custom-header-server-validation-II/src/index.ts) uses `registry.addTool` and returns an explicit MCP text block.

For a body value of `Hello`, both fixtures accepted the plain header `Hello`
and the wrapped value `=?base64?SGVsbG8=?=`. An unwrapped `SGVsbG8=` or a
wrapper missing its suffix was compared literally. A missing header, a plain
or decoded mismatch, and invalid Base64 padding or characters all returned
HTTP 400 with JSON-RPC error `-32020`. Successful toolkit calls included the
original string in `structuredContent` and JSON-quoted text in `content`.
The registry handler returned the original text directly in `content`.

[Captured discovery and custom-header responses](reports/http-custom-header-server-validation-effect-4.1.4.json)

### Compare the three completion implementations

Each fixture completes `arg1` on `test_prompt_with_arguments`. The callback
receives the partial value and returns matching suggestions in declaration
order. Effect encodes the completion values and supplies the count.

| Scenario                                                                  | Effect API                 | What to look for                                                                              |
| ------------------------------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------- |
| [completion-complete](scenarios/completion-complete/src/index.ts)         | `McpServer.prompt`         | Declare the prompt and its argument completion together as a layer.                           |
| [completion-complete-II](scenarios/completion-complete-II/src/index.ts)   | `McpServer.registerPrompt` | Run the prompt registration as an Effect during layer acquisition.                            |
| [completion-complete-III](scenarios/completion-complete-III/src/index.ts) | `Layer.mergeAll`           | Compose the completion-enabled prompt with other prompts, tools, and resources on one server. |

On all five adapters, `test` returned `["test", "test-report"]`, `test-r`
returned `["test-report"]`, and `xyz` returned `[]`. Each response contained
the corresponding `total` and `hasMore: false`.
[Captured completion responses](reports/completion-complete-effect-4.1.4.json)

### Compare the three parameterized prompt implementations

| Scenario                                                                      | Effect API                 | What to look for                                                                 |
| ----------------------------------------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------- |
| [prompts-get-with-args](scenarios/prompts-get-with-args/src/index.ts)         | `McpServer.prompt`         | Declare the two required string parameters and their content handler as a layer. |
| [prompts-get-with-args-II](scenarios/prompts-get-with-args-II/src/index.ts)   | `McpServer.registerPrompt` | Register the same prompt during layer acquisition with `Layer.effectDiscard`.    |
| [prompts-get-with-args-III](scenarios/prompts-get-with-args-III/src/index.ts) | `Layer.mergeAll`           | Compose the parameterized prompt with other prompts, tools, and resources.       |

On all five adapters, `prompts/list` advertised `test_prompt_with_arguments`
with `required: true` on both `arg1` and `arg2`. Passing `hello` and `world`
to `prompts/get` returned one user text message,
`Prompt with arguments: arg1='hello', arg2='world'`. Omitting either argument
returned JSON-RPC error `-32602` with the missing key’s name.
[Captured discovery, successful retrieval, and missing-argument responses](reports/prompts-get-with-args-effect-4.1.4.json)

### Compare the four simple prompt implementations

Each fixture serves `test_simple_prompt` with the description `A simple prompt.`.
The registration API determines how discovery represents a prompt with no arguments.

| Scenario                                                                | Effect API                                                               | What `prompts/list` advertises                                                                      |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| [prompts-get-simple](scenarios/prompts-get-simple/src/index.ts)         | `McpServer.prompt` declares a layer with a string content handler.       | Only the simple prompt, with `arguments: []`.                                                       |
| [prompts-get-simple-II](scenarios/prompts-get-simple-II/src/index.ts)   | `McpServer.registerPrompt` runs during layer acquisition.                | Only the simple prompt, with `arguments: []`.                                                       |
| [prompts-get-simple-III](scenarios/prompts-get-simple-III/src/index.ts) | `registry.addPrompt` takes an explicit descriptor and `GetPromptResult`. | Only the simple prompt. Its descriptor omits `arguments`.                                           |
| [prompts-get-simple-IV](scenarios/prompts-get-simple-IV/src/index.ts)   | `Layer.mergeAll` composes the prompt with other capabilities.            | The simple prompt with `arguments: []`, plus `test-listed-prompt` and `test_prompt_with_arguments`. |

Across all five adapters, calling `prompts/get` with just the prompt name
returned one `user` message with content type `text` and the exact text
`This is a simple prompt for testing.`
[Captured discovery and retrieval responses](reports/prompts-get-simple-effect-4.1.4.json)

### Compare the four prompt discovery implementations

The prompt descriptors matched across all five adapters for each fixture.

| Scenario                                                    | Effect API                                                                 | Names returned by `prompts/list`                                         |
| ----------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| [prompts-list](scenarios/prompts-list/src/index.ts)         | `McpServer.prompt` declares one layer.                                     | `test-listed-prompt`                                                     |
| [prompts-list-II](scenarios/prompts-list-II/src/index.ts)   | `McpServer.registerPrompt` registers each prompt during layer acquisition. | `test-listed-prompt`, `test_simple_prompt`, `test_prompt_with_arguments` |
| [prompts-list-III](scenarios/prompts-list-III/src/index.ts) | `registry.addPrompt` takes explicit `McpSchema.Prompt` descriptors.        | `test-listed-prompt`, `test_simple_prompt`                               |
| [prompts-list-IV](scenarios/prompts-list-IV/src/index.ts)   | `Layer.mergeAll` composes prompt layers with tools and resources.          | `test-listed-prompt`, `test_simple_prompt`, `test_prompt_with_arguments` |

The descriptions for `test-listed-prompt` and `test_simple_prompt` were
`A prompt used to verify prompt discovery.` and `A simple prompt.`
respectively. Both take no arguments. Variant III omitted the optional
`arguments` field on its descriptors. The other registrations emitted `[]`
for parameterless prompts.

Variant II described `test_prompt_with_arguments` as `A prompt with required arguments.`.
Variant IV used `A prompt with completions.`. Both advertised `arg1` with
`required: true` and `arg2` with `required: false`.
[Captured prompt catalogs](reports/prompts-list-effect-4.1.4.json)

### Compare the four resource discovery implementations

| Scenario                                                        | Effect API                                                                     | Names returned by `resources/list`, in order |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------- |
| [resources-list](scenarios/resources-list/src/index.ts)         | `McpServer.resource` declares a single resource layer.                         | `listed-resource`                            |
| [resources-list-II](scenarios/resources-list-II/src/index.ts)   | `McpServer.registerResource` registers each resource during layer acquisition. | `listed-resource`, `static-text`             |
| [resources-list-III](scenarios/resources-list-III/src/index.ts) | `registry.addResource` takes explicit `McpSchema.Resource` descriptors.        | `listed-resource`, `static-text`             |
| [resources-list-IV](scenarios/resources-list-IV/src/index.ts)   | `Layer.mergeAll` composes resource layers with prompts and tools.              | `listed-resource`, `static-text`             |

On all five adapters, `test://listed-resource` advertised the description
`A resource used to verify resource discovery.` and `test://static-text`
advertised `A static text resource.`. Both advertised `mimeType: "text/plain"`.
The public resource helpers emitted `annotations: {}`. Variant III omitted
the optional field on its explicit descriptors.
[Captured resource catalogs](reports/resources-list-effect-4.1.4.json)

### Compare the three simple-text tool implementations

| ID                                                                              | How `test_simple_text` is registered                                                                                                                         |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [tools-call-simple-text](scenarios/tools-call-simple-text/src/index.ts)         | A feature layer calls `registry.addTool` and supplies an explicit `CallToolResult`. This entrypoint includes the full HTTP launch sequence.                  |
| [tools-call-simple-text-II](scenarios/tools-call-simple-text-II/src/index.ts)   | The fixture passes its registration layer to `McpServer.layerHttp` through the shared server's `registrations` option. The HTTP endpoint acquires the layer. |
| [tools-call-simple-text-III](scenarios/tools-call-simple-text-III/src/index.ts) | `Layer.mergeAll` composes the explicit text-tool registration with a typed discovery tool, prompts, and resources.                                           |

All three use an explicit MCP result for this tool. On each of the five adapters,
`tools/call` returned one text item containing exactly
`This is a simple text response for testing.`, without quotation marks or a
`structuredContent` field. The July 2026 adapter also supplied
`resultType: "complete"` and server metadata. For a comparison with a
`Schema.String` toolkit success value, see the JSON Schema family above.
[Captured simple-text calls](reports/tools-call-simple-text-effect-4.1.4.json)

### Compare the stateless and multi-round implementations

Both stateless servers advertise a trigger tool. Calling it adds
`dynamic_test_tool` to the next listing. The [baseline](scenarios/server-stateless/src/index.ts)
adds the tool with `registry.addTool` and returns a text block. The
[alternate](scenarios/server-stateless-II/src/index.ts) calls
`McpServer.registerToolkit` inside the trigger handler. Calling its new tool
returns `Dynamic tool called` as structured content plus JSON-quoted text.

The stateful notification and multi-round input families each have a focused
baseline for every check. Several `-II` IDs run the same composition so the
checker sees those tools together. Each row below links directly to the
registration used by its alternate entrypoints.

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
2. Start from an existing scenario and compose the shared `server(...)` layer
   with only the capability layers and handlers required by the scenario.
3. Launch the assembled layer with `runHttpScenario`, or keep the server setup
   in the entrypoint when the transport itself is under test.
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
