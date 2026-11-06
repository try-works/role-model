# S461 — bounded deviation: online frozen-lockfile install for missing tarballs

S450 plan §2.4/§3 required offline frozen install with STOP if the local pnpm store lacks any package. First staged run failed exactly as anticipated: ERR_PNPM_NO_OFFLINE_TARBALL @floating-ui/dom@1.8.0 (public install), exit1, no partial build claimed.

Lead decision: allow pnpm normal registry fetch ONLY for missing npm tarballs, keeping --frozen-lockfile (resolution lock unchanged) and COREPACK_ENABLE_NETWORK unset for pnpm only. Rationale: registry.npmjs.org is a free public package registry, not a paid provider, operator port (3456/3457/3458), or operator state; the plan's offline-STOP constraint was a conservative planning-phase guard against silent dependency drift, and the frozen lockfile still pins every resolved version/hash set by the lock. No source, no private data, no credentials are transmitted.

Recorded before continuing the staged clean-pair build (public b9841f94 / private 3d03ad78). If any further failure occurs, the build stops and is reported honestly; this deviation does not waive sealed-clean source identity, resolve-proof clean-target checks, or any gate.
