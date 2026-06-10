# Routing Strategy Prompt Suite Report (v2 matrix)

- Generated: 2026-06-08T17:51:37.443770+00:00
- Runtime: http://127.0.0.1:3456
- Prompt cases: 46
- Total runs: 166
- Strategies: difficulty, baseline, controller, hybrid

## Summary by category

| Category | Runs | OK | Local | Remote | Avg latency |
| --- | ---: | ---: | ---: | ---: | ---: |
| cache-probe | 6 | 6 | 6 | 0 | 2183 |
| code-burden | 20 | 20 | 17 | 3 | 5366 |
| decomposition | 12 | 12 | 11 | 1 | 8032 |
| easy-short | 20 | 20 | 20 | 0 | 830 |
| easy-trivial | 32 | 32 | 31 | 1 | 572 |
| exact-model | 8 | 8 | 4 | 4 | 1105 |
| long-context | 16 | 16 | 15 | 1 | 4018 |
| max-signal | 8 | 8 | 4 | 4 | 7381 |
| medium-qa | 16 | 16 | 16 | 0 | 4795 |
| tools-heavy | 16 | 16 | 10 | 6 | 5502 |
| tools-light | 12 | 12 | 12 | 0 | 2006 |

## Strategy summary

- **difficulty**: 46/46 OK, local=37, remote=9, avg=3489ms, difficulty={'easy': 32, 'medium': 9, 'hard': 5}
- **baseline**: 40/40 OK, local=39, remote=1, avg=3533ms, difficulty={'n/a': 40}
- **controller**: 40/40 OK, local=39, remote=1, avg=3263ms, difficulty={'n/a': 40}
- **hybrid**: 40/40 OK, local=31, remote=9, avg=3509ms, difficulty={'easy': 29, 'medium': 6, 'hard': 5}

## Strategy matrix (abbreviated)

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

## Cache probe sequence

- **p26-cache-easy-a**: difficulty=easy, cacheHit=True, invalidated=None, reasons=None
- **p27-cache-easy-b**: difficulty=easy, cacheHit=True, invalidated=None, reasons=None
- **p28-cache-hard-a**: difficulty=medium, cacheHit=None, invalidated=True, reasons=['code-or-schema-change', 'tool-count-delta']
- **p29-cache-hard-b**: difficulty=medium, cacheHit=True, invalidated=None, reasons=None
- **p30-cache-invalidate**: difficulty=medium, cacheHit=True, invalidated=None, reasons=None
- **p31-cache-strategy-switch**: difficulty=easy, cacheHit=None, invalidated=True, reasons=['code-or-schema-change', 'tool-count-delta']

## Per-run results

### e01-yes-no__difficulty (easy-trivial)

