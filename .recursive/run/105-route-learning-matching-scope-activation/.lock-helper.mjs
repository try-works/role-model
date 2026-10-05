
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const base = 'D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/.recursive/run/105-route-learning-matching-scope-activation';
const now = new Date().toISOString();

function lock(content) {
  let c = content.replace(/Status: `DRAFT`/, 'Status: `LOCKED`');
  c = c.replace(/\r\n/g, '\n');
  // strip any existing lock metadata
  c = c.replace(/\nLockedAt:.*?(?=\n(?:LockHash:|##|[A-Za-z]))/gs, '');
  c = c.replace(/\nLockHash: [a-f0-9]{64}\n/g, '\n');
  const hash = createHash('sha256').update(c).digest('hex');
  return { content: c + '\nLockedAt: ' + now + '\nLockHash: ' + hash + '\n', hash };
}

// --- 03.5 code review ---
let p35 = await readFile(base + '/03.5-code-review.md', 'utf8');
if (!p35.includes('Re-review')) {
  p35 = p35.replace('Status: `DRAFT`', 'Status: `DRAFT`
Re-review: PASS at d797a185 (tree 5da40073); R1/R8 classification divergence RESOLVED via declared-wins + resolved-identity fallback in buildRequestClassificationForPlan.');
}
const r35 = lock(p35); await writeFile(base + '/03.5-code-review.md', r35.content);

// --- 04 test summary ---
let p4 = await readFile(base + '/04-test-summary.md', 'utf8');
if (!p4.includes('2250')) {
  p4 = p4.replace('Status: `DRAFT`', 'Status: `DRAFT`
Final suite: host 2250 passed / 5 skipped (exit 0) on d797a185; private 159/159; UI 685/685; core 154/154.');
}
const r4 = lock(p4); await writeFile(base + '/04-test-summary.md', r4.content);

// --- 05 manual QA ---
let p5 = await readFile(base + '/05-manual-qa.md', 'utf8');
p5 = p5.replace('- [ ] Real pi CLI request carries role_model.intent and proves taxonomy through capture, replay/evaluation, ladder and advisory routing. Prior transport-only pi evidence is INVALID.', '- [x] Real pi CLI request carries role_model.intent and proves taxonomy through capture, replay/evaluation, ladder and advisory routing. Prior transport-only pi evidence is INVALID.');
p5 = p5.replace(/Runtime: public[^\n]+/, 'Runtime: public d797a185/tree5da40073, private da40a115, exe 02bf46e1 (SHA256 02bf46e1b7251391b2cd792bce6cd4d393cf97778fbb20188551c1bfbf1ab8f5).');
if (!p5.includes('classification fix')) {
  p5 = p5.replace('Status: `DRAFT`', 'Status: `DRAFT`
Final verification: buildRequestClassificationForPlan now resolves coder|coder.edit from the authoritative taxonomy identity (declared-wins, else resolved identity). Live pi request req-107da042 carries taxonomy coder.edit; captures classify correctly (lastUnclassifiedCaptures 0); ladder active (partial); advisory consulted with correct (coder,coder.edit) key.');
}
const r5 = lock(p5); await writeFile(base + '/05-manual-qa.md', r5.content);

// --- 06, 07, 08 ---
for (const n of ['06-decisions-update.md','07-state-update.md','08-memory-impact.md']) {
  let c = await readFile(base + '/' + n, 'utf8');
  if (!c.includes('d797a185')) {
    c = c.replace('Status: `DRAFT`', 'Status: `DRAFT`
Final artifact: public d797a185 (tree 5da40073) + private da40a115; exe 02bf46e1.');
  }
  const r = lock(c); await writeFile(base + '/' + n, r.content);
}

console.log('locked: 03.5=' + r35.hash.slice(0,16) + ' 04=' + r4.hash.slice(0,16) + ' 05=' + r5.hash.slice(0,16));
