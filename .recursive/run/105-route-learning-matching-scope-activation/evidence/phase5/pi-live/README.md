# Raw pi-live captures

These files hold raw captured output from the live `pi` CLI runs against `:3458`. They are the
evidence of what the request/response traffic actually looked like, kept verbatim.

They are named `*.capture.txt`, not `*.json`, on purpose. `packages/schema-tools/test/recursive-evidence-json.test.ts`
requires every TRACKED `*.json` under `/.recursive/run` to parse, and these four do not:

| file | why it is not valid JSON |
| --- | --- |
| `summary.capture.txt` | the tooling embedded a multi-line blob inside a JSON string without escaping, then the capture ends mid-document (`},\n  `) |
| `runtime-requests-after-pi1.capture.txt` | same broken escaping: the embedded blob carries the literal text `(line truncated to 2000 chars)` followed by raw newlines inside a string literal |
| `runtime-requests-after-pi2.capture.txt` | truncated at 51 163 bytes, i.e. exactly 50 KiB minus a header, so the document has no closing brackets |
| `runtime-explain-capture.capture.txt` | truncated at 51 167 bytes for the same reason |

Renaming keeps the evidence and stops the repository from claiming these are JSON payloads. The
underlying tooling defect (a 50 KiB capture boundary that cuts a document in half while a sibling
field is written with unescaped quotes and newlines) is worth fixing in whatever produced them - it
is the reason this run's pi-live evidence could not be machine-read.

`live-db-rows.json` in the sibling `r15-hotfix-build/` directory WAS recoverable: it is a complete
JSON array followed by two Node `ExperimentalWarning` lines, which were stripped.