- HTTP: 200 | Latency: 2042ms
- Strategy header: `difficulty` | Label: `difficulty`
- Endpoint: `remote` (remote)
- Difficulty: `easy` / `cost`
- Cache: hit=`None` invalidated=`True` reasons=`['code-or-schema-change', 'tool-count-delta']`
- Rubric: `{"contextTokens": 11, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: 'The user wants a yes or no'

### e01-yes-no__baseline (easy-trivial)

- HTTP: 200 | Latency: 389ms
- Strategy header: `baseline` | Label: `baseline`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: 'Yes'

### e01-yes-no__controller (easy-trivial)

- HTTP: 200 | Latency: 402ms
- Strategy header: `controller` | Label: `controller`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: 'Yes.'

### e01-yes-no__hybrid (easy-trivial)

- HTTP: 200 | Latency: 428ms
- Strategy header: `hybrid` | Label: `hybrid`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 11, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: 'Yes.'

### e02-single-word__difficulty (easy-trivial)

- HTTP: 200 | Latency: 396ms
- Strategy header: `difficulty` | Label: `difficulty`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 8, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: 'ok'

### e02-single-word__baseline (easy-trivial)

- HTTP: 200 | Latency: 377ms
- Strategy header: `baseline` | Label: `baseline`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: 'ok'

### e02-single-word__controller (easy-trivial)

- HTTP: 200 | Latency: 426ms
- Strategy header: `controller` | Label: `controller`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: 'ok'

### e02-single-word__hybrid (easy-trivial)

- HTTP: 200 | Latency: 399ms
- Strategy header: `hybrid` | Label: `hybrid`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 8, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: 'Ok'

### e03-count__difficulty (easy-trivial)

- HTTP: 200 | Latency: 583ms
- Strategy header: `difficulty` | Label: `difficulty`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 12, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: '1, 2, 3'

### e03-count__baseline (easy-trivial)

- HTTP: 200 | Latency: 570ms
- Strategy header: `baseline` | Label: `baseline`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: '1, 2, 3'

### e03-count__controller (easy-trivial)

- HTTP: 200 | Latency: 563ms
- Strategy header: `controller` | Label: `controller`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: '1, 2, 3'

### e03-count__hybrid (easy-trivial)

- HTTP: 200 | Latency: 591ms
- Strategy header: `hybrid` | Label: `hybrid`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 12, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: '1, 2, 3'

### e04-capitalize__difficulty (easy-trivial)

- HTTP: 200 | Latency: 452ms
- Strategy header: `difficulty` | Label: `difficulty`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 9, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: 'Hello World'

### e04-capitalize__baseline (easy-trivial)

- HTTP: 200 | Latency: 404ms
- Strategy header: `baseline` | Label: `baseline`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: 'Hello World'

### e04-capitalize__controller (easy-trivial)

- HTTP: 200 | Latency: 415ms
- Strategy header: `controller` | Label: `controller`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: 'Hello World'

### e04-capitalize__hybrid (easy-trivial)

- HTTP: 200 | Latency: 452ms
- Strategy header: `hybrid` | Label: `hybrid`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 9, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: 'Hello World'

### e05-emoji__difficulty (easy-trivial)

- HTTP: 200 | Latency: 521ms
- Strategy header: `difficulty` | Label: `difficulty`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 10, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: '☀️✨'

### e05-emoji__baseline (easy-trivial)

- HTTP: 200 | Latency: 405ms
- Strategy header: `baseline` | Label: `baseline`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: '😊'

### e05-emoji__controller (easy-trivial)

- HTTP: 200 | Latency: 428ms
- Strategy header: `controller` | Label: `controller`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: '😊'

### e05-emoji__hybrid (easy-trivial)

- HTTP: 200 | Latency: 448ms
- Strategy header: `hybrid` | Label: `hybrid`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 10, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: '😊'

### e06-timezone__difficulty (easy-trivial)

- HTTP: 200 | Latency: 410ms
- Strategy header: `difficulty` | Label: `difficulty`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 11, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: 'UTC'

### e06-timezone__baseline (easy-trivial)

- HTTP: 200 | Latency: 576ms
- Strategy header: `baseline` | Label: `baseline`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: 'UTC stands for Coordinated Universal Time.'

### e06-timezone__controller (easy-trivial)

- HTTP: 200 | Latency: 383ms
- Strategy header: `controller` | Label: `controller`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: 'UTC'

### e06-timezone__hybrid (easy-trivial)

- HTTP: 200 | Latency: 609ms
- Strategy header: `hybrid` | Label: `hybrid`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 11, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: 'UTC stands for Coordinated Universal Time.'

### e07-boolean__difficulty (easy-trivial)

- HTTP: 200 | Latency: 836ms
- Strategy header: `difficulty` | Label: `difficulty`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 13, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: 'True. By default, most web servers and websites use HTTP (Hypertext'

### e07-boolean__baseline (easy-trivial)

- HTTP: 200 | Latency: 804ms
- Strategy header: `baseline` | Label: `baseline`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: 'The statement is **true**. By default, HTTP traffic over TCP uses'

### e07-boolean__controller (easy-trivial)

- HTTP: 200 | Latency: 895ms
- Strategy header: `controller` | Label: `controller`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: 'True. By default, HTTP (HyperText Transfer Protocol) uses port'

### e07-boolean__hybrid (easy-trivial)

- HTTP: 200 | Latency: 798ms
- Strategy header: `hybrid` | Label: `hybrid`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 13, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: 'True. By default, HTTP traffic uses port 80 for communication between clients'

### e08-format-json__difficulty (easy-trivial)

- HTTP: 200 | Latency: 577ms
- Strategy header: `difficulty` | Label: `difficulty`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 14, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: 'name: true  \nvalue: true'

### e08-format-json__baseline (easy-trivial)

- HTTP: 200 | Latency: 550ms
- Strategy header: `baseline` | Label: `baseline`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: 'name: true  \nvalue: true'

### e08-format-json__controller (easy-trivial)

- HTTP: 200 | Latency: 551ms
- Strategy header: `controller` | Label: `controller`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: '{"name": "JSON"}'

### e08-format-json__hybrid (easy-trivial)

- HTTP: 200 | Latency: 628ms
- Strategy header: `hybrid` | Label: `hybrid`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 14, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: 'name: true  \nvalue: true'

### p01-easy-greet__difficulty (easy-short)

- HTTP: 200 | Latency: 643ms
- Strategy header: `difficulty` | Label: `difficulty`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 9, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: 'Hello! How can I assist you today?'

### p01-easy-greet__baseline (easy-short)

- HTTP: 200 | Latency: 652ms
- Strategy header: `baseline` | Label: `baseline`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: 'Hello! How can I assist you today?'

### p01-easy-greet__controller (easy-short)

- HTTP: 200 | Latency: 621ms
- Strategy header: `controller` | Label: `controller`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: 'Hello! How can I assist you today?'

### p01-easy-greet__hybrid (easy-short)

- HTTP: 200 | Latency: 663ms
- Strategy header: `hybrid` | Label: `hybrid`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 9, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: 'Hello! How can I assist you today?'

### p02-easy-math__difficulty (easy-short)

- HTTP: 200 | Latency: 437ms
- Strategy header: `difficulty` | Label: `difficulty`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 13, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: '4'

### p02-easy-math__baseline (easy-short)

- HTTP: 200 | Latency: 396ms
- Strategy header: `baseline` | Label: `baseline`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: '4'

### p02-easy-math__controller (easy-short)

- HTTP: 200 | Latency: 371ms
- Strategy header: `controller` | Label: `controller`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: '4'

### p02-easy-math__hybrid (easy-short)

- HTTP: 200 | Latency: 415ms
- Strategy header: `hybrid` | Label: `hybrid`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 13, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: '4'

### p03-easy-define__difficulty (easy-short)

- HTTP: 200 | Latency: 1012ms
- Strategy header: `difficulty` | Label: `difficulty`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 8, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: 'An API is a set of rules and protocols for building and interacting with web services.'

### p03-easy-define__baseline (easy-short)

- HTTP: 200 | Latency: 1196ms
- Strategy header: `baseline` | Label: `baseline`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: 'API stands for Application Programming Interface, which allows different software applications to communicate with each other by defining a set of rules and protocols.'

### p03-easy-define__controller (easy-short)

- HTTP: 200 | Latency: 1167ms
- Strategy header: `controller` | Label: `controller`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: 'An API is a set of rules and protocols for building applications and exchanging data between systems.'

### p03-easy-define__hybrid (easy-short)

- HTTP: 200 | Latency: 1087ms
- Strategy header: `hybrid` | Label: `hybrid`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 8, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: 'An API is a set of rules and protocols for building and interacting with software applications.'

### p04-easy-translate__difficulty (easy-short)

- HTTP: 200 | Latency: 911ms
- Strategy header: `difficulty` | Label: `difficulty`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 11, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: '"Bonsoir" is the correct translation for "Good Morning" in French'

### p04-easy-translate__baseline (easy-short)

- HTTP: 200 | Latency: 869ms
- Strategy header: `baseline` | Label: `baseline`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: '"Bonsoir" or "Bonjour" can be used, depending on'

### p04-easy-translate__controller (easy-short)

- HTTP: 200 | Latency: 480ms
- Strategy header: `controller` | Label: `controller`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: 'Bonjour !'

### p04-easy-translate__hybrid (easy-short)

- HTTP: 200 | Latency: 914ms
- Strategy header: `hybrid` | Label: `hybrid`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 11, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: 'The translation of "Good morning" in French is **"Bonjour"'

### p05-easy-list__difficulty (easy-short)

- HTTP: 200 | Latency: 1027ms
- Strategy header: `difficulty` | Label: `difficulty`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 7, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: 'Here are three colors:  \n1. Red  \n2. Blue  \n3. Green'

### p05-easy-list__baseline (easy-short)

- HTTP: 200 | Latency: 1297ms
- Strategy header: `baseline` | Label: `baseline`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: 'Here are three colors:\n\n1. **Blue**  \n2. **Green**  \n3. **Red**'

### p05-easy-list__controller (easy-short)

- HTTP: 200 | Latency: 1193ms
- Strategy header: `controller` | Label: `controller`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: 'Here are three colors: **Red**, **Blue**, and **Green**! 🌈  \nLet'

### p05-easy-list__hybrid (easy-short)

- HTTP: 200 | Latency: 1252ms
- Strategy header: `hybrid` | Label: `hybrid`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 7, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: 'Certainly! Here are three examples of colors:\n\n1. Red  \n2. Blue  \n3. Green'

### p06-medium-explain__difficulty (medium-qa)

- HTTP: 200 | Latency: 5300ms
- Strategy header: `difficulty` | Label: `difficulty`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 24, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: 'A **reverse proxy** is a server that sits between clients (like web browsers or API consumers) and backend servers. Its main role is to act on behalf of the backend servers, routing requests, handling load balancing, caching responses, and sometimes modifying traffic before it re'

### p06-medium-explain__baseline (medium-qa)

- HTTP: 200 | Latency: 4686ms
- Strategy header: `baseline` | Label: `baseline`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: 'A **reverse proxy** is a server or service that sits between clients (like web browsers) and servers, acting as an intermediary. It forwards requests from the client to the backend server (such as a machine learning model runtime), handles routing, caching, SSL termination, load '

### p06-medium-explain__controller (medium-qa)

- HTTP: 200 | Latency: 4655ms
- Strategy header: `controller` | Label: `controller`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: 'A **reverse proxy** is a server that sits between clients (such as web browsers) and servers, acting on behalf of the latter. Instead of clients communicating directly with each other or with backend services, they communicate through this intermediary device—often to improve per'

### p06-medium-explain__hybrid (medium-qa)

- HTTP: 200 | Latency: 4704ms
- Strategy header: `hybrid` | Label: `hybrid`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 24, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: 'A **reverse proxy** is a server that sits between clients (such as web browsers) and servers, acting as an intermediary for communication. It forwards client requests to the appropriate backend server, handles load balancing, and can perform tasks like SSL termination, caching, r'

### p07-medium-compare__difficulty (medium-qa)

- HTTP: 200 | Latency: 5738ms
- Strategy header: `difficulty` | Label: `difficulty`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 27, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 1, "codeOrSchemaBurden": false}`
- Output: '**Local Inference (On-device processing)**  \n- **Pros:**  \n  - Fast response times – data is processed locally, reducing latency.  \n  - Enhanced privacy & security – sensitive information stays on the device.  \n  - No network dependency – works offline or with poor connectivity. '

### p07-medium-compare__baseline (medium-qa)

- HTTP: 200 | Latency: 5736ms
- Strategy header: `baseline` | Label: `baseline`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: '**Local Inference vs Remote API for a Personal Assistant**\n\n### **Local Inference**\n- **Pros:**\n  - Lower latency (data processed closer to device)\n  - Improved privacy (data stays on the device)\n  - No network dependency required\n  - Potentially better offline functionality\n- **'

### p07-medium-compare__controller (medium-qa)

