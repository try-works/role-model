# S93 Two blockers are now owner-authority questions, not engineering tasks

I asked the operator two questions that no amount of work on my side can decide:

1. **R16 like-for-like seeding** - R16 says to seed an equivalent authorized config for the comparison. R holds the operator config, which may carry provider credentials. Options put to the owner: (a) I build a synthetic config with the same shape and seed D/C with it, (b) I copy the real config into an E: temp root only, (c) leave the clause blocked.
2. **J6 replay execution** - replay jobs refuse with `extension replay-core failed: authoritative trace root resolver required`, and `GET /operator/trace-roots` returns `[]` with no creation route. Options: (a) the owner supplies/configures the extension, (b) record it as environment-blocked, (c) I read the private replay-core contract first.

The question call **timed out unanswered** (5 minute window), so I am not treating either as decided and I am not picking the option that touches operator secrets.

## Conservative default taken meanwhile

- **R16 stays blocked** on the seeding clause. Choosing the synthetic-config option myself would produce a comparison the requirement does not ask for (it would compare D vs C again, not R), and choosing the copy option would put operator secrets on disk without explicit permission.
- **J6 stays NOT RUN** with the contract chain recorded - the refusal sequence is already evidence, and the missing piece is a private capability I cannot fabricate.

## What is left that is genuinely mine to do

- R27 acquisition DAG (composition root) - engineering, not blocked, but a large refactor of a 7k-line file that should be sequenced rather than rushed.
- Model pool - blocked on benchmark/profile data that the released runtime also lacks.
- Packaging lockfile - needs a network install, forbidden here; the exact remedy is recorded.

Everything else in the ledger is verified with reproducible evidence.