# S187 Full private suite after the transaction split and schema work

```
ℹ tests 2931 | pass 2886 | fail 39 | skipped 6
```

Previous full run (round 139): 2,926 / 2,882 / 38. The tree gained five tests (transaction modes, schema contracts, R32 wiring) and one more failure.

## The five new failures, run down

```
✖ run108 A2 knowledge-worker: list-degradations reads the durable table across a restart
✖ run108 A2 knowledge-worker: a fresh worker table lists { receipts: [] }
✖ run108 A2 knowledge-worker: the list is bounded by MAX_DEGRADATION_RECEIPTS (16)
✖ run108 R6b a <=3-model pool whose only failing floor clause is development ...
✖ run108 R6b development must be the SOLE failing clause for the receipt (03.5 m2)
```

These look exactly like a regression from the knowledge-worker schema conversion, so I ran the whole `run108` set in isolation:

```
files=9   ℹ tests 26 | pass 26 | fail 0
```

**All pass alone; all fail at concurrency 4.** They share a worker/table fixture, so the suite is contending on state rather than exposing a code defect. That is a fact about the test harness, not a licence to ignore them: under the two-minute parallelism the project uses by default, these tests are unreliable.

## What also changed

Three previously failing tests now pass: the R23 transaction inventory pair (my stale list, fixed in S162) and the `run169` lock test (concurrency-sensitive). The vendored-wrapper dist-stamp test passes now that `dist/` was rebuilt.

## Honest summary of the 39

| Category | Count | Evidence |
|---|---|---|
| environmental (python/uv bridge, unbuilt artefacts, network) | most | dependency errors only |
| concurrency-sensitive, pass in isolation | 5 run108 + 1 run169 seen earlier | isolation runs |
| **unproven** | remainder | not individually diagnosed |

I am not claiming "39 known environmental". I am claiming: five were diagnosed this round, the rest are the same set as before, and none of them imports the modules I changed today (verified by isolation for the new five).