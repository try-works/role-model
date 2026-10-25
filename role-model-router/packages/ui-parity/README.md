# ui-parity verification foundation

Repository development commands (Node24, installed workspace):

```sh
corepack pnpm run runtime:test-parity
corepack pnpm run runtime:parity --request-selfcheck
corepack pnpm run runtime:parity --selfcheck
```

`--request-selfcheck` runs ten deterministic comparator controls, returns JSON with scope `request-comparator-only`, and exits0 only if all controls pass. It makes no network requests and is **not** a React/browser/packaged/real-client result.

The full `--selfcheck` currently returns `NOT_RUN`/exit2 until the actual React capture runner is implemented. Missing/unknown/combined modes return `FAILED`/exit1; no implicit fixture-success default. Do not count NOT_RUN as successful acceptance.

Request comparison preserves body/method/path/query/header/status/error/terminal semantics and multiplicity. Independent reads may reorder. Mutation/tool/turn predecessors must be explicit; `$scenario` is the only external root. Repeated step labels are suitable for independent polls; use unique labels for causal events. Inputs must already be capture-normalized/redacted and schema-validated by the observing adapter; the pure comparator does not collect traffic or redact inputs.

The Node-only target contract is not part of the browser export. It checks supplied identities, loopback/port and explicit forbidden-root containment, not actual process/files/realpath provenance. Any status from the pure evaluator must not be treated as environment verification without the adapter evidence.

Remaining work includes actual DOM/style/accessibility/pixel capture, React-vs-React mutation/determinism, allroute states and actual supported DSH/pi R/D/C joined telemetry/API/DOM/graph/persisted restart verification.
