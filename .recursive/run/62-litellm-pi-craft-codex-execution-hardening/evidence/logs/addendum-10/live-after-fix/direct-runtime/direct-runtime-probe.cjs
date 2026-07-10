const fs = require('fs');
const outDir = process.argv[2];
async function call(model, id) {
  const started = Date.now();
  const resp = await fetch('http://127.0.0.1:3456/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-request-id': id },
    body: JSON.stringify({ model, messages: [{ role: 'user', content: 'Reply exactly OK.' }], stream: false, temperature: 0 }),
  });
  const text = await resp.text();
  const result = { model, id, status: resp.status, durationMs: Date.now() - started, body: text };
  fs.writeFileSync(`${outDir}/${id}.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ model, status: resp.status, durationMs: result.durationMs, bodyPreview: text.slice(0, 180) }));
}
(async () => {
  await call('chatgpt/gpt-5.4', 'addendum-10-direct-chatgpt-cooldown-001');
  await call('difficulty.remote-only', 'addendum-10-direct-difficulty-cooldown-001');
})();
