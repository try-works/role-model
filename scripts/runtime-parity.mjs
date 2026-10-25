// Repository-owned development command: tsx is the existing source loader.
// This performs no network requests and cannot certify browser/live parity.
const args = process.argv.slice(2);
if (args.length === 1 && args[0] === "--request-selfcheck") {
  const { runRequestParitySelfcheck } = await import("../role-model-router/packages/ui-parity/src/selfcheck.ts");
  const result = runRequestParitySelfcheck();
  process.stdout.write(`${JSON.stringify(result)}\n`);
  process.exitCode = result.status === "PASSED" ? 0 : 1;
} else if (args.length === 1 && args[0] === "--selfcheck") {
  process.stdout.write(`${JSON.stringify({ status: "NOT_RUN", scope: "browser-parity", reason: "react-capture-runner-unavailable" })}\n`);
  process.exitCode = 2;
} else {
  process.stdout.write(`${JSON.stringify({ status: "FAILED", reason: "invalid-mode" })}\n`);
  process.exitCode = 1;
}
