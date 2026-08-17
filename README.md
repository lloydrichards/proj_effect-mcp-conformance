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
```

Pass `--verbose` through to the conformance runner when diagnosing a failure:

```sh
bun run conformance:scenario ping --verbose
```

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

| Scenario            | Status  | What it establishes                                           |
| ------------------- | ------- | ------------------------------------------------------------- |
| `server-initialize` | Passing | Effect's Streamable HTTP server completes MCP initialization. |
| `logging-set-level` | Passing | Effect accepts the built-in `logging/setLevel` request.       |
| `ping`              | Passing | Effect responds to the built-in `ping` request.               |

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
2. Start from an existing scenario and call `runScenarioServer("<scenario-name>")`.
3. Add only the capability layer and handlers required by that scenario.
4. Add the scenario name to the `scenarios` list in
   [`apps/conformance/src/commands/run.ts`](./apps/conformance/src/commands/run.ts).
5. Run `bun run conformance:scenario <scenario-name> --verbose`, then add its
   result to the coverage table above.

## What remains

The implemented scenarios only cover server behaviors that Effect currently
provides without registering application capabilities. The next fixtures should
be implemented in narrow groups, following the contracts published by the
conformance runner:

- Tool discovery and calls: `tools-list`, simple text, mixed content, errors,
  logging, progress, and client-mediated features such as sampling and
  elicitation.
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
