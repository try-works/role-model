const fs = require('node:fs');
const path = require('node:path');
const outDir = path.resolve('.recursive/run/62-litellm-pi-craft-codex-execution-hardening/evidence/logs/addendum-15/live/direct-runtime');
fs.mkdirSync(outDir, { recursive: true });
async function postChat(name, model, messages) {
  const startedAt = Date.now();
  const body = { model, stream: false, temperature: 0, reasoning_effort: 'high', messages };
  fs.writeFileSync(path.join(outDir, `${name}.request.json`), JSON.stringify(body, null, 2));
  let result;
  try {
    const resp = await fetch('http://127.0.0.1:3456/v1/chat/completions', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer <redacted>' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90000),
    });
    const text = await resp.text();
    try { result = JSON.parse(text); } catch { result = { raw: text }; }
    const summary = {
      name,
      model,
      status: resp.status,
      ok: resp.ok,
      durationMs: Date.now() - startedAt,
      selectedModel: result?.model,
      error: result?.error ?? null,
      contentPreview: result?.choices?.[0]?.message?.content?.slice?.(0, 160) ?? null,
    };
    fs.writeFileSync(path.join(outDir, `${name}.response.json`), JSON.stringify(result, null, 2));
    fs.writeFileSync(path.join(outDir, `${name}.summary.json`), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary));
  } catch (error) {
    const summary = { name, model, ok: false, durationMs: Date.now() - startedAt, thrown: String(error?.message ?? error) };
    fs.writeFileSync(path.join(outDir, `${name}.summary.json`), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary));
    process.exitCode = 1;
  }
}
const exactMessages = [
  { role: 'user', content: 'hey' },
  { role: 'assistant', content: 'Hey - what can I help with?' },
  { role: 'user', content: 'Reply exactly DIRECT_HISTORY_OK.' },
];
const aliasMessages = [
  { role: 'user', content: 'We are debugging a complex TypeScript router adapter regression.' },
  { role: 'assistant', content: 'I will inspect the conversion path and isolate the root cause.' },
  { role: 'user', content: 'Continue the hard routing analysis and reply exactly ALIAS_HISTORY_OK.' },
];
(async () => {
  await postChat('chatgpt-exact-history', 'chatgpt/gpt-5.4', exactMessages);
  await postChat('difficulty-remote-only-history', 'difficulty.remote-only', aliasMessages);
})();
