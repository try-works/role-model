# S57 review confirmed: two critical defects, and my earlier claims were wrong

The independent review (`evidence/other/s55b-review.md`) reported two CRITICAL findings. I verified both myself against the code and the live host.

## 1. The llama-swap proxy is dead code - CONFIRMED

`llamaSwapProxyBaseUrl` occurs exactly twice in the host:

```
index.ts:254:  let llamaSwapProxyBaseUrl: string | null = null;
index.ts:20308: const vendorBaseUrl = llamaSwapProxyBaseUrl;
```

**There is no assignment anywhere in the repo.** Every Studio proxy path therefore takes the `vendorBaseUrl === null` 503 branch, even with llama-swap running.

So my earlier statement - "the host now proxies Studio's vendor paths to llama-swap" - was **wrong**. The vendor evidence was a direct call to the vendor process, which proved the vendor implements those routes but never proved the host hop. I repeated a worker claim without checking the wiring, and that is the failure to correct here.

## 2. The token chart reads a shape the host never sends - CONFIRMED

A real `/api/metrics/page` item carries:

```json
"tokens": {"cache_tokens":0,"input_tokens":0,"output_tokens":0,"prompt_per_second":0,"tokens_per_second":0}
```

The client does `Number(item.tokens)` on that object, which is `NaN`, so the token chart is flat zero on real data. The fixture had been hand-edited to a scalar, so the test passed on a shape the host never produces - a self-fulfilling fixture.

## Other review findings accepted

- p95 nearest-rank is one rank high for n>=20; end-of-window items clamp to 23:00 while the window is 00:00-24:00; empty buckets are bridged rather than marked as gaps.
- The "Model pool" is a 1-D cost strip with arbitrary y positions and a fixed marker radius, not the scatter S55a described.
- Studio dispatch tests assert method + non-empty body keys, not exact bodies; Advanced posts to `/v1/messages`, which the host neither serves nor proxies.
- Packaging depends on the legacy app's built fonts and node_modules, so a clean worktree can fail.
- Client total is not reproducible in one parallel run: 194/197 with three 5 s timeouts that pass alone (logs `s55b-review-client.log`, `s55b-review-fails.log`).

Repairs dispatched as one scoped task, with the rule that every claim needs a test that fails when the behaviour is reverted, and that fixtures must be captured from the host, never hand-edited.
