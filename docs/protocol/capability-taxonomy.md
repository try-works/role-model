# Capability Taxonomy

Capabilities are stable protocol identifiers, not ad hoc strings.

Taxonomy V1 capability examples include:

- text and reasoning: `text.chat`, `reasoning.multi_step`, `json.schema_adherence`, `long_context`
- code and tools: `code.read`, `code.write`, `tools.function_calling`, `tools.command_execution`
- research: `web.search`, `citation.synthesis`, `tools.browser_control`
- data: `data.query`, `data.schema`, `data.transform`
- communication: `communication.user_facing`, `communication.follow_up`
- governance and safety: `security.analysis`, `legal.analysis`, `health.safety`

Routing eligibility, role binding, and benchmark suite selection all refer to these identifiers.
