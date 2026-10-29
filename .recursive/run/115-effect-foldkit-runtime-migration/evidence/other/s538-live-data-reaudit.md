# S538 - data-bearing re-audit after fixture traffic

Generated 60 offline fixture chat requests on the port instance (:51970, dev state root): 40 success / 20 failure; telemetry reports requestCount 60, tokens 2280, estimated cost 0.00863. No paid provider was called - the fixture catalogue serves canned responses.

Re-measured the data-bearing page pairs (port textLen / reference textLen):

- /requests 15.79x (port 6143 vs ref 389)
- /observe/routing 3.45x
- /system/operator 2.43x
- /router 1.07x
- /control/providers 0.92x
- /router/decisions 0.84x
- /learning 0.83x
- / 0.81x
- /models 0.76x
- /observe/activity 0.51x
- /observe/observability-snapshot 0.24x
- /observe/store-degradation-receipts 0.12x
- /observe/logs 0.08x
- /local/logs 0.01x

Conclusion: pages wired to telemetry/decisions/requests reach or exceed reference density once data exists; the remaining low ratios are host-log and store-receipt surfaces whose data only exists when llama-swap and the knowledge stores have live activity - not renderer structure. All pages carry the reference headings, inline SVG charts and table shells (S531/S532/S535/S536).
