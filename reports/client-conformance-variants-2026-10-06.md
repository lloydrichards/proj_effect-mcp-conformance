# Alternative MCP client implementations

All 29 applicable implementation/protocol combinations pass against
conformance `0.2.0-alpha.12` using the installed local Effect client build.
The original twelve combinations remain part of every full run. Bundle hashes,
raw check counts, warnings, and result locations are saved in
[the machine-readable results](client-conformance-variants-2026-10-06.json).

## What the alternatives exercise

| Implementation      | Difference from the original                                                                                                                                                                                  | Applicable combinations |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `layer-streams`     | Constructs client and transport Layers; obtains the service through `McpClient.McpClient`; discovers tools, resources, and prompts through streams; runs standard/custom-header tool calls with concurrency 2 | 11                      |
| `requests`          | Uses generic `requestOnce` calls and explicitly decodes results with public schemas; echoes discovered input schemas through the generic request path                                                         | 5                       |
| `interleaved-input` | Captures the active connection in a deferred value; the elicitation handler calls an unrelated tool before answering; tests continuation state isolation while the outer operation is pending                 | 1                       |

Each implementation has its own entrypoint and bundle. The alternatives share
runner configuration and the custom-header context schema; they do not delegate
their workload to the original fixture. Their scenario selection lives in
`scripts/run-client-conformance.mjs`.

## Coverage limits

The request variant excludes modern HTTP tool invocation because `requestOnce`
cannot supply the discovered tool definition required by the transport. Initial
attempts failed locally before sending a tool call with that exact API error.
This is an intentional public API boundary, not evidence of malformed requests
from the production client. The variant still covers legacy tool calls and
schema preservation, initialization, modern discovery metadata, and external
schema-reference handling.

The Layer/stream variant exercises the public pagination interface. These
official mocks do not establish multi-page behavior. Concurrent header probes
exercise independent calls, but they are not a stress or load test.

The interleaved variant performs unrelated calls during both continuation
flows, while the original performs them between completed operations. The
official runner observes byte-exact state echo, fresh request IDs, omission
of absent state, unrelated-call isolation, and the default complete result type.

All variants use the public Effect client and HTTP transport. This matrix does
not cover OAuth, automatic SSE retries, skills extensions, stdio, or older
revisions. The original failure report and successful fix recheck remain saved
separately; this run does not overwrite them.

## Run the variants

Rebuild the local Effect packages after changing their source:

```sh
bun run effect:local
bun run conformance:client
```

Run all implementations of one scenario, or select a single implementation:

```sh
bun run conformance:client http-custom-headers
bun run conformance:client http-custom-headers layer-streams
bun run conformance:client sep-2322-client-request-state interleaved-input
```

Every run saves separate bundles and logs for each implementation under
`.cache/client-conformance/`. Unsupported selections and client process errors
fail the command. The fixture type check, repository lint, changed-code
formatting checks, and `git diff --check` pass. No Effect production files
changed while adding these alternatives.

The variants preserve the official contracts previously read from runner source
at [`f44482ba17df816d3176962a11cdf36aec9bda00`](https://github.com/modelcontextprotocol/conformance/tree/f44482ba17df816d3176962a11cdf36aec9bda00/src/scenarios/client),
including schema echo payloads and the exact MRTR tool names. The passing
results qualify the observed paths rather than all possible application designs.
