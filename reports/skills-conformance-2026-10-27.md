# Skills conformance, 27 October 2026

All three previously missing Skills scenarios now have independent fixtures.
At the standalone Skills PR head, the coverage inventory passes with 52
scenarios covered by fixtures and 13 explicitly unavailable, across 92 fixture
implementations. Nine unavailable entries belong to the separate Tasks draft.
With that draft applied, the combined stack has 61 fixture-backed scenarios,
four unavailable scenarios, and 101 fixture implementations. The original
three-probe evidence below was captured with the combined stack applied;
the independent PR review reproduced the same probe outcomes.

Published Effect `4.0.6` passes the manifest scenario. Enumeration and directory
reading fail because Effect does not implement their extension methods. The
fixtures declare the required capabilities so those gaps produce failures
rather than whole-scenario skips. This is partial contract coverage, not full
Skills extension support.

[Machine-readable evidence](skills-conformance-2026-10-27.json) contains every
check from conformance `0.2.0-alpha.12`, fixture hashes, and the runner hash.
The scenario contracts were read from that installed runner's `dist/index.js`.

## Contracts

All three fixtures select `2026-07-28`, the stateless adapter used for the
extension probes. The CLI passes `--force` for their Skills extension metadata.
The shared server helper accepts optional extension metadata; resources and
capability settings remain in each scenario.

### Manifest

`sep-2640-skills-manifest` declares `io.modelcontextprotocol/skills: {}` and
registers `skill://conformance/manifest-fixture/SKILL.md` with Effect's
`McpServer.resource`. Its `text/markdown` content begins with YAML frontmatter.
The resource's name, description, and final skill-path segment match that
frontmatter. No optional `_meta` keys are supplied.

The runner discovers the manifest through `resources/list` and reads it through
`resources/read`. It verifies the MIME type, metadata, path, and any `_meta`
key prefixes. This scenario does not verify `skills/list` or `skills/get`.

### Enumeration

`sep-2640-skills-enumeration` declares the extension inline as an empty object
and registers a manifest resource to advertise the required base resources
capability. The runner requires `skills/list` and `skills/get`.

A successful listing must return complete skill entries with `uri`,
`frontmatter`, and `resources`. Resource arrays carry `{uri, digest, size}`
triples; `resources: "dynamic"` is also allowed. The runner checks pagination,
entry limits, naming, directory containment, digest formats, and frontmatter
consistency with the readable manifest. On `2026-07-28`, list and get results
must include `ttlMs` and `cacheScope`. An unknown skill URI must return `-32602`.

Effect has no public Skills registration API. The fixture leaves that gap
visible instead of intercepting the protocol or fabricating successful
extension responses. `skills/list` returns `-32601`, so the runner cannot
reach the deeper checks, including `skills/get`.

### Directory reading

`sep-2640-skills-directory` declares the extension with `directoryRead: true`.
It registers a manifest, a `references` directory with MIME type
`inode/directory`, and a file inside that directory.

The runner discovers the skill directory through the manifest URI. It requires
`resources/directory/read` to return direct children under `resources`, mark
subdirectories as `inode/directory`, and honor any pagination cursor. A
single-page response is valid. A non-directory URI must return `-32602`.

Effect returns `-32601` for `resources/directory/read`. The registered directory
resource does not implement the missing directory traversal method.

## Results

| Scenario          | Success | Failure | Skipped | Outcome |
| ----------------- | ------- | ------- | ------- | ------- |
| Manifest          | 6       | 0       | 0       | Pass    |
| Enumeration       | 4       | 2       | 25      | Fail    |
| Directory reading | 2       | 5       | 0       | Fail    |

Counts include the runner's generic schema check. Enumeration fails capability
commitment and method availability. Directory reading fails method availability,
result shape, subdirectory discovery, invalid-parameter handling, and pagination.
The latter failures follow from the missing directory method.

The runner's enumeration early-return path emits 31 checks after `skills/list`
fails. It skips the deeper checks rather than establishing whether the server
satisfies them. The raw evidence preserves that distinction.

## Verification

- The official three-scenario matrix runs produce the results above.
- Type checking passes for all three new fixtures, the shared server package,
  and the conformance CLI.
- The coverage inventory, lint, formatting, 14 unit tests, and CLI build pass.
- CI now runs the inventory check, so newly unaccounted upstream scenarios fail
  validation.
- Existing resource discovery and text-reading fixtures pass across all five
  adapters after the shared helper change.

The nine fixtures on the separate Tasks draft still depend on the unpublished
`McpTasks` export. They are not present at the standalone Skills PR head.

## Swarm review corrections

Three independent reviewers checked the protocol contracts, runner behavior,
and isolated PR validation. The review found an outcome-classification bug:
the official runner can emit only skipped behavior checks followed by a
successful generic `wire-schema-valid` check. The wrapper previously reported
that as a pass. It now reports exit `77`, meaning skipped, while preserving
failures in any check or the runner process.

Empty results, generic-only evidence, unknown statuses, and failed checks with
a successful process exit no longer count as passing conformance evidence.
Five new regression cases failed before the fix and pass afterward. The
existing nine unit tests continue to pass.

The manifest probe passes without supplying optional `_meta` entries. It does
not establish preservation of custom skill metadata. The extension flags are
explicit fixture configuration: the observed method failures do not mean that
Effect advertises Skills support by default.

The PR remains a draft. Its default conformance CI job fails on the two missing
methods. No expected-failure baseline, disabled checks, or replacement handlers
have been added. A separate direct control successfully discovered the server and read its
manifest, then called `skills/get` for that same URI. It returned HTTP `404`
with JSON-RPC `-32601 Method not found: skills/get`. This establishes method
availability only. Successful retrieval, cache fields, manifest equality, and
unknown-URI error semantics remain untested.