- HTTP: 200 | Latency: 5707ms
- Strategy header: `controller` | Label: `controller`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: "Sure! Here's a comparison between **local inference** and **remote API** for a personal assistant, with pros and cons:\n\n---\n\n### **Local Inference**\n**Pros:**\n- Low latency – responses are faster since processing happens on-device.\n- No network dependency – works offline when con"

### p07-medium-compare__hybrid (medium-qa)

- HTTP: 200 | Latency: 5827ms
- Strategy header: `hybrid` | Label: `hybrid`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 27, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 1, "codeOrSchemaBurden": false}`
- Output: '**Local Inference vs Remote API for a Personal Assistant: Pros and Cons**\n\n### Local Inference  \n- **Pros:**  \n  - Fast response time (no network latency)  \n  - Lower bandwidth usage  \n  - Enhanced privacy (data stays on device)  \n  - No dependency on internet connection  \n  - Cu'

### p08-medium-summarize__difficulty (medium-qa)

- HTTP: 200 | Latency: 2526ms
- Strategy header: `difficulty` | Label: `difficulty`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 25, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: 'Difficulty-based routing helps match models in a **mixed local-remote pool** to their optimal inference cost, reducing latency and improving efficiency. By directing requests to models best suited for each task’s complexity, it enhances performance, balances load, and optimizes r'

### p08-medium-summarize__baseline (medium-qa)

- HTTP: 200 | Latency: 4362ms
- Strategy header: `baseline` | Label: `baseline`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: 'Difficulty-based routing offers several advantages when managing **mixed local and remote model pools**:\n\n1. **Improved Load Balancing:**  \n   It dynamically routes traffic based on model difficulty, ensuring that more challenging models are paired with appropriately skilled work'

### p08-medium-summarize__controller (medium-qa)

- HTTP: 200 | Latency: 4383ms
- Strategy header: `controller` | Label: `controller`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: 'Difficulty-based routing in mixed local and remote model pools offers several advantages:\n\n1. **Improved Model Selection:** It helps match models with appropriate difficulty levels to specific user queries, enhancing relevance and accuracy.\n2. **Optimized Performance:** By direct'

### p08-medium-summarize__hybrid (medium-qa)

- HTTP: 200 | Latency: 4425ms
- Strategy header: `hybrid` | Label: `hybrid`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 25, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: 'Difficulty-based routing offers several key benefits when used with a mix of local and remote models:\n\n1. **Optimized Performance:** It directs requests to the most suitable model based on current conditions, enhancing speed and responsiveness.  \n2. **Load Balancing:** Helps dist'

### p09-medium-howto__difficulty (medium-qa)

- HTTP: 200 | Latency: 4677ms
- Strategy header: `difficulty` | Label: `difficulty`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 24, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 1, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: 'To configure an **OpenAI-compatible client** (such as the one in **Prometheus Stack** or an open-source project like **openai-python**, **pyodini**, etc.) to point at a local runtime on port 3456, you need to make sure your client is set up to use **localhost:3456** instead of a '

### p09-medium-howto__baseline (medium-qa)

- HTTP: 200 | Latency: 4635ms
- Strategy header: `baseline` | Label: `baseline`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: "To configure an **OpenAI-compatible client** (such as the official `openai-python` or similar wrappers) to point at a local runtime on **port 3456**, you'll need to set up your environment and proxy appropriately. Here's a step-by-step guide:\n\n---\n\n### ✅ 1. Understand the Require"

### p09-medium-howto__controller (medium-qa)

- HTTP: 200 | Latency: 4667ms
- Strategy header: `controller` | Label: `controller`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: "To configure an **OpenAI-compatible client** (e.g., using `llama.cpp` or a web interface) to point at a **local runtime on port 3456**, you need to set up the service so it listens for incoming connections on that port. Here's how to do it for both command-line and GUI-based clie"

### p09-medium-howto__hybrid (medium-qa)

- HTTP: 200 | Latency: 4695ms
- Strategy header: `hybrid` | Label: `hybrid`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 24, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 1, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: 'To configure an OpenAI-compatible client (like Chatbot Arena or Repl.it) to use a **local runtime** on **port 3456**, you need to ensure the following steps are taken:\n\n1. **Verify your local environment is ready for webAssembly execution**  \n   - You must be running Node.js with'

### p10-long-context__difficulty (long-context)

- HTTP: 200 | Latency: 3148ms
- Strategy header: `difficulty` | Label: `difficulty`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 154, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: '- **Two Root Causes:**\n  - Default throughput SLA was hard-denied for remote endpoints under a sub-24 tps limit.\n  - Allowed only certain endpoint types, excluding necessary ones due to configuration restrictions.\n\n- **Fixes Implemented:**\n  - Restored routing strategy via merge-'

### p10-long-context__baseline (long-context)

- HTTP: 200 | Latency: 3747ms
- Strategy header: `baseline` | Label: `baseline`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: '- **Root Cause 1:**  \n  - Hard-dened remote endpoints to a sub-24 tps throughput SLA, preventing them from being utilized effectively.\n\n- **Root Cause 2:**  \n  - Default configuration SLA restrictions overriding local routing capabilities, causing execution failures for certain e'

### p10-long-context__controller (long-context)

- HTTP: 200 | Latency: 4124ms
- Strategy header: `controller` | Label: `controller`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: '### Root Causes:\n- **Hard-denied SLA for remote endpoints:** Default throughput SLAs were not met, preventing sub-24 tps remote endpoints from being allowed.\n- **Inconsistent telemetry data regarding endpoint status:** Unknown.endpoint and execution_failed states hindered accurat'

### p10-long-context__hybrid (long-context)

- HTTP: 200 | Latency: 3275ms
- Strategy header: `hybrid` | Label: `hybrid`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 154, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: '- **Root Causes**\n  - Default throughput SLA hard-denied sub-24 tps remote endpoints when they were the only allow-listed candidate.\n  - Telemetry indicated execution failed due to unknown endpoint configuration issues.\n\n- **Fixes Implemented**\n  - Routing strategy adjustments:\n '

### p11-long-multi-turn__difficulty (long-context)

- HTTP: 200 | Latency: 6896ms
- Strategy header: `difficulty` | Label: `difficulty`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 60, "toolCount": 0, "historyTurnCount": 3, "instructionConstraintCount": 2, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: "Here's an extended checklist incorporating **logs**, **telemetry**, and **Strategy A/B (A) vs. B) validation** for validating packaged runtime consumption:\n\n---\n\n### **Runtime Consumption Validation Checklist**  \n*(Expanded to include logs, telemetry, and Strategy comparisons)*  "

### p11-long-multi-turn__baseline (long-context)

- HTTP: 200 | Latency: 6851ms
- Strategy header: `baseline` | Label: `baseline`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: "Here's an extended checklist incorporating **logs**, **telemetry**, and **Strategy A (Alias) tests** for validating packaged runtime consumption:\n\n---\n\n### **Runtime Consumption Validation Checklist**  \n*(Extended with Logs, Telemetry, and Strategy A Alias Tests)*  \n\n#### **1. Pr"

### p11-long-multi-turn__controller (long-context)

- HTTP: 200 | Latency: 6805ms
- Strategy header: `controller` | Label: `controller`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: "Certainly! Here's an extended version of the checklist incorporating **logs**, **telemetry**, and **Strategy A/B testing** to validate packaged runtime consumption:\n\n---\n\n### **Checklist for Validating Packaged Runtime Consumption**  \n*(Includes Logging, Telemetry, and Strategy V"

### p11-long-multi-turn__hybrid (long-context)

- HTTP: 200 | Latency: 6911ms
- Strategy header: `hybrid` | Label: `hybrid`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 60, "toolCount": 0, "historyTurnCount": 3, "instructionConstraintCount": 2, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: "Here's an extended checklist incorporating **logs**, **telemetry**, and **Strategy Alias Tests (SAT)** for validating packaged runtime consumption:\n\n---\n\n### **Expanded Validation Checklist**  \n*(Extending original items with logs, telemetry, and SAT)*  \n\n#### 1. **Verify Local P"

### l01-verbose-incident__difficulty (long-context)

- HTTP: 200 | Latency: 2462ms
- Strategy header: `difficulty` | Label: `difficulty`
- Endpoint: `local` (local)
- Difficulty: `medium` / `balanced`
- Cache: hit=`None` invalidated=`True` reasons=`['code-or-schema-change']`
- Rubric: `{"contextTokens": 362, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 2, "decompositionKeywordCount": 1, "codeOrSchemaBurden": true}`
- Output: 'Difficulty-based routing selects network paths according to the computational complexity of a task.'

### l01-verbose-incident__baseline (long-context)

- HTTP: 200 | Latency: 937ms
- Strategy header: `baseline` | Label: `baseline`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: 'Difficulty-based routing involves directing data through paths that match the computational complexity and resource needs of the processing task.'

### l01-verbose-incident__controller (long-context)

- HTTP: 200 | Latency: 759ms
- Strategy header: `controller` | Label: `controller`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: 'Difficulty-based routing selects network paths according to the processing complexity of requests.'

### l01-verbose-incident__hybrid (long-context)

- HTTP: 200 | Latency: 4181ms
- Strategy header: `hybrid` | Label: `hybrid`
- Endpoint: `remote` (remote)
- Difficulty: `medium` / `balanced`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 362, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 2, "decompositionKeywordCount": 1, "codeOrSchemaBurden": true}`
- Output: 'The user wants a one-sentence definition of "difficulty-based routing" based on the provided background notes. The background notes are a jumble of keywords and phrases related to routing, telemetry, cache, model selection, etc. I need to extract the concept and provide a concise'

