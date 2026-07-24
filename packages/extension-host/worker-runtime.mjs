import { once } from "node:events";
import { pathToFileURL } from "node:url";
import { encodeFrame, extractFrames } from "../extension-sdk/index.mjs";

const moduleRef = process.argv[2];
if (!moduleRef) throw new Error("worker module URL required");
const extension = await import(moduleRef.includes(":") ? moduleRef : pathToFileURL(moduleRef).href);
if (typeof extension.run !== "function") throw new Error("worker module must export run(envelope)");

const retained = new Map();
let input = Buffer.alloc(0);
const send = async (value) => {
  if (!process.stdout.write(encodeFrame(value))) await once(process.stdout, "drain");
};

await send({ type: "ready", pid: process.pid });
process.stdin.on("data", async (chunk) => {
  input = Buffer.concat([input, chunk]);
  const parsed = extractFrames(input);
  input = parsed.remainder;
  for (const message of parsed.values) {
    if (message.type === "ack") {
      retained.delete(message.requestId);
      continue;
    }
    if (message.type === "shutdown") {
      await send({ type: "shutdown-ack" });
      process.exit(0);
    }
    if (message.type !== "invoke") continue;
    try {
      const result = await extension.run(message.envelope);
      const response = { type: "result", requestId: message.requestId, result };
      retained.set(message.requestId, response);
      await send(response);
    } catch (error) {
      const response = {
        type: "error",
        requestId: message.requestId,
        error: error?.message ?? String(error),
      };
      retained.set(message.requestId, response);
      await send(response);
    }
  }
});
