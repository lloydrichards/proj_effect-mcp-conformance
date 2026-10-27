# Skills conformance, 27 October 2026

All three previously missing Skills scenarios now have independent fixtures.
The coverage inventory passes with 61 scenarios covered by fixtures and four
explicitly unavailable, across 101 fixture implementations.

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
- The coverage inventory, lint, formatting, nine unit tests, and CLI build pass.
- Existing resource discovery and text-reading fixtures pass across all five
  adapters after the shared helper change.

The existing nine Tasks fixtures still depend on the unpublished `McpTasks`
export. Their workspace type-check failures are separate from these fixtures.
