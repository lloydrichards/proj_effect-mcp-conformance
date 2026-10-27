# Published Effect 4.0.1 validation

The dependency PR was validated in an isolated checkout with published Effect and platform packages pinned to `4.0.1`. The runner remained `0.2.0-alpha.11` on this base branch; the alpha.12 update belongs to the Tasks child PR.

Workspace types, lint, formatting, build, and all six base CLI tests pass. The full server matrix passes all 275 applicable adapter checks with no failures or timeouts. The historical CLI table prints 445 total cells, including non-applicable cells; the passing applicable count is 275. See [the complete matrix output](effect-4.0.1-conformance-2026-10-06.txt).

This validates the published stable baseline. It does not qualify the unpublished Tasks and McpClient APIs. Those dependent PRs remain drafts until the features land in Effect and become available in published packages.
