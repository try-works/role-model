# Lead run 216af610 investigation

- Artifact dir exists but contains only response files; no manifest.json/result.json => interrupted run record, not a list bug.
- GET /benchmark/runs lists only terminal runs; active runs are absent from the list by design. Reproduced run 269677f4: listCount=0 at first sample, 1 only after completion.
- Reproduced run 269677f4 (deepseek-flash-low + high subjects, max judge): 137 samples over 136s, status completed, outcome partial, caseCounts total 24 / passed 10 / failed 14; manifest.json + result.json present.
- Second live UI run 29cb3194: outcome partial, 10/24 passed, 24 detail rows.
- No reproduced crash/record loss while the process stays alive. 216af610 was interrupted before completion (only response artifacts), likely host restart/kill. Original logs unavailable.
