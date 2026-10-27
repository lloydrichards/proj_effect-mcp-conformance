# Unified conformance commands, 27 October 2026

All three commands pass against published Effect `4.0.6` and conformance
`0.2.0-alpha.12`, using Bun `1.4.0`.

| Command              | Implementation rows | Passing matrix cells | Successful checker assertions | Skipped checker assertions |
| -------------------- | ------------------- | -------------------- | ----------------------------- | -------------------------- |
| `conformance:client` | 20                  | 26/26                | 177                           | 10                         |
| `conformance:server` | 89                  | 275/275              | 728                           | 8                          |
| `conformance:all`    | 109                 | 301/301              | 905                           | 18                         |

No matrix cells failed, timed out, or were entirely skipped. Individual skipped
assertions remain separate from successful assertions.

## Commands and reporting

All three scripts invoke the Effect CLI. The
[matrix registry](../apps/conformance/src/matrix/scenarios.ts) combines the
existing server definitions and the 20 client implementations, retaining their
upstream identifiers and protocol applicability. Each implementation remains
an independent app and table row. Exact local names take priority over upstream
names when selecting rows.

The shared [matrix runner](../apps/conformance/src/matrix/run.ts) dispatches each
cell by direction. Server cells invoke the existing server command, now with a
raw-check output directory. Client cells build the selected entrypoint and
invoke the pinned official client checker. Scoped child processes share logging,
timeouts, cleanup, and result classification. The former client-only scripts
are removed.

The shared [table renderer](../apps/conformance/src/matrix/table.ts) displays
all five protocol columns for every command. Inapplicable cells appear as `--`
and do not enter the summary denominator. A successful process needs successful
checker output to earn `PASS`. Failed checks, process errors, and missing or
malformed output produce `FAIL`. A fully skipped check set produces `SKIP`;
an expired cell deadline produces `TIMEOUT`. Failures and timeouts cause a
nonzero command exit status.

```sh
bun run conformance:all
bun run conformance:server
bun run conformance:client
bun run conformance:server --scenario ping
bun run conformance:client --scenario client-tools-call-III
bun run conformance:client tools_call toolkit
```

The default per-cell timeout is 30 seconds. The three full verification runs
used 30 seconds. Each run saves raw checks, logs, environment metadata, and
`summary.json` under `.cache/conformance/<timestamp>-<selection>/`.

## Additional verification

- All 17 unit tests pass, including matrix selection and result classification.
- CLI type checking, lint, repository formatting, and the CLI build pass.
- The existing `tools_call toolkit` selection passes both applicable protocols.
- A deliberate `conformance:server --scenario ping --timeout 1` run produces
  four `TIMEOUT` cells and exits with status 1.

[Structured evidence](unified-conformance-2026-10-27.json) retains the combined
matrix and the row, cell, assertion, and skip counts for each command. The
full logs are in `/tmp/conformance-unified-server.log` and
`/tmp/conformance-pr-review-all.log`; raw checker directories are recorded in
that evidence. No scenario workloads changed in this command/reporting update.

## Pre-publication review

### Standards

The review found one portability issue: URL pathnames retained `%20` in checkout
paths containing spaces. The shared `src/repository.ts` now uses
`fileURLToPath` for the matrix, single-server runner, and Inspector. Its relative
location works for both source and built CLI execution. A built-CLI client
initialization check passes from a temporary checkout path containing spaces
and a literal `%`. No remaining standards findings were reported.

### Spec

No findings. The independent client workloads retain the original payloads
and API paths, and all three commands retain the required row selection,
protocol applicability, result states, and evidence output.

Whole-workspace type checking now passes for all 111 workspaces. Unit tests,
lint, formatting, and the CLI build also pass after the portability fix.

The final post-review combined run again passes all 301 matrix cells, with
905 successful checker assertions and 18 skipped assertions. Its evidence is
in `.cache/conformance/2026-10-27T14-08-40.193Z-all/`. The built CLI also passes
the four applicable `ping` server cells.