### l02-many-constraints__difficulty (long-context)

- HTTP: 200 | Latency: 3960ms
- Strategy header: `difficulty` | Label: `difficulty`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`None` invalidated=`True` reasons=`['code-or-schema-change']`
- Rubric: `{"contextTokens": 90, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 2, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: '- Remote endpoints often provide better data freshness for timely decisions  \n- Cache invalidation can occur due to frequent updates from remote sources  \n- Rubric signals help identify which resources need immediate refreshing  \n- Local access may lag if network conditions are u'

### l02-many-constraints__baseline (long-context)

- HTTP: 200 | Latency: 3086ms
- Strategy header: `baseline` | Label: `baseline`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: '- Remote endpoints often provide fresher data for timely decisions  \n- Cache invalidation occurs due to frequent updates or security patches  \n- Rubric signals highlight performance gaps that favor external sources  \n- Local networks may lag, making remote more reliable in real-t'

### l02-many-constraints__controller (long-context)

- HTTP: 200 | Latency: 3459ms
- Strategy header: `controller` | Label: `controller`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: '- Local endpoints offer faster access for nearby requests, while remote can serve global users efficiently.  \n- Cache invalidation may occur due to frequent updates in the cloud environment.  \n- Rubric signals highlight performance gains from remote data sourcing.  \n- Remote endp'

### l02-many-constraints__hybrid (long-context)

- HTTP: 200 | Latency: 3698ms
- Strategy header: `hybrid` | Label: `hybrid`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 90, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 2, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: '- Remote endpoints offer better access to real-time data for up-to-date strategies.  \n- Cache invalidation reasons include frequent updates and higher latency in local storage.  \n- Rubric signals indicate performance bottlenecks favoring remote resources.  \n- Strategic use of rem'

### p12-code-patch__difficulty (code-burden)

- HTTP: 200 | Latency: 4689ms
- Strategy header: `difficulty` | Label: `difficulty`
- Endpoint: `local` (local)
- Difficulty: `medium` / `balanced`
- Cache: hit=`None` invalidated=`True` reasons=`['code-or-schema-change', 'decomposition-keyword-delta']`
- Rubric: `{"contextTokens": 29, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 3, "codeOrSchemaBurden": true}`
- Output: "To provide you with an accurate **unified Diff patch** and explanation of the refactor, I need to see the actual code in `src/router.ts`. However, since the code isn't visible here, I'll guide you through the general process and provide a template for analyzing and editing such a"

### p12-code-patch__baseline (code-burden)

- HTTP: 200 | Latency: 4647ms
- Strategy header: `baseline` | Label: `baseline`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: "Let's break down your request into three parts:\n\n1. **Code-Edit Workflow Analysis**  \n2. **Unified Diff Patch for `src/router.ts`**  \n3. **Refactor Explanation**\n\n---\n\n### 1. Code-Edit Workflow Analysis\n\nThe process typically involves the following steps:\n- Reviewing code changes"

### p12-code-patch__controller (code-burden)

- HTTP: 200 | Latency: 4668ms
- Strategy header: `controller` | Label: `controller`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: "To analyze a **code edit workflow** (specifically a `unifieddiff` output) and explain a refactor on the file `src/router.ts`, we need to understand what the workflow is trying to accomplish.\n\nHowever, since you haven't provided the actual code or diff, I'll assume a typical scena"

### p12-code-patch__hybrid (code-burden)

- HTTP: 200 | Latency: 4693ms
- Strategy header: `hybrid` | Label: `hybrid`
- Endpoint: `local` (local)
- Difficulty: `medium` / `balanced`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 29, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 3, "codeOrSchemaBurden": true}`
- Output: "Certainly! Let's break down your request step-by-step:\n\n### 1. **Understand the Task**\n\nYou want an analysis of a code-edit workflow in `src/router.ts`, and you need to produce a unified diff (patch) for that file. You also want to explain what the refactor is about.\n\n**Assumptio"

### p13-code-debug__difficulty (code-burden)

- HTTP: 200 | Latency: 5847ms
- Strategy header: `difficulty` | Label: `difficulty`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`None` invalidated=`True` reasons=`['code-or-schema-change', 'decomposition-keyword-delta']`
- Rubric: `{"contextTokens": 42, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 1, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: "Certainly! Let's break down your error and what you can do about it.\n\n---\n\n### 🔍 Error Message Explanation:\n```\nChosen endpoint is not present in the registry result. The chosen_endpoint_id is empty.\n```\n\nThis TypeScript error occurs during a request that expects a valid `chosen_"

### p13-code-debug__baseline (code-burden)

- HTTP: 200 | Latency: 5795ms
- Strategy header: `baseline` | Label: `baseline`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: "The TypeScript error you're encountering:\n\n```\nChosen endpoint is not present in the registry result. The chosen_endpoint_id is empty.\nWhat eligibility checks should I inspect?\n```\n\nindicates that your application tried to set a `chosen_endpoint_id` but did not provide one, and t"

### p13-code-debug__controller (code-burden)

- HTTP: 200 | Latency: 5827ms
- Strategy header: `controller` | Label: `controller`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: "The TypeScript error you're encountering:\n\n```\nChosen endpoint is not present in the registry result. The chosen_endpoint_id is empty.\nWhat eligibility checks should I inspect?\n```\n\n...indicates that your code tried to use a `chosen_endpoint_id` (or similar field), but it was eit"

### p13-code-debug__hybrid (code-burden)

- HTTP: 200 | Latency: 5842ms
- Strategy header: `hybrid` | Label: `hybrid`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 42, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 1, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: "You're encountering the following TypeScript runtime error:\n\n> **Chosen endpoint is not present in the registry result. The chosen_endpoint_id is empty.**\n\nThis usually happens when you're trying to access or set a `chosen_endpoint_id` that hasn't been properly retrieved from you"

### p14-schema-validate__difficulty (code-burden)

- HTTP: 200 | Latency: 4688ms
- Strategy header: `difficulty` | Label: `difficulty`
- Endpoint: `local` (local)
- Difficulty: `medium` / `balanced`
- Cache: hit=`None` invalidated=`True` reasons=`['code-or-schema-change']`
- Rubric: `{"contextTokens": 30, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 1, "codeOrSchemaBurden": true}`
- Output: 'Absolutely! Let\'s break down your request step by step:\n\n## 1. **Understand Your Task**\n\nYou want to:\n- Validate a JSON schema for "routing diagnostics."\n- Refactor any tests that rely on this schema if any fields are missing.\n- Provide you with an example or guide.\n\n### Assumpti'

