const fs = require('fs');
const outDir = process.argv[2];
(async () => {
  const started = Date.now();
  const resp = await fetch('http://127.0.0.1:3456/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-request-id': 'addendum-10-direct-chatgpt-post-restore-001' },
    body: JSON.stringify({ model: 'chatgpt/gpt-5.4', messages: [{ role: 'user', content: 'Reply exactly OK.' }], stream: false, temperature: 0 }),
  });
  const text = await resp.text();
  const result = { status: resp.status, durationMs: Date.now() - started, body: text };
  fs.writeFileSync(`${outDir}/direct-chatgpt-post-restore.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ status: resp.status, durationMs: result.durationMs, bodyPreview: text.slice(0, 180) }));
})();
