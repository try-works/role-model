# Endpoint Identity

Routing and benchmarking operate on concrete endpoints, not abstract model names.

An `EndpointIdentity` captures:

- endpoint/provider/serving-source identity,
- model/package/variant identifiers,
- runtime version, quantization, and precision,
- host, device, region, and organizational scope.

This makes it possible to distinguish two endpoints serving the same base model under different runtime,
quantization, or deployment conditions.