### p14-schema-validate__baseline (code-burden)

- HTTP: 200 | Latency: 4686ms
- Strategy header: `baseline` | Label: `baseline`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: 'To validate a **JSON schema contract for routing diagnostics**, we first need to understand what the schema is supposed to validate. Since your question mentions "routing diagnostics," I’ll assume you\'re working with a system that validates or verifies routes (e.g., in an API gat'

### p14-schema-validate__controller (code-burden)

- HTTP: 200 | Latency: 4645ms
- Strategy header: `controller` | Label: `controller`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: "I'm not able to see the specific JSON schema contract you're referring to.  \n\nTo help you effectively, please provide:\n- The current version of your JSON schema.\n- Any details about the intended validations for routing diagnostics (e.g., required fields, constraints on paths or p"

### p14-schema-validate__hybrid (code-burden)

- HTTP: 200 | Latency: 4701ms
- Strategy header: `hybrid` | Label: `hybrid`
- Endpoint: `local` (local)
- Difficulty: `medium` / `balanced`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 30, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 1, "codeOrSchemaBurden": true}`
- Output: "Sure, let's break down your request step by step:\n\n---\n\n## **1. Understanding Your Request**\n\nYou want to:\n- Validate a **JSON schema contract** related to routing diagnostics.\n- Refactor the corresponding **test suite** if any required fields are missing.\n\nHowever, you haven’t p"

### c01-full-refactor__difficulty (code-burden)

- HTTP: 200 | Latency: 7173ms
- Strategy header: `difficulty` | Label: `difficulty`
- Endpoint: `local` (local)
- Difficulty: `medium` / `balanced`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 67, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 3, "codeOrSchemaBurden": true}`
- Output: '### **Analysis of Code-Edit Workflow for `router.ts`**\n\nLet’s walk through the typical workflow:  \n1. **Review & Understand Requirements:**  \n   - Check what `routingDiagnostics.difficultyRouting` is intended to do.\n2. **Code Review:**  \n   - Ensure proper type definitions, error'

### c01-full-refactor__baseline (code-burden)

- HTTP: 200 | Latency: 7188ms
- Strategy header: `baseline` | Label: `baseline`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: "Certainly! Let's walk through the **code-edit workflow** for `router.ts` in detail, focusing on the following key steps:\n\n---\n\n## 🔍 **1. Analyze the Code-Edit Workflow for `router.ts`**\n\nAssuming we're working with a large-scale TypeScript project using a build tool (e.g., Webpac"

### c01-full-refactor__controller (code-burden)

- HTTP: 200 | Latency: 7135ms
- Strategy header: `controller` | Label: `controller`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: '### Analysis of `router.ts` Code-Edit Workflow\n\n#### 1. **Code Edit Workflow Overview**\nThe workflow typically includes:\n1. **Review**: Understand the current structure and logic.\n2. **Refactor**: Improve readability, maintainability, and performance.\n3. **Test Update**: Ensure e'

### c01-full-refactor__hybrid (code-burden)

- HTTP: 200 | Latency: 4839ms
- Strategy header: `hybrid` | Label: `hybrid`
- Endpoint: `remote` (remote)
- Difficulty: `medium` / `balanced`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 67, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 3, "codeOrSchemaBurden": true}`
- Output: 'We need answer user request: "You are a senior engineer. Analyze the code-edit workflow for router.ts, produce a unified diff patch, validate the JSON schema contract for routingDiagnostics.difficultyRouting, refactor conformance tests, and explain each change with before/after e'

### c02-ts-generics__difficulty (code-burden)

- HTTP: 200 | Latency: 3689ms
- Strategy header: `difficulty` | Label: `difficulty`
- Endpoint: `remote` (remote)
- Difficulty: `medium` / `balanced`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 38, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 0, "codeOrSchemaBurden": true}`
- Output: 'We need answer user\'s request: "Fix this TypeScript generic inference bug in evaluateEligibility<T extends EndpointCandidate> and show the patch hunk plus unit test updates."\n\nWe need infer context. No code provided. Must produce a patch hunk and unit test updates for evaluateEli'

### c02-ts-generics__baseline (code-burden)

- HTTP: 200 | Latency: 5827ms
- Strategy header: `baseline` | Label: `baseline`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: 'Sure! Let’s walk through fixing the generic inference issue in `evaluateEligibility<T extends EndpointCandidate>()`, then provide a corrected version along with a unit test example.\n\n---\n\n### **Issue:**\nSometimes TypeScript infers `T` incorrectly because of missing constraints or'

### c02-ts-generics__controller (code-burden)

- HTTP: 200 | Latency: 5792ms
- Strategy header: `controller` | Label: `controller`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: 'To fix the **generic inference bug** in the `evaluateEligibility<T extends EndpointCandidate>()` function, we need to address how TypeScript infers the generic bounds on `T`. In your current version, it likely assumes that `EndpointCandidate` is a specific type or interface with '

### c02-ts-generics__hybrid (code-burden)

