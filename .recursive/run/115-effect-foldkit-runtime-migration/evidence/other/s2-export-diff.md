# Vendored Effect export-surface diff (4.0.1 -> 4.0.6)

Baseline commit: f0d50fab (vendor/effect at HEAD). Candidate: working tree after the exact-tag sync.

## Root package export map
old keys: 28  new keys: 38
removed subpaths: 0; added subpaths: 10
### added
- ./graphql
- ./ai/internal/*
- ./eventlog/internal/*
- ./http/internal/*
- ./http/FindMyWay/internal/*
- ./http/MultipartParser/internal/*
- ./http-api/internal/*
- ./observability/internal/*
- ./rpc/internal/*
- ./workflow/internal/*

## Root index.ts named exports
old namespaces: 138  new namespaces: 143
removed namespaces: 0; added namespaces: 5
### added namespaces
- Bytes
- SemVer
- SemVerRange
- TextDiff
- Version

## Tree scale
 956 files changed, 129592 insertions(+), 41752 deletions(-)
## Conclusion

No subpath and no root namespace was removed between the two pins, so every existing first-party import remains resolvable. The deltas are additive: ten subpaths, all under an internal path or graphql, and five root namespaces (Bytes, SemVer, SemVerRange, TextDiff, Version).

This is an export-surface diff over the vendored sources and the package export map, not a public-API compatibility certification: the wrappers are built with esbuild from source, so the declarations under dist/types are generated output rather than a committed contract.
