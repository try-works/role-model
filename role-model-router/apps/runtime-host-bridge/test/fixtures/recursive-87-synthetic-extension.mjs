export async function run(envelope) {
  const capability = envelope?.capability ?? "health:probe";
  if (capability === "health:probe") {
    return { available: true, probe: "recursive-87.synthetic.health" };
  }
  if (capability === "fixture:echo") {
    return { echoed: envelope.payload ?? null, requestId: envelope.requestId };
  }
  throw new Error(`unsupported synthetic capability: ${capability}`);
}