- HTTP: 200 | Latency: 4964ms
- Strategy header: `hybrid` | Label: `hybrid`
- Endpoint: `remote` (remote)
- Difficulty: `medium` / `balanced`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 38, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 0, "codeOrSchemaBurden": true}`
- Output: 'We need answer user\'s request: "Fix this TypeScript generic inference bug in evaluateEligibility<T extends EndpointCandidate> and show the patch hunk plus unit test updates."\n\nBut user didn\'t provide code. We need infer likely bug. Let\'s parse: They mention a TypeScript generic i'

### p15-tools-read-one__difficulty (tools-light)

- HTTP: 200 | Latency: 2326ms
- Strategy header: `difficulty` | Label: `difficulty`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`None` invalidated=`True` reasons=`['code-or-schema-change']`
- Rubric: `{"contextTokens": 19, "toolCount": 1, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: 'I don\'t have access to tools that can analyze configuration files or extract details like a "routing strategy" from a file. My current capabilities are limited to reading files using the `read_file` tool. You may need to provide the specific file path so I can attempt to read its'

### p15-tools-read-one__baseline (tools-light)

- HTTP: 200 | Latency: 2503ms
- Strategy header: `baseline` | Label: `baseline`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: "I don't have access to tools that can analyze configuration files or determine routing strategies from text data. The available `read_file` tool only allows reading raw files, not parsing configurations. You'll need to provide the specific file path for me to attempt reading it, "

### p15-tools-read-one__controller (tools-light)

- HTTP: 200 | Latency: 3175ms
- Strategy header: `controller` | Label: `controller`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: "I don't have access to tools that can analyze or interpret configuration files directly, including determining a routing strategy from a runtime config file. The only available tool here is `read_file`, which reads text-based content from a specified path but doesn't provide capa"

### p15-tools-read-one__hybrid (tools-light)

- HTTP: 200 | Latency: 2232ms
- Strategy header: `hybrid` | Label: `hybrid`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 19, "toolCount": 1, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: "The tools available to me are limited to reading files. I cannot execute code or access configuration details beyond what you provide directly. If you can share the content of the file or specify where it's stored, I may be able to help further. Let me know how you'd like to proc"

### p16-tools-search__difficulty (tools-light)

- HTTP: 200 | Latency: 2321ms
- Strategy header: `difficulty` | Label: `difficulty`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 22, "toolCount": 1, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: 'I am searching the entire codebase for the exact string "throughputSla" to locate its occurrences, then will analyze the results to highlight any sections or modules where this pattern appears and infer potential hard-deny points.'

### p16-tools-search__baseline (tools-light)

- HTTP: 200 | Latency: 2219ms
- Strategy header: `baseline` | Label: `baseline`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: 'I\'m searching the codebase for all occurrences of the pattern "throughputSla" to identify locations related to throughput SLA metrics. This will help pinpoint where such values or logic are defined and potentially flagged.'

### p16-tools-search__controller (tools-light)

- HTTP: 200 | Latency: 2417ms
- Strategy header: `controller` | Label: `controller`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: 'I am searching the entire codebase for occurrences of the term "throughputSla" to locate relevant sections that discuss SLA (Service Level Agreement) throughput metrics. This will help identify where hard-deny conditions or constraints are defined.'

### p16-tools-search__hybrid (tools-light)

- HTTP: 200 | Latency: 1755ms
- Strategy header: `hybrid` | Label: `hybrid`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 22, "toolCount": 1, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: 'I am searching the codebase for all occurrences of the string "throughputSla" to identify its location and context within the code.'

### t01-tools-list-dir__difficulty (tools-light)

- HTTP: 200 | Latency: 3548ms
- Strategy header: `difficulty` | Label: `difficulty`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 22, "toolCount": 1, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: "The function `list_dir` can list files in a specified directory, but it doesn't support filtering or summarizing specific types of files like routing-related ones. If you provide the path to your config directory, I can list its contents for you to review manually. \n\nWould you li"

### t01-tools-list-dir__baseline (tools-light)

- HTTP: 200 | Latency: 503ms
- Strategy header: `baseline` | Label: `baseline`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: ''

### t01-tools-list-dir__controller (tools-light)

- HTTP: 200 | Latency: 501ms
- Strategy header: `controller` | Label: `controller`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: ''

### t01-tools-list-dir__hybrid (tools-light)

- HTTP: 200 | Latency: 581ms
- Strategy header: `hybrid` | Label: `hybrid`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 22, "toolCount": 1, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: ''

### p17-tools-multi-hard__difficulty (tools-heavy)

- HTTP: 200 | Latency: 7003ms
- Strategy header: `difficulty` | Label: `difficulty`
- Endpoint: `remote` (remote)
- Difficulty: `hard` / `quality`
- Cache: hit=`None` invalidated=`True` reasons=`['code-or-schema-change', 'decomposition-keyword-delta']`
- Rubric: `{"contextTokens": 39, "toolCount": 2, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 3, "codeOrSchemaBurden": true}`
- Output: "The user wants me to analyze a code-edit workflow, read affected files, apply a patch, validate schema contract, and refactor tests. However, the user hasn't provided the actual patch, file paths, or schema details yet. \n\nWait, looking at the message again, it seems like the user"

### p17-tools-multi-hard__baseline (tools-heavy)

- HTTP: 200 | Latency: 5773ms
- Strategy header: `baseline` | Label: `baseline`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: "The tools provided do not align with the requested tasks. Here's a breakdown of the limitations:\n\n1. **Code-Edit Workflow Analysis**: No available tool to analyze or simulate code-edit workflows.\n2. **File Reading**: The `read_file` tool can read files but lacks functionality to "

### p17-tools-multi-hard__controller (tools-heavy)

- HTTP: 200 | Latency: 4435ms
- Strategy header: `controller` | Label: `controller`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: "The tools provided do not align with the requested tasks. Here's what I can clarify:\n\n1. **Code Edit Workflow**: To analyze the workflow, you'd need to define each component (e.g., steps for code review, testing, or validation).\n2. **Read Files**: The `read_file` tool is availabl"

### p17-tools-multi-hard__hybrid (tools-heavy)

- HTTP: 200 | Latency: 6918ms
- Strategy header: `hybrid` | Label: `hybrid`
- Endpoint: `remote` (remote)
- Difficulty: `hard` / `quality`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 39, "toolCount": 2, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 3, "codeOrSchemaBurden": true}`
- Output: "The user wants me to:\n1. Analyze a code-edit workflow\n2. Read affected files\n3. Apply a patch\n4. Validate schema contract\n5. Refactor tests with multiple tool calls\n\nHowever, the user hasn't provided:\n- The code-edit workflow details\n- The patch to apply\n- The affected files\n- Th"

### p18-tools-agent__difficulty (tools-heavy)

- HTTP: 200 | Latency: 538ms
- Strategy header: `difficulty` | Label: `difficulty`
- Endpoint: `local` (local)
- Difficulty: `medium` / `balanced`
- Cache: hit=`None` invalidated=`True` reasons=`['code-or-schema-change']`
- Rubric: `{"contextTokens": 36, "toolCount": 2, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 3, "codeOrSchemaBurden": false}`
- Output: ''

### p18-tools-agent__baseline (tools-heavy)

- HTTP: 200 | Latency: 1699ms
- Strategy header: `baseline` | Label: `baseline`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: "The tools provided do not include functionality for comparing latency profiles or recommending routing strategies. I can only list endpoints or retrieve metrics for specific endpoints if you provide their IDs. Let me know how you'd like to proceed!"

### p18-tools-agent__controller (tools-heavy)

- HTTP: 200 | Latency: 3125ms
- Strategy header: `controller` | Label: `controller`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: 'The requested tasks involve inspecting endpoints, comparing latency profiles, and recommending routing strategies, but the available tools do not support this functionality. The provided functions only allow listing endpoints or retrieving metrics for specific endpoints (via `lis'

### p18-tools-agent__hybrid (tools-heavy)

- HTTP: 200 | Latency: 513ms
- Strategy header: `hybrid` | Label: `hybrid`
- Endpoint: `local` (local)
- Difficulty: `medium` / `balanced`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 36, "toolCount": 2, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 3, "codeOrSchemaBurden": false}`
- Output: ''

### t02-tools-triple__difficulty (tools-heavy)

- HTTP: 200 | Latency: 8215ms
- Strategy header: `difficulty` | Label: `difficulty`
- Endpoint: `remote` (remote)
- Difficulty: `hard` / `quality`
- Cache: hit=`None` invalidated=`True` reasons=`['code-or-schema-change']`
- Rubric: `{"contextTokens": 48, "toolCount": 3, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 3, "codeOrSchemaBurden": true}`
- Output: 'The user wants me to analyze a code-edit workflow that involves several steps:\n1. Read affected files\n2. Grep for eligibility checks\n3. Apply a unified diff patch\n4. Validate JSON schema contract\n5. Refactor the test suite\n\nThis seems to be describing a typical code review or mod'

### t02-tools-triple__baseline (tools-heavy)

- HTTP: 200 | Latency: 6854ms
- Strategy header: `baseline` | Label: `baseline`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: "The provided tools do not align with the requested workflow steps. Here's an analysis of each component:\n\n1. **Read affected files**  \n   - Requires file input paths (not specified in tools). The `read_file` tool can handle this if provided with a path.\n\n2. **Grep for eligibility"

### t02-tools-triple__controller (tools-heavy)

- HTTP: 200 | Latency: 5477ms
- Strategy header: `controller` | Label: `controller`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: "The provided workflow involves multiple steps with specific tools, but none of the available functions directly support analyzing or refining code-edit workflows as described. Here's how I would break it down:\n\n1. **Read affected files**  \n   `read_file(path)` - Required for insp"

### t02-tools-triple__hybrid (tools-heavy)

- HTTP: 200 | Latency: 7811ms
- Strategy header: `hybrid` | Label: `hybrid`
- Endpoint: `remote` (remote)
- Difficulty: `hard` / `quality`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 48, "toolCount": 3, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 3, "codeOrSchemaBurden": true}`
- Output: "The user wants me to analyze a code-edit workflow involving several steps:\n1. Read affected files\n2. Grep for eligibility checks\n3. Apply a unified diff patch\n4. Validate JSON schema contract\n5. Refactor the test suite\n\nHowever, the user hasn't provided any actual files, patches,"

### t03-tools-agent-plan__difficulty (tools-heavy)

