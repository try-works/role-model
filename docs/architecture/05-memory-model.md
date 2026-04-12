# Memory Model Boundary

The stable baseline defines a `MemoryStore` contract boundary without implementing a production memory
backend.

What exists now:

- a shared store contract package,
- protocol/docs language for future memory-backed behavior,
- explicit deferral of concrete EdgeHDF5 or long-lived local-memory implementations.

What is deferred:

- production backends,
- synchronization strategies,
- retention policies beyond baseline documentation.
