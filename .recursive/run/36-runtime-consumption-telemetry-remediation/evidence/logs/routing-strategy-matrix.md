# Routing Strategy Matrix

Generated: 2026-06-08T17:51:37.443770+00:00

| Prompt | Category | difficulty | baseline | controller | hybrid |
| --- | --- | --- | --- | --- | --- |
| `c01-full-refactor` | code-burden | local / medium / 7173ms / 200 | local / — / 7188ms / 200 | local / — / 7135ms / 200 | remote / medium / 4839ms / 200 |
| `c02-ts-generics` | code-burden | remote / medium / 3689ms / 200 | local / — / 5827ms / 200 | local / — / 5792ms / 200 | remote / medium / 4964ms / 200 |
| `d01-milestones-heavy` | decomposition | local / easy / 8525ms / 200 | local / — / 8490ms / 200 | local / — / 8473ms / 200 | local / easy / 8532ms / 200 |
| `e01-yes-no` | easy-trivial | remote / easy / 2042ms / 200 | local / — / 389ms / 200 | local / — / 402ms / 200 | local / easy / 428ms / 200 |
| `e02-single-word` | easy-trivial | local / easy / 396ms / 200 | local / — / 377ms / 200 | local / — / 426ms / 200 | local / easy / 399ms / 200 |
| `e03-count` | easy-trivial | local / easy / 583ms / 200 | local / — / 570ms / 200 | local / — / 563ms / 200 | local / easy / 591ms / 200 |
| `e04-capitalize` | easy-trivial | local / easy / 452ms / 200 | local / — / 404ms / 200 | local / — / 415ms / 200 | local / easy / 452ms / 200 |
| `e05-emoji` | easy-trivial | local / easy / 521ms / 200 | local / — / 405ms / 200 | local / — / 428ms / 200 | local / easy / 448ms / 200 |
| `e06-timezone` | easy-trivial | local / easy / 410ms / 200 | local / — / 576ms / 200 | local / — / 383ms / 200 | local / easy / 609ms / 200 |
| `e07-boolean` | easy-trivial | local / easy / 836ms / 200 | local / — / 804ms / 200 | local / — / 895ms / 200 | local / easy / 798ms / 200 |
| `e08-format-json` | easy-trivial | local / easy / 577ms / 200 | local / — / 550ms / 200 | local / — / 551ms / 200 | local / easy / 628ms / 200 |
| `l01-verbose-incident` | long-context | local / medium / 2462ms / 200 | local / — / 937ms / 200 | local / — / 759ms / 200 | remote / medium / 4181ms / 200 |
| `l02-many-constraints` | long-context | local / easy / 3960ms / 200 | local / — / 3086ms / 200 | local / — / 3459ms / 200 | local / easy / 3698ms / 200 |
| `p01-easy-greet` | easy-short | local / easy / 643ms / 200 | local / — / 652ms / 200 | local / — / 621ms / 200 | local / easy / 663ms / 200 |
| `p02-easy-math` | easy-short | local / easy / 437ms / 200 | local / — / 396ms / 200 | local / — / 371ms / 200 | local / easy / 415ms / 200 |
| `p03-easy-define` | easy-short | local / easy / 1012ms / 200 | local / — / 1196ms / 200 | local / — / 1167ms / 200 | local / easy / 1087ms / 200 |
| `p04-easy-translate` | easy-short | local / easy / 911ms / 200 | local / — / 869ms / 200 | local / — / 480ms / 200 | local / easy / 914ms / 200 |
| `p05-easy-list` | easy-short | local / easy / 1027ms / 200 | local / — / 1297ms / 200 | local / — / 1193ms / 200 | local / easy / 1252ms / 200 |
| `p06-medium-explain` | medium-qa | local / easy / 5300ms / 200 | local / — / 4686ms / 200 | local / — / 4655ms / 200 | local / easy / 4704ms / 200 |
| `p07-medium-compare` | medium-qa | local / easy / 5738ms / 200 | local / — / 5736ms / 200 | local / — / 5707ms / 200 | local / easy / 5827ms / 200 |
| `p08-medium-summarize` | medium-qa | local / easy / 2526ms / 200 | local / — / 4362ms / 200 | local / — / 4383ms / 200 | local / easy / 4425ms / 200 |
| `p09-medium-howto` | medium-qa | local / easy / 4677ms / 200 | local / — / 4635ms / 200 | local / — / 4667ms / 200 | local / easy / 4695ms / 200 |
| `p10-long-context` | long-context | local / easy / 3148ms / 200 | local / — / 3747ms / 200 | local / — / 4124ms / 200 | local / easy / 3275ms / 200 |
| `p11-long-multi-turn` | long-context | local / easy / 6896ms / 200 | local / — / 6851ms / 200 | local / — / 6805ms / 200 | local / easy / 6911ms / 200 |
| `p12-code-patch` | code-burden | local / medium / 4689ms / 200 | local / — / 4647ms / 200 | local / — / 4668ms / 200 | local / medium / 4693ms / 200 |
| `p13-code-debug` | code-burden | local / easy / 5847ms / 200 | local / — / 5795ms / 200 | local / — / 5827ms / 200 | local / easy / 5842ms / 200 |
| `p14-schema-validate` | code-burden | local / medium / 4688ms / 200 | local / — / 4686ms / 200 | local / — / 4645ms / 200 | local / medium / 4701ms / 200 |
| `p15-tools-read-one` | tools-light | local / easy / 2326ms / 200 | local / — / 2503ms / 200 | local / — / 3175ms / 200 | local / easy / 2232ms / 200 |
| `p16-tools-search` | tools-light | local / easy / 2321ms / 200 | local / — / 2219ms / 200 | local / — / 2417ms / 200 | local / easy / 1755ms / 200 |
| `p17-tools-multi-hard` | tools-heavy | remote / hard / 7003ms / 200 | local / — / 5773ms / 200 | local / — / 4435ms / 200 | remote / hard / 6918ms / 200 |
| `p18-tools-agent` | tools-heavy | local / medium / 538ms / 200 | local / — / 1699ms / 200 | local / — / 3125ms / 200 | local / medium / 513ms / 200 |
| `p19-decompose-plan` | decomposition | remote / easy / 9814ms / 200 | local / — / 7090ms / 200 | local / — / 7025ms / 200 | local / easy / 7135ms / 200 |
| `p20-decompose-arch` | decomposition | local / easy / 7829ms / 200 | local / — / 7818ms / 200 | local / — / 7793ms / 200 | local / easy / 7860ms / 200 |
| `p24-exact-local` | exact-model | local / easy / 951ms / 200 | local / — / 895ms / 200 | local / — / 883ms / 200 | local / easy / 930ms / 200 |
| `p25-exact-remote` | exact-model | remote / easy / 1367ms / 200 | remote / — / 1226ms / 200 | remote / — / 1343ms / 200 | remote / easy / 1247ms / 200 |
| `p26-cache-easy-a` | cache-probe | local / easy / 729ms / 200 | — | — | — |
| `p27-cache-easy-b` | cache-probe | local / easy / 734ms / 200 | — | — | — |
| `p28-cache-hard-a` | cache-probe | local / medium / 3475ms / 200 | — | — | — |
| `p29-cache-hard-b` | cache-probe | local / medium / 1912ms / 200 | — | — | — |
| `p30-cache-invalidate` | cache-probe | local / medium / 5771ms / 200 | — | — | — |
| `p31-cache-strategy-switch` | cache-probe | local / easy / 479ms / 200 | — | — | — |
| `t01-tools-list-dir` | tools-light | local / easy / 3548ms / 200 | local / — / 503ms / 200 | local / — / 501ms / 200 | local / easy / 581ms / 200 |
| `t02-tools-triple` | tools-heavy | remote / hard / 8215ms / 200 | local / — / 6854ms / 200 | local / — / 5477ms / 200 | remote / hard / 7811ms / 200 |
| `t03-tools-agent-plan` | tools-heavy | remote / hard / 7905ms / 200 | local / — / 6522ms / 200 | local / — / 6251ms / 200 | remote / hard / 9000ms / 200 |
| `x01-max-signal` | max-signal | remote / hard / 7587ms / 200 | local / — / 9134ms / 200 | local / — / 5662ms / 200 | remote / hard / 7792ms / 200 |
| `x02-max-context-tools` | max-signal | remote / hard / 8841ms / 200 | local / — / 9938ms / 200 | local / — / 3459ms / 200 | remote / hard / 6641ms / 200 |