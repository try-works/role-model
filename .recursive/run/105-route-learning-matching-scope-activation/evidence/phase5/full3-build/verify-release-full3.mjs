
process.env.ROLE_MODEL_TAXONOMY_DATA_ROOT = 'E:/tmp/run105-full3-public/role-model-router/packages/core/data/taxonomy';
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execSync } from 'node:child_process';

const publicRoot = 'E:/tmp/run105-full3-public';
const privateRoot = 'E:/tmp/run105-full3-private';
const release = publicRoot + '/role-model-router/dist/release/win32-x64';
const evidenceDir = "D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/.recursive/run/105-route-learning-matching-scope-activation/evidence/phase5/full3-build";
await mkdir(evidenceDir, { recursive: true });

const sha = b => createHash('sha256').update(b).digest('hex');
const manifest = JSON.parse(await readFile(release + '/manifest.json', 'utf8'));
const privateManifestPath = privateRoot + '/dist/run00-dev/track-b-runtime-manifest.json';
const stagedManifestPath = release + '/track-b-runtime/track-b-runtime-manifest.json';
const privateBytes = await readFile(privateManifestPath);
const stagedBytes = await readFile(stagedManifestPath);
const privateManifest = JSON.parse(privateBytes);

const git = (root, args) => execSync('git ' + args.join(' '), { cwd: root, encoding: 'utf8', stdio: ['ignore','pipe','pipe'] }).trim();
const identity = root => ({
  root,
  commit: git(root, ['rev-parse','HEAD']),
  tree: git(root, ['log','-1','--format=%T']),
  branch: git(root, ['branch','--show-current']),
  status: git(root, ['status','--porcelain','--untracked-files=all']),
});
const publicIdentity = identity(publicRoot);
const privateIdentity = identity(privateRoot);

const errors = [];
const check = (name, ok, detail) => { if (!ok) errors.push(name + ' :: ' + detail); };
const extClosure = manifest.artifact_closure.track_b_runtime.extensions;
const releaseExtensionIds = privateManifest.releaseExtensionIds || [];

check('public commit', publicIdentity.commit === 'e26bbc8350217273c8fb0a798e9f091f83590f0f', publicIdentity.commit);
check('public tree', publicIdentity.tree === 'd128ddc84aae7aa4486ca6ab2b1661214aaaa1f6', publicIdentity.tree);
check('private commit', privateIdentity.commit === 'da40a115237432b248f6b5282a4ac42f8fb90179', privateIdentity.commit);
check('private tree', privateIdentity.tree === '148cbe9db5304ac6e9fc6b39d2b152fdd022bdde', privateIdentity.tree);
check('public clean after packaging', publicIdentity.status === '', publicIdentity.status.slice(0,300));
check('private clean after packaging', privateIdentity.status === '', privateIdentity.status.slice(0,300));
check('channel development', manifest.channel === 'development' && privateManifest.runtimeChannelContext.channel === 'development', JSON.stringify({m: manifest.channel, p: privateManifest.runtimeChannelContext.channel}));
check('source_tree binds public tree', manifest.source_tree === 'd128ddc84aae7aa4486ca6ab2b1661214aaaa1f6' && manifest.track_b_runtime.public_source_tree === 'd128ddc84aae7aa4486ca6ab2b1661214aaaa1f6', JSON.stringify({source_tree: manifest.source_tree, tb: manifest.track_b_runtime.public_source_tree}));
check('private manifest binds both trees', privateManifest.publicSourceTree === 'd128ddc84aae7aa4486ca6ab2b1661214aaaa1f6' && privateManifest.privateSourceTree === '148cbe9db5304ac6e9fc6b39d2b152fdd022bdde', JSON.stringify({pub: privateManifest.publicSourceTree, priv: privateManifest.privateSourceTree}));
check('sealed_clean', privateManifest.sourceSeal && privateManifest.sourceSeal.status === 'sealed_clean' && privateManifest.sourceSeal.releaseEligible === true && privateManifest.sourceSeal.privateClean === true && privateManifest.sourceSeal.publicClean === true, JSON.stringify(privateManifest.sourceSeal));
check('runtimeChannelContext', JSON.stringify(privateManifest.runtimeChannelContext) === JSON.stringify({channel:'development',scopeId:'standalone-runtime-dev',authorizationEpoch:1}), JSON.stringify(privateManifest.runtimeChannelContext));
check('extension13: extension_count', manifest.track_b_runtime.extension_count === 13, String(manifest.track_b_runtime.extension_count));
check('extension13: releaseExtensionIds', releaseExtensionIds.length === 13, String(releaseExtensionIds.length));
check('extension13: private extensions', (privateManifest.extensions || []).length === 13, String((privateManifest.extensions || []).length));
check('extension13: closure extensions', extClosure.length === 13, String(extClosure.length));
check('extension ids match', JSON.stringify(extClosure.map(e => e.id)) === JSON.stringify(releaseExtensionIds), JSON.stringify(extClosure.map(e => e.id)));
check('staged manifest bytes == private bytes', privateBytes.equals(stagedBytes), 'bytes differ');
check('staged manifest sha256 in public manifest', sha(stagedBytes) === manifest.track_b_runtime.manifest_sha256, sha(stagedBytes) + ' vs ' + manifest.track_b_runtime.manifest_sha256);
check('sidecar sha256 in public manifest', manifest.track_b_runtime.sidecar_sha256 === '42757bdf5a910d9d921fc5a45f945aa87b478d1b8cb0128d054b8ef0580ae9a2', manifest.track_b_runtime.sidecar_sha256);
const exePath = path.join(release, manifest.executable);
const exeSha = sha(await readFile(exePath));
check('exe sha256 == manifest.executable_sha256', exeSha === manifest.executable_sha256, exeSha + ' vs ' + manifest.executable_sha256);

