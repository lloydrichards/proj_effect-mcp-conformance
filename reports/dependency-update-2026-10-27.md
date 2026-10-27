# Published dependency verification, 27 October 2026

Effect `4.0.6` passes all 26 client combinations and all 275 non-Tasks server
adapter checks. The nine Tasks draft fixtures still require the unpublished
`McpTasks` export. The workspace is not fully green against published packages.

[Machine-readable results](dependency-update-2026-10-27.json) record each
server adapter result, client result, package versions, and source hashes.

## Dependencies

| Package                | Previous manifest  | Updated manifest   |
| ---------------------- | ------------------ | ------------------ |
| `effect`               | `4.0.1`            | `4.0.6`            |
| `@effect/platform-bun` | `4.0.1`            | `4.0.6`            |
| `effect-boxes`         | `^0.17.1`          | `^0.18.1`          |
| `@effect/tsgo`         | `0.45.0`           | `0.59.0`           |
| `@types/bun`           | `1.4.0` / `^1.4.0` | `1.4.4` / `^1.4.4` |
| `oxfmt`                | `0.66.0`           | `0.75.0`           |
| `oxlint`               | `1.81.0`           | `1.90.0`           |
| `vite-plus`            | `0.3.0`            | `1.4.0`            |
| `vitest`               | `5.0.0` / `^5.0.0` | `5.0.5` / `^5.0.5` |

The conformance runner remains pinned to `0.2.0-alpha.12`, the newest npm
`alpha` tag. Its `latest` tag is the older `0.1.16` release. TypeScript `7.0.2`
is already current. After installation, `bun outdated --recursive` reports
no further updates. Verification used Bun `1.4.0` and Node `24.21.0`.

Before installation, the client workspace contained locally packed Effect
`4.0.0-rc.118`. The results here use published `4.0.6`, with no local tarball
overrides in the lockfile.

## Compatibility changes

Client fixtures now pass `name` and `version` directly to `McpClient.make`.
The Layer fixture uses the published combined `McpClient.layerHttp` constructor.
The client runner hashes `dist/ai/McpClient.js`, the published implementation,
instead of the former internal file.

The updated Effect compiler diagnostics flag unstable and experimental APIs.
The shared TypeScript configuration explicitly allows the modules these
fixtures already exercise, including experimental `McpClient`. Other diagnostic
settings and error checks remain enabled.

## Verification

| Check                                              | Result                                                 |
| -------------------------------------------------- | ------------------------------------------------------ |
| Frozen lockfile installation                       | Pass                                                   |
| Lint                                               | Pass                                                   |
| Formatting                                         | Pass                                                   |
| Unit tests                                         | Pass, 9 tests in 2 files                               |
| CLI build                                          | Pass                                                   |
| CLI type checking                                  | Pass                                                   |
| Non-Tasks fixture and shared-package type checking | Pass                                                   |
| Whole-workspace type checking                      | Fail, nine Tasks fixtures require `McpTasks`           |
| Client conformance                                 | Pass, 26 combinations and 177 checks                   |
| Server conformance                                 | 275 passes, 9 failures, no skips, 284 applicable cells |
| Coverage inventory                                 | Fail, three unclassified Skills scenarios              |

The server run exercised all 98 fixture implementations through
`conformance:all --scenario <name> --timeout 30000`, with six independent
scenario groups running concurrently. All nine failures are Tasks fixtures;
all other applicable cells pass. The failures remain visible and are not
excluded from the default matrix or workspace checks.

Raw server matrix logs remain in `.cache/dependency-update-2026-10-27/`.
The official runner's per-check server evidence remains in `.cache/conformance/`.
Client bundles, logs, environment metadata, and checks remain in
`.cache/client-conformance/2026-10-27T07-12-15.940Z/`.

## Remaining gaps

Published Effect `4.0.6` does not export `McpTasks`. All nine Tasks draft
fixtures fail type checking and execution until Effect publishes that API.
These failures occur before the runner can assess Tasks behavior, so this run
does not verify the historical Tasks runner issues or their fixes.

The installed runner lists 65 server scenarios. Local metadata implements 58
and classifies four as unavailable. Three scenarios remain unclassified:

- `sep-2640-skills-directory`
- `sep-2640-skills-enumeration`
- `sep-2640-skills-manifest`

These are coverage gaps, not dependency-installation failures. No Skills
fixtures were added, and the inventory check continues to report them.
