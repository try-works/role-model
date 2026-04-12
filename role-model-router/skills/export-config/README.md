# Export Config Skill

This entry point produces a stable machine-readable config artifact from selected endpoints.
It exists so downstream tools can consume exported router metadata without relying on ad hoc local state.

The baseline artifact is `runtime-output/router-devtools/config-export.json` and contains one record per
normalized endpoint with:

- `endpointId`
- `endpointKind`
- `providerKind`
- `modelId`
- `servingSource`
- `modalities`
- `strategyTags`

The sample export path demonstrates ACP, MCP, and CLI-backed endpoint inventory in the same stable format.
