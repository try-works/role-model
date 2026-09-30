/**
 * Differential check: our intent injector vs the Pi package's injector.
 *
 * `applyRoleModelIntent` is a port of `injectRoleModelIntentIntoPayload`, with the
 * signal source changed from a serialized OpenAI payload to the Harness request.
 * For inputs that carry the same signals, the emitted `role_model` object must be
 * identical — otherwise the runtime would route the same work differently
 * depending on which harness sent it.
 *
 * Contexts avoid tool hints here on purpose, because the Pi injector derives them
 * from a tool array we would have to fabricate; tool-hint divergence is covered by
 * `check-classifier-parity.mts`.
 *
 * Run:  node --import tsx scripts/check-intent-parity.mts
 */

import { injectRoleModelIntentIntoPayload } from "../../pi-role-model/src/request-intent.js";
import { applyRoleModelIntent } from "../src/intent.js";

/** The owned model id, shared by both sides. */
const MODEL_ID = "baseline.remote-only";

/** Prompts spanning every group plus degenerate cases. */
const PROMPTS: readonly string[] = [
  "Implement a small bug fix and add a regression test.",
  "Debug the root cause of the startup crash in the parser.",
  "Review this diff for security risks and likely regressions.",
  "Plan the schema migration and api design for the database.",
  "Write the product requirements and acceptance criteria for this workflow.",
  "Find the current public documentation and cite the sources.",
  "Draft a customer reply for this support ticket.",
  "Translate the release notes into German and localize the tone.",
  "Summarize the quarterly sales strategy and forecast revenue.",
  "Review the legal terms, compliance and privacy policy.",
  "Organize notes into a knowledge base and archive the context brief.",
  "zzzz qqqq wwww",
  "Handle this task.",
];

/** File attachments, expressed in each side's shape. */
const FILE_CASES: readonly (readonly string[])[] = [[], [".sql"], [".pdf"], [".md"], [".png"]];

/** Whether a payload carries an image, in each side's shape. */
const IMAGE_CASES: readonly boolean[] = [false, true];

let compared = 0;
let mismatches = 0;

for (const prompt of PROMPTS) {
  for (const extensions of FILE_CASES) {
    for (const hasImage of IMAGE_CASES) {
      compared += 1;

      // The Pi side reads a serialized OpenAI payload.
      const piContent: unknown[] = [{ type: "text", text: prompt }];
      if (hasImage)
        piContent.push({ type: "image_url", image_url: { url: "data:image/png;base64,AAAA" } });
      for (const extension of extensions) {
        piContent.push({ type: "file", file: { filename: `attachment${extension}` } });
      }
      const piPayload: Record<string, unknown> = {
        model: MODEL_ID,
        messages: [{ role: "user", content: piContent }],
      };
      const piResult = injectRoleModelIntentIntoPayload(piPayload, new Set([MODEL_ID])) as Record<
        string,
        unknown
      >;

      // Our side reads a Harness request.
      const ourMessages = [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            ...(hasImage ? [{ type: "image" }] : []),
            ...extensions.map((extension) => ({
              type: "file",
              filename: `attachment${extension}`,
            })),
          ],
        },
      ];
      const ourResult = await applyRoleModelIntent(
        { provider: "role-model", model: MODEL_ID, messages: ourMessages },
        { roleModelModelIds: new Set([MODEL_ID]), providerRoutes: new Set(["role-model"]) },
      );
      const ourRoleModel = (ourResult.request as Record<string, unknown>).role_model;

      const same = JSON.stringify(ourRoleModel) === JSON.stringify(piResult.role_model);
      if (!same) {
        mismatches += 1;
        console.log(
          `MISMATCH  prompt=${JSON.stringify(prompt)} files=${JSON.stringify(extensions)} image=${String(hasImage)}`,
        );
        console.log(`          ours ${JSON.stringify(ourRoleModel)}`);
        console.log(`          pi   ${JSON.stringify(piResult.role_model)}`);
      }
    }
  }
}

console.log(`\ncompared ${compared} (prompt, files, image) combinations`);
console.log(
  mismatches === 0
    ? "ALL COMBINATIONS BYTE-IDENTICAL — the injected metadata matches the Pi injector"
    : `${mismatches} MISMATCH(ES) FOUND`,
);
process.exitCode = mismatches === 0 ? 0 : 1;
