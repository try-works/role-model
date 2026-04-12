# Repository Overview

`role-model` is organized around one rule: the protocol is canonical, and hosts adapt to it.

The stable baseline defines:

- repository boundaries so future work has durable homes,
- protocol docs plus JSON Schemas as the primary contract layer,
- shared packages for validation, conformance, packaging, and store boundaries,
- router-specific packages and apps under `role-model-router/`,
- test fixtures that exercise endpoint-centric routing and benchmark flows.

Future host families may grow substantially, but they should do so by extending the established
protocol instead of redefining it.
