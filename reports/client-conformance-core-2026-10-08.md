# Reduced MCP client conformance, 8 October 2026

All 26 applicable combinations passed, with 177 successful checks and no failures.
The run used locally packed Effect 4.0.1 from the sibling `open_effect` checkout,
conformance 0.2.0-alpha.12, and Bun 1.4.0. This is local-source evidence,
including uncommitted changes, and does not establish published-package behavior.

## Matrix

| Implementation                  | Combinations | Result |
| ------------------------------- | ------------ | ------ |
| Direct scoped constructors      | 10           | PASS   |
| Layers with concurrent probes   | 10           | PASS   |
| Prefixed model toolkit dispatch | 6            | PASS   |

Eight official scenarios cover initialization, tool invocation, JSON Schema
2020-12 preservation, request metadata, standard HTTP headers, custom parameter
headers, invalid header-definition filtering, and retained JSON Schema references.
The matrix uses `2025-11-25` and `2026-07-28` where each scenario applies.
Standard-header probes also list and read resources and list and retrieve prompts.
Initialization checks are skipped by that modern header scenario because the
modern client uses `server/discover`; the separate legacy initialization scenario
passes. Skipped checks do not contribute to the success count.

## Fixture changes

Transport constructors and Layers now come from `McpClient`. Discovery returns
arrays, and `getPrompt` receives a discovered prompt. The Layer variant runs
independent header probes concurrently. The toolkit variant invokes prefixed
model tools and echoes the schema exposed by `Tool.getJsonSchema`.

The removed generic request, discovery stream, elicitation, and interleaved MRTR
variants required APIs that the reduced client no longer exposes. Their old
results remain historical evidence. Unsupported selections still fail.

Missing checker output now produces a failed matrix row instead of crashing the
report collector. Environment evidence includes the installed client source hash
and each fixture bundle hash. Packed package hashes are in the checked-in JSON.

## Validation and reproduction

```sh
bun run effect:local
bun run conformance:client
bun run type-check
bun run lint
bun run format:check
bun run test
```

Workspace type-checking, lint, formatting, and all nine unit tests passed.
The first client run had two failing combinations because its packed build lacked
prompt and resource `Mcp-Name` headers. The source already included those headers
when investigated. Rebuilding the local packages and rerunning the entire matrix
produced the result above. No sibling Effect source was edited in this task.

[Structured results](client-conformance-core-2026-10-08.json) retain each row and
its raw checker directory under `.cache/client-conformance/2026-10-08T13-48-22.120Z/`.
This matrix does not cover resource templates, pagination edge cases, prompt
arguments, binary resource conversion, stdio, OAuth, SSE resumption, or removed
client capabilities.
