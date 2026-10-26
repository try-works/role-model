# S210 Admission needs a new combination, which fixtures cannot provide - recorded, not faked

I started porting the endpoint admission form (provider account + model + region) and stopped before
half-shipping it. The reason is a property of the data, not of the code:

    admitRuntimeEndpoint(providerAccountId, modelId, region)
    -> if the derived endpointId already exists and is active:
         throw "Endpoint effort slot <id> is already active."

Every combination in the fixture catalogues *already has* its endpoint:

    openai/gpt-4.1-mini-fast   x openai.personal.primary   x us-east-1  -> exists
    claude-3.7-sonnet          x anthropic.team.shared     x us-east-1  -> exists
    deepseek-official/...      x deepseek-official.primary x ap-east-1  -> exists

So a form driven by these catalogues can only ever produce "already active". Demonstrating a
successful admission would require inventing an account/model pair with no endpoint - i.e. building a
fixture to make my own check pass.

## What I did ship

The endpoints route now requests the readbacks admission needs, so the form's data is already there:

    admissionCommands = [readReadback(providers), readReadback(configuredModels)]
    model.readbacks = { configuredModels: loading, providers: loading }

Verified after the change: `/control/endpoints` renders 3 rows, no crash, and the action remains
**disabled with the reason** from S209 rather than posting a body that cannot succeed.

## Gate state at the end of this round

    PASS chat completion: openai/gpt-4.1-mini-fast total_tokens=56
    PASS expected model deepseek-official/deepseek-flash
    PASS chat completion: deepseek-official/deepseek-flash total_tokens=56
    PASS studio run: clicked -> raw:success
    {"routes":20,"failures":0,"focus":true}
    exit 0

## What remains genuinely unimplemented in the port

| Feature | State |
|---|---|
| endpoint admission form | readbacks wired, control disabled with reason, **no form** |
| provider reconnect | targets a real account, **not exercised** (fixtures are adapter-backed) |
| admission success path | **unprovable in these catalogues** without a fabricated new combination |

Recording this as a capability limit rather than a bug: the port says what it cannot do, and I have
not invented data to make it look like it can.