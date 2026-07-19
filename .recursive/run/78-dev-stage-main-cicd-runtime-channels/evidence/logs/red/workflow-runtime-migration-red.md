# RED receipt

- Workflow contract tests failed on the former broad single CI job, arbitrary docs refs, and missing development/stage packaging channels.
- Runtime profile/version tests failed because the channel module and metadata did not exist.
- Migration tests failed because the production legacy-state migration module did not exist.

These failures were observed before the corresponding production edits and matched the missing contracts.
