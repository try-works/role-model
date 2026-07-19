import { classifyWithProgressiveDisclosure } from "../../../../../../../packages/pi-role-model/src/taxonomy/classify-with-progressive-disclosure.ts";
const prompts = [
  "Review this diff for security risks and likely regressions.",
  "Implement this small bug fix and add a regression test.",
  "Compare current public documentation for this API and cite differences.",
  "Turn these support notes into a clear customer reply.",
  "Inspect this schema and propose a migration plan.",
  "Create product requirements and acceptance criteria for this workflow."
];
console.log(JSON.stringify(prompts.map(prompt => ({ prompt, classification: classifyWithProgressiveDisclosure({ prompt }) })), null, 2));