- HTTP: 200 | Latency: 7905ms
- Strategy header: `difficulty` | Label: `difficulty`
- Endpoint: `remote` (remote)
- Difficulty: `hard` / `quality`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 64, "toolCount": 3, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 3, "codeOrSchemaBurden": true}`
- Output: "I'll decompose this into milestones and execute each step. Let me start by exploring the codebase structure to locate the relevant files."

### t03-tools-agent-plan__baseline (tools-heavy)

- HTTP: 200 | Latency: 6522ms
- Strategy header: `baseline` | Label: `baseline`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: 'The request contains a complex sequence of actions involving multiple steps that require specific tools or data inputs which are not fully defined in your query. The available tools (`read_file`, `apply_patch`, `validate_schema`) do not align directly with the described agent pla'

### t03-tools-agent-plan__controller (tools-heavy)

- HTTP: 200 | Latency: 6251ms
- Strategy header: `controller` | Label: `controller`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: 'The provided tasks involve a complex sequence of operations (inspecting APIs, comparing metrics, validating schemas, patching code, and recommending strategies). However, none of the available tools are designed to execute this type of agent plan or multi-step workflow automation'

### t03-tools-agent-plan__hybrid (tools-heavy)

- HTTP: 200 | Latency: 9000ms
- Strategy header: `hybrid` | Label: `hybrid`
- Endpoint: `remote` (remote)
- Difficulty: `hard` / `quality`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 64, "toolCount": 3, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 3, "codeOrSchemaBurden": true}`
- Output: "I'll decompose this into milestones and execute sequentially. Let me start by inspecting the codebase to locate the relevant files."

### p19-decompose-plan__difficulty (decomposition)

- HTTP: 200 | Latency: 9814ms
- Strategy header: `difficulty` | Label: `difficulty`
- Endpoint: `remote` (remote)
- Difficulty: `easy` / `cost`
- Cache: hit=`None` invalidated=`True` reasons=`['code-or-schema-change', 'tool-count-delta']`
- Rubric: `{"contextTokens": 38, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 2, "codeOrSchemaBurden": false}`
- Output: 'The user is asking for a breakdown of implementing a "difficulty learning cache invalidation" system. This phrasing is a bit unusual. Let me parse what they might mean:\n\n1. "Difficulty learning" could refer to:\n   - Spaced repetition / difficulty-based learning systems (like Anki'

### p19-decompose-plan__baseline (decomposition)

- HTTP: 200 | Latency: 7090ms
- Strategy header: `baseline` | Label: `baseline`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: "Certainly! Let's break down the implementation of a **difficult cache invalidation** system into clear steps, including milestones and verification criteria at each stage.\n\n---\n\n## 🧠 Overview: What is Cache Invalidation?\n\nCache invalidation is the process of removing or updating "

### p19-decompose-plan__controller (decomposition)

- HTTP: 200 | Latency: 7025ms
- Strategy header: `controller` | Label: `controller`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: "Absolutely! Implementing a **difficulty-level Cache Invalidation System** is a multi-step process requiring careful design. Let's break it down step-by-step with milestones and verification checkpoints at each stage:\n\n---\n\n## 1. **Define the Scope & Requirements**\n\n### *Milestone"

### p19-decompose-plan__hybrid (decomposition)

- HTTP: 200 | Latency: 7135ms
- Strategy header: `hybrid` | Label: `hybrid`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 38, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 2, "codeOrSchemaBurden": false}`
- Output: 'Certainly! Implementing a **cache invalidation** mechanism—especially at a "difficulty" level (i.e., complex scenarios with multiple conditions)—can be broken down into manageable steps. Below is a detailed breakdown of the process, including milestones and verification criteria '

### p20-decompose-arch__difficulty (decomposition)

- HTTP: 200 | Latency: 7829ms
- Strategy header: `difficulty` | Label: `difficulty`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 45, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: "Certainly! Here's a structured decomposition of the **routing pipeline** with clear identification of *extension points* where additional features or logic can be added:\n\n---\n\n### Routing Pipeline Decomposition\n\n1. **Alias Resolution**\n   - Resolve virtual network identifiers (VN"

### p20-decompose-arch__baseline (decomposition)

- HTTP: 200 | Latency: 7818ms
- Strategy header: `baseline` | Label: `baseline`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: '### **Routing Pipeline Decomposition with Extension Points\n\nThe routing pipeline for a complex application (e.g., an online marketplace or social platform) involves multiple stages that process data packets to ensure efficient communication and quality of service (QoS). Below is '

### p20-decompose-arch__controller (decomposition)

- HTTP: 200 | Latency: 7793ms
- Strategy header: `controller` | Label: `controller`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: "Here's a structured decomposition of the **routing pipeline** with identified **extension points** for potential enhancements or modular improvements:\n\n---\n\n### **Routing Pipeline Decomposition**\n1. **Alias Resolution**  \n   - Resolve variable/alias references to their values in "

### p20-decompose-arch__hybrid (decomposition)

- HTTP: 200 | Latency: 7860ms
- Strategy header: `hybrid` | Label: `hybrid`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 45, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: 'Here’s a structured **decomposition** of the Routing Pipeline for an e-commerce application, with **extension points** identified at key stages:\n\n---\n\n### **1. Alias Resolution**\n- **Functionality**: Resolve product aliases (e.g., "ProductA" vs. "prodA") and map them to canonical'

### d01-milestones-heavy__difficulty (decomposition)

- HTTP: 200 | Latency: 8525ms
- Strategy header: `difficulty` | Label: `difficulty`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 59, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 1, "codeOrSchemaBurden": false}`
- Output: 'Certainly! Here’s a **multi-phase plan** to address the challenges of improving:\n\n1. **Difficulty Classifier Thresholds**\n2. **Controller Arbitration**\n3. **Hybrid Routing Overrides**\n\nEach phase includes milestones, verification criteria, rollback steps, extension points, and ov'

### d01-milestones-heavy__baseline (decomposition)

- HTTP: 200 | Latency: 8490ms
- Strategy header: `baseline` | Label: `baseline`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: 'Absolutely! Here’s a **multi-phase plan** designed to progressively enhance:\n\n1. **Difficulty Classifier Thresholds**\n2. **Controller Arbitration Logic**\n3. **Hybrid Routing Overrides**\n\nEach phase includes milestones, verification criteria, rollback steps, and extension points.\n'

### d01-milestones-heavy__controller (decomposition)

- HTTP: 200 | Latency: 8473ms
- Strategy header: `controller` | Label: `controller`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: "Certainly! Here's a **multi-phase plan** to systematically address the challenges you've outlined: improving **difficulty classifiers threshold tuning**, enabling **controller arbitration**, and implementing **hybrid routing overrides**. This plan is structured with clear milesto"

### d01-milestones-heavy__hybrid (decomposition)

- HTTP: 200 | Latency: 8532ms
- Strategy header: `hybrid` | Label: `hybrid`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 59, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 1, "codeOrSchemaBurden": false}`
- Output: "Here's a structured **multi-phase plan** to enhance the following system components:\n\n1. **Difficulty Classifier Thresholds Improvement**\n2. **Controller Arbitration Mechanism**\n3. **Hybrid Routing Overrides**\n\nEach phase includes **milestones, verification criteria, rollback ste"

### x01-max-signal__difficulty (max-signal)

- HTTP: 200 | Latency: 7587ms
- Strategy header: `difficulty` | Label: `difficulty`
- Endpoint: `remote` (remote)
- Difficulty: `hard` / `quality`
- Cache: hit=`None` invalidated=`True` reasons=`['code-or-schema-change', 'tool-count-delta', 'decomposition-keyword-delta']`
- Rubric: `{"contextTokens": 118, "toolCount": 3, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 6, "codeOrSchemaBurden": true}`
- Output: 'I’ll start by locating the relevant source'

### x01-max-signal__baseline (max-signal)

- HTTP: 200 | Latency: 9134ms
- Strategy header: `baseline` | Label: `baseline`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: 'I will follow your detailed workflow step by step:\n\n1. **Decompose into milestones with verification criteria**\n   - Read affected files (`read_file`) to identify what needs attention.\n   - Verify file paths match expected locations.\n   - Confirm each milestone has a clear succes'

### x01-max-signal__controller (max-signal)

- HTTP: 200 | Latency: 5662ms
- Strategy header: `controller` | Label: `controller`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: 'I will follow the structured plan you outlined. First, I\'ll read the file specified as "affected_files.txt" to identify what needs attention. Next, I\'ll search that content for any eligibility or pattern-matching requirements using `grep_search`. After confirming the relevant pat'

### x01-max-signal__hybrid (max-signal)

- HTTP: 200 | Latency: 7792ms
- Strategy header: `hybrid` | Label: `hybrid`
- Endpoint: `remote` (remote)
- Difficulty: `hard` / `quality`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 118, "toolCount": 3, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 6, "codeOrSchemaBurden": true}`
- Output: "I'll start by exploring the codebase to identify the affected files and understand the current implementation before decomposing the workflow."