// canonical closure verifier: resolves void on success, throws on mismatch (tsx loader required for workspace TS links)
const pkgSea = await import(pathToFileURL(publicRoot + '/role-model-router/apps/runtime-host-bridge/dist/package-sea.js').href);
let closureOk = false;
let closureError = null;
try {
  await pkgSea.verifyPackagedRuntimeArtifactClosure({ releaseDir: release, closure: manifest.artifact_closure });
  closureOk = true;
} catch (e) {
  closureError = String(e && e.message || e);
}
check('artifact closure verified', closureOk, closureError || 'closureOk false');

const files = [];
const walk = async dir => { for (const item of await readdir(dir, { withFileTypes: true })) { const p = path.join(dir, item.name); if (item.isDirectory()) await walk(p); else if (item.isFile()) { const bytes = await readFile(p); files.push({ path: path.relative(release, p).replaceAll('\\','/'), bytes: bytes.length, sha256: sha(bytes) }); } } };
await walk(release);
files.sort((a,b) => a.path.localeCompare(b.path));

const releaseManifestSha = sha(await readFile(release + '/manifest.json'));
const receipt = {
  schemaVersion: 'run105.full3.v1',
  verifiedAt: new Date().toISOString(),
  scope: 'Run105 live e26 exact paired development build: static seal + closure verification only; build worker only',
  serverLaunched: false, portsTouched: false, stageOrProductionTouched: false,
  releasePath: release, executablePath: exePath,
  publicIdentity, privateIdentity,
  publicExpectedCommit: 'e26bbc8350217273c8fb0a798e9f091f83590f0f', privateExpectedCommit: 'da40a115237432b248f6b5282a4ac42f8fb90179',
  executableSha256: exeSha,
  releaseManifestSha256: releaseManifestSha,
  privateDistributionManifestSha256: sha(privateBytes),
  stagedDistributionManifestSha256: sha(stagedBytes),
  artifactClosureVerified: closureOk,
  artifactClosureEntryCount: Object.keys(manifest.artifact_closure).length,
  artifactClosureError: closureError,
  extensionCount: manifest.track_b_runtime.extension_count,
  extensionIds: releaseExtensionIds,
  sourceSeal: privateManifest.sourceSeal,
  runtimeChannelContext: privateManifest.runtimeChannelContext,
  releaseFileCount: files.length,
  releaseFiles: files,
  checks: { total: errors.length === 0 ? 'PASS' : 'FAIL', failures: errors },
};
await writeFile(evidenceDir + '/release-verification.json', JSON.stringify(receipt, null, 2) + '\n');
console.log('VERIFY_DONE ' + JSON.stringify({ checks: receipt.checks, executableSha256: exeSha, releaseManifestSha256: releaseManifestSha, privateDistributionManifestSha256: receipt.privateDistributionManifestSha256, releaseFileCount: files.length, extensionCount: receipt.extensionCount, sourceSeal: privateManifest.sourceSeal, artifactClosureVerified: closureOk }, null, 2));
