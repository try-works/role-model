import { classifyWithProgressiveDisclosure } from "../../../../../../../packages/pi-role-model/src/taxonomy/classify-with-progressive-disclosure.ts";
const baseUrl = "http://127.0.0.1:3456";
const prompts = [
  "Review this diff for security risks and likely regressions.",
  "Implement this small bug fix and add a regression test.",
  "Compare current public documentation for this API and cite differences.",
  "Turn these support notes into a clear customer reply.",
  "Inspect this schema and propose a migration plan.",
  "Create product requirements and acceptance criteria for this workflow."
];
const results = [];
for (const prompt of prompts) {
  const classification = classifyWithProgressiveDisclosure({ prompt });
  const body = {
    model: "default.hybrid",
    messages: [{ role: "user", content: prompt }],
    role_model: classification.role_model,
    stream: false
  };
  const response = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const text = await response.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  results.push({ prompt, status: response.status, ok: response.ok, classification, response: json });
}
const invalidBody = {
  model: "default.hybrid",
  messages: [{ role: "user", content: "Use made up metadata but still answer normally." }],
  role_model: {
    contract_version: 1,
    intent: {
      taxonomy_version: "1.0.0-alpha.1",
      classification_contract_version: "role-model.classification.v1",
      role_hint_id: "madeup_role",
      task_type: "madeup.do_magic",
      required_capabilities: ["madeup.capability"],
      required_modalities: ["madeup-modality"],
      tool_classes: ["madeup.tool"],
      confidence: 0.2,
      source: "qa-invalid-advisory"
    }
  },
  stream: false
};
const invalidResponse = await fetch(`${baseUrl}/v1/chat/completions`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify(invalidBody)
});
const invalidText = await invalidResponse.text();
let invalidJson;
try { invalidJson = JSON.parse(invalidText); } catch { invalidJson = { raw: invalidText }; }
results.push({ prompt: "invalid-advisory-metadata", status: invalidResponse.status, ok: invalidResponse.ok, request: invalidBody, response: invalidJson });
console.log(JSON.stringify(results, null, 2));
