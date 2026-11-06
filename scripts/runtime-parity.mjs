// Repository-owned development command: tsx is the existing source loader.
// This performs no network requests and cannot certify browser/live parity.
const args = process.argv.slice(2);
if (args.length === 1 && args[0] === "--request-selfcheck") {
  const { runRequestParitySelfcheck } = await import(
    "../role-model-router/packages/ui-parity/src/selfcheck.ts"
  );
  const result = runRequestParitySelfcheck();
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exitCode = result.status === "PASSED" ? 0 : 1;
} else if (args.length === 1 && args[0] === "--selfcheck") {
  // S294 (R14): the real React capture / determinism / dual-build runner. Chrome is required; without it the
  // runner reports NOT_RUN and exit 2, and any other failure is FAILED exit 1 (never a fake PASS).
  const { exitCodeFor, main } = await import("./runtime/parity-selfcheck.mjs");
  try {
    const result = await main({});
    process.stdout.write(`${JSON.stringify(result)}\n`);
    process.exitCode = result.exitCode ?? exitCodeFor(result.status);
  } catch (error) {
    // S295: a rejected runner must still emit the FAILED contract (never an uncaught rejection).
    const reason = String(error).startsWith("Error: ")
      ? String(error).slice("Error: ".length)
      : String(error);
    process.stdout.write(
      `${JSON.stringify({ status: "FAILED", scope: "browser-parity", reason: `runner-failure: ${reason}`, exitCode: 1 })}\n`,
    );
    process.exitCode = 1;
  }
} else {
  process.stdout.write(`${JSON.stringify({ status: "FAILED", reason: "invalid-mode" })}\n`);
  process.exitCode = 1;
}
