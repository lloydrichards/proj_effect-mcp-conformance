# Initial MCP client conformance results

Ten of twelve scenario/protocol combinations pass with conformance
`0.2.0-alpha.12`, Bun `1.4.0`, and the locally built Effect `4.0.0-rc.118`
client. Two failures identify follow-up work or policy decisions. This is
HTTP client qualification, not a claim of complete MCP conformance.

The local build came from the sibling `open_effect` checkout at
`b406726e57c7ec7e6f406fc25422d6887e4bac67`, which contains the
`codex/feat-mcp-client` feature. No Effect implementation files changed during
this investigation. The fixture bundle hash, warning checks, failure details,
and raw-result paths are recorded in
[the saved results](client-conformance-2026-10-06.json).

| Scenario                            | 2025-11-25     | 2026-07-28     |
| ----------------------------------- | -------------- | -------------- |
| initialize                          | PASS           | Not applicable |
| tools_call                          | PASS           | PASS           |
| elicitation-sep1034-client-defaults | FAIL           | Not applicable |
| json-schema-2020-12-preservation    | PASS           | PASS           |
| request-metadata                    | Not applicable | FAIL           |
| sep-2322-client-request-state       | Not applicable | PASS           |
| http-standard-headers               | Not applicable | PASS           |
| http-custom-headers                 | Not applicable | PASS           |
| http-invalid-tool-headers           | Not applicable | PASS           |
| json-schema-ref-no-deref            | Not applicable | PASS           |

## Elicitation does not apply defaults

The fixture accepts the form with an empty `ElicitAcceptResult.content`.
The official scenario expects omitted string, integer, number, enum, and
boolean fields to take their JSON Schema defaults. All five checks fail with
the corresponding field missing. The client process completes successfully;
this is a behavioral failure rather than a startup or transport timeout.

This peer sends reverse requests over the legacy standalone GET stream.
The fixture explicitly consumes `client.subscribe({})` to open that stream.
Without the subscription, the tool call timed out. Review whether configured
input handlers should open that channel automatically, and whether default
application belongs to the client or an application form helper. The current
conformance fixture does not fill defaults itself.

## Version rejection stops the metadata flow

The runner deliberately rejects the first request with JSON-RPC `-32022`,
`Unsupported protocol version`, and advertises `2026-07-28` as supported.
The client exits with a typed error instead of retrying. Five observed
metadata checks pass, roots and sampling capability checks are skipped because
those handlers are absent, and the retry check remains a warning. The runner
correctly fails the overall scenario because the client exits with code 1.

The current client requires an explicit adapter and excludes automatic retries.
Decide whether to support a bounded retry for this version-rejection response
or document the narrower contract. This scenario alone does not justify
general transport retries. Its mock rejects even a request already using the
version it advertises as supported.

## Reproduce the results

```sh
bun run effect:local
bun run conformance:client
```

For a focused rerun:

```sh
bun run conformance:client elicitation-sep1034-client-defaults
```

The runner builds a Bun bundle from the public Effect client fixture, runs
each scenario sequentially, and preserves process errors alongside wire
checks. It uses no alternate SDK client, raw-fetch protocol implementation,
patched runner, or expected-failure baseline. OAuth, SSE reconnection retries,
skills extensions, stdio transport, and older revisions are not covered.

The fixture type check, repository lint, formatting checks for changed code,
and `git diff --check` pass. The conformance command exits 1 for the two
recorded failures.

Fixture contracts were read from the installed runner's README and official
source at its published commit
[`f44482ba17df816d3176962a11cdf36aec9bda00`](https://github.com/modelcontextprotocol/conformance/tree/f44482ba17df816d3176962a11cdf36aec9bda00/src/scenarios/client).

## Follow-up implementation and verification

All twelve combinations pass after the agreed client fixes and fixture corrections.
The initial results above remain the record of the original investigation. The
`followUp` entry in the saved JSON records the new bundle hash, source hashes,
checks, and raw-result paths. Effect HEAD remains
`b406726e57c7ec7e6f406fc25422d6887e4bac67`; these fixes are uncommitted.

`McpClient.getElicitationFormDefaults(requestedSchema)` returns suggested starting
values for all supported form fields, including multi-select enums. It preserves
falsy values and copies arrays. Applications own user review and acceptance; the
client does not fill omitted fields in accepted responses or validate submissions
through this helper. The fixture's form handler uses the helper generically.

Legacy clients now share one scoped GET listener between configured reverse
handlers and notification subscriptions. Startup follows initialization. HTTP
405 leaves POST response-stream handling available without GET retries; other
listener failures close the client connection. The fixture installs legacy form
handlers only for the elicitation scenario, whose peer actually requests input.
The earlier empty-subscription workaround is removed.

Initial modern discovery retries once after a validated protocol-version
rejection whose requested version matches the selected adapter and whose supported
list includes it. The retry uses a fresh request ID within the original deadline.
Later discovery calls and ordinary operations do not gain automatic retries. The
metadata fixture uses a public discovery request after construction because that
scenario's peer advertises no tools.

Validation passed:

- 158 focused tests across the four Effect client test files.
- `pnpm lint-fix`, `pnpm lint`, `pnpm check`, and `pnpm jsdocs --check`.
- `bun run effect:local`, both affected scenario reruns, and the twelve-cell matrix.
- Fixture type checking and conformance repository lint.
- `git diff --check` in both repositories.

The final raw run is
`.cache/client-conformance/2026-10-06T09-51-29.930Z`. It contains twelve passing
cells with zero failed checks and zero warnings. The runner is
`0.2.0-alpha.12`, Bun is `1.4.0`, and the installed locally packed Effect reports
`4.0.1`.

Intermediate failures remain in the raw directories recorded by
`retainedIntermediateRuns`: the first metadata retry exposed an unsupported
fixture tool-list request, and the first full rerun exposed unnecessary legacy
handler advertisement against POST-only peers. No expected-failure baseline was
added. OAuth, SSE reconnection retries, skills extensions, stdio qualification,
and older revisions remain outside this client matrix.
