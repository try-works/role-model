import { createBenchmarkSuite } from "@role-model-router/bench-core";
import { judgeAverage } from "@role-model-router/bench-judge";

const suite = createBenchmarkSuite("text.chat", [
  {
    case_id: "chat-basic",
    prompt_ref: "testdata/prompts/chat-basic.json",
    capability: "text.chat",
  },
]);
const score = judgeAverage([0.8, 0.9, 0.85]);

console.log(JSON.stringify({ suite, score }, null, 2));