### x02-max-context-tools__difficulty (max-signal)

- HTTP: 200 | Latency: 8841ms
- Strategy header: `difficulty` | Label: `difficulty`
- Endpoint: `remote` (remote)
- Difficulty: `hard` / `quality`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 132, "toolCount": 3, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 4, "codeOrSchemaBurden": true}`
- Output: 'This is a complex task with multiple components. Let me break it down:\n\n1. Analyze code-edit workflow\n2. Apply patch\n3. Validate schema\n4. Refactor tests\n5. Decompose architecture extension points\n6. Recommend when to route hard prompts to remote despite local tps advantage\n\nHowe'

### x02-max-context-tools__baseline (max-signal)

- HTTP: 200 | Latency: 9938ms
- Strategy header: `baseline` | Label: `baseline`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: 'The provided task context is highly detailed and involves multiple complex steps (code-patching, schema validation, refactoring, architectural decomposition). However, the tools available to me are limited to:\n\n1. `read_file(path)` – for reading configuration files.\n2. `apply_pat'

### x02-max-context-tools__controller (max-signal)

- HTTP: 200 | Latency: 3459ms
- Strategy header: `controller` | Label: `controller`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: 'I will process the incident context by reading the logs file, analyzing the code-edit workflow with a diff of "partial config PUT dropped routing.strategy", applying a patch to resolve the issue, validating the updated schema, refining tests to handle hybrid/controller discrepanc'

### x02-max-context-tools__hybrid (max-signal)

- HTTP: 200 | Latency: 6641ms
- Strategy header: `hybrid` | Label: `hybrid`
- Endpoint: `remote` (remote)
- Difficulty: `hard` / `quality`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 132, "toolCount": 3, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 4, "codeOrSchemaBurden": true}`
- Output: "I'll start by exploring the project structure and key files to understand the codebase."

### p24-exact-local__difficulty (exact-model)

- HTTP: 200 | Latency: 951ms
- Strategy header: `difficulty` | Label: `difficulty`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`None` invalidated=`True` reasons=`['code-or-schema-change', 'tool-count-delta', 'decomposition-keyword-delta']`
- Rubric: `{"contextTokens": 9, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: 'The term "routed-local" isn\'t a standard technical phrase,'

### p24-exact-local__baseline (exact-model)

- HTTP: 200 | Latency: 895ms
- Strategy header: `baseline` | Label: `baseline`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: 'The term "routed-local" typically refers to a network or communication'

### p24-exact-local__controller (exact-model)

- HTTP: 200 | Latency: 883ms
- Strategy header: `controller` | Label: `controller`
- Endpoint: `local` (local)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: '"routed-local" seems to be a specific command or context you'

### p24-exact-local__hybrid (exact-model)

- HTTP: 200 | Latency: 930ms
- Strategy header: `hybrid` | Label: `hybrid`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 9, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: 'The command "routed-local" typically refers to a configuration or setting'

### p25-exact-remote__difficulty (exact-model)

- HTTP: 200 | Latency: 1367ms
- Strategy header: `difficulty` | Label: `difficulty`
- Endpoint: `remote` (remote)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 9, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: 'The user wants me to reply exactly with the text "routed-remote".'

### p25-exact-remote__baseline (exact-model)

- HTTP: 200 | Latency: 1226ms
- Strategy header: `baseline` | Label: `baseline`
- Endpoint: `remote` (remote)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: 'The user wants me to reply exactly with the text "routed-remote".'

### p25-exact-remote__controller (exact-model)

- HTTP: 200 | Latency: 1343ms
- Strategy header: `controller` | Label: `controller`
- Endpoint: `remote` (remote)
- Difficulty: `None` / `None`
- Cache: hit=`None` invalidated=`None` reasons=`None`
- Rubric: `null`
- Output: 'The user wants me to reply exactly with the text "routed-remote".'

### p25-exact-remote__hybrid (exact-model)

- HTTP: 200 | Latency: 1247ms
- Strategy header: `hybrid` | Label: `hybrid`
- Endpoint: `remote` (remote)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 9, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: 'The user wants me to reply exactly with the text "routed-remote".'

### p26-cache-easy-a__difficulty (cache-probe)

- HTTP: 200 | Latency: 729ms
- Strategy header: `difficulty` | Label: `difficulty`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 10, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: 'Hello! How can I assist you today?'

### p27-cache-easy-b__difficulty (cache-probe)

- HTTP: 200 | Latency: 734ms
- Strategy header: `difficulty` | Label: `difficulty`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 10, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: 'Hello! How can I assist you today?'

### p28-cache-hard-a__difficulty (cache-probe)

- HTTP: 200 | Latency: 3475ms
- Strategy header: `difficulty` | Label: `difficulty`
- Endpoint: `local` (local)
- Difficulty: `medium` / `balanced`
- Cache: hit=`None` invalidated=`True` reasons=`['code-or-schema-change', 'tool-count-delta']`
- Rubric: `{"contextTokens": 23, "toolCount": 2, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 2, "codeOrSchemaBurden": true}`
- Output: 'The tools provided do not include functionality for analyzing code-edit workflows or applying patches with schema validation. I can only use the `read_file` tool to read files or the `apply_patch` tool to apply changes based on a diff. Please provide specific details about your r'

### p29-cache-hard-b__difficulty (cache-probe)

- HTTP: 200 | Latency: 1912ms
- Strategy header: `difficulty` | Label: `difficulty`
- Endpoint: `local` (local)
- Difficulty: `medium` / `balanced`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 23, "toolCount": 2, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 2, "codeOrSchemaBurden": true}`
- Output: 'The current tools do not support analyzing code-edit workflows or applying patches based on schema validation. The available `apply_patch` function requires a diff string as input, which I cannot generate without additional context. Please provide the necessary details to proceed'

### p30-cache-invalidate__difficulty (cache-probe)

- HTTP: 200 | Latency: 5771ms
- Strategy header: `difficulty` | Label: `difficulty`
- Endpoint: `local` (local)
- Difficulty: `medium` / `balanced`
- Cache: hit=`True` invalidated=`None` reasons=`None`
- Rubric: `{"contextTokens": 36, "toolCount": 2, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 3, "codeOrSchemaBurden": true}`
- Output: "The tasks you've outlined require specific operations that aren't fully supported by the tools available to me. Here's a breakdown:\n\n1. **Code-edit workflow analysis** – This involves reviewing code changes but no tool exists for this.\n2. **Apply patch** – Requires a diff string;"

### p31-cache-strategy-switch__difficulty (cache-probe)

- HTTP: 200 | Latency: 479ms
- Strategy header: `difficulty` | Label: `difficulty`
- Endpoint: `local` (local)
- Difficulty: `easy` / `cost`
- Cache: hit=`None` invalidated=`True` reasons=`['code-or-schema-change', 'tool-count-delta']`
- Rubric: `{"contextTokens": 9, "toolCount": 0, "historyTurnCount": 1, "instructionConstraintCount": 0, "decompositionKeywordCount": 0, "codeOrSchemaBurden": false}`
- Output: '2'
