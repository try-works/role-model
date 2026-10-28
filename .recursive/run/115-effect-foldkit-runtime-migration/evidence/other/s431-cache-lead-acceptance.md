# S431 — bounded cache-correctness acceptance

Patch basis public71151644, original paired authority unchanged. Existing author s5 and independent reviewer s9 live-verified deepseek-flash; product frozen and independently checked. Other parallel UI/private patches are outside this acceptance.

Mutable readHydrated now always calls reader, exact value/error, no fake cached snapshot or async queuework. Explicit persist()->read()/cached() snapshots capped by validated positive-integer capacity; oldest evicted; successfulwrite invalidates samekey; sequence fence prevents older hydration overwrite, pending intent keys bounded by queued/active jobs. Abandoned generation catch checks before any mutation (late rejection cannot replace typed timeout). No TTL or stale read allowance invented.

Strict initial behavioral RED8/10 before source (s424-red.log). Independent S428 found late-rejection defect plus insufficient capacity/overflow tests. RED2 one failing late-reject assertion before fix; strengthened six sequential successcallbacks cap2, true same-key queueoverflow + fresh recovery, tempSQLite finallycleanup. GREEN2 and Lead final5files36/36(s42412+s3349+s3374+s3416+s4215), hosttsc0; s424-lead-final-green.log. Original queue/drain tests unchanged. Old s337 expectation of stale mutable read corrected to original fresh semantics, not feature removal.

Independent final bounded PASS s428-cache-review.md SHA256830AB638FB1A407037508E08DCE6DD931E747425702C67E79B1BB12081CF1C38. Keyhashes DAG252D8B4148EDAD63CA52DCB0DEBB5F9FE7EEC2E35191D6B02663F567A98C40D2; newtest4584816DE68790C06F7BE6E6E382591EE1A3A708FC8719B1FE7445B5B5642BE2; s337A7E584D61F8508BF0629F4613883383EE89C315F96FCC40F409B3F010610F5A5.

Absolute tool scans1file each:newtest/families0; DAG161baseline and storage region0new; old s334/s341 findings disclosed. Lead direct probe6sequential snapshots retained2; livev1->v2 returnedv2.

Not closed: R23 actual async richgraph/SQL hydration and maintenance fence, R27 fullclosedprocessgraph/currentpackage/perf, payload-byte bounds beyond entrycap; snapshots explicit process-local not revisionauthority/durable. No mutable production caller serves explicit snapshot. Only E1/E2 deferrals authorized. Audit findings not waived.
Audit: PASS (bounded repair only)
