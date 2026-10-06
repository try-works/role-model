import { readFile, readdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const publicRoot = 'E:/tmp/run105-full2-public';
const privateRoot = 'E:/tmp/run105-full2-private';
const release = publicRoot + '/role-model-router/dist/release/win32-x64';
const evidence = 'D:/DEV/role-model/.worktrees/105-route-learning-matching-scope-activation/.recursive/run/105-route-learning-matching-scope-activation/evidence/phase5/full2-build';

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const json = async p => JSON.parse(await readFile(p, 'utf8'));
const manifest = await json(release + '/manifest.json');
const privateManifestPath = privateRoot + '/dist/run00-dev/track-b-runtime-manifest.json';
const stagedManifestPath = release + '/track-b-runtime/track-b-runtime-manifest.json';
const privateBytes = await readFile(privateManifestPath);
const stagedBytes = await readFile(stagedManifestPath);
const privateManifest = JSON.parse(privateBytes);

const identity = root => {
  const git = args => { const r = spawnSync('git', args, { cwd: root, encoding: 'utf8' }); if (r.status !== 0) throw Error('git identity failed: ' + (r.stderr || r.stdout)); return r.stdout.trim(); };
  return { root, commit: git(['rev-parse','HEAD']), tree: git(['rev-parse','HEAD^{tree}']), branch: git(['branch','--show-current']), status: git(['status','--porcelain','--untracked-files=all']) };
};
const publicIdentity = identity(publicRoot), privateIdentity = identity(privateRoot);
if (publicIdentity.status || privateIdentity.status) throw Error('worktree dirty after packaging: public=' + publicIdentity.status + ' private=' + privateIdentity.status);
if (manifest.channel !== 'development' || privateManifest.runtimeChannelContext.channel !== 'development') throw Error('channel mismatch');
if (publicIdentity.commit !== '7162930d76dc1c317c8d192a2e3fbbdcde6f878c' || privateIdentity.commit !== 'da40a115237432b248f6b5282a4ac42f8fb90179') throw Error('unexpected source commit');
if (manifest.source_tree !== publicIdentity.tree || privateManifest.publicSourceTree !== publicIdentity.tree || privateManifest.privateSourceTree !== privateIdentity.tree) throw Error('source tree mismatch');
if (!privateBytes.equals(stagedBytes) || sha(stagedBytes) !== manifest.track_b_runtime.manifest_sha256) throw Error('private distribution manifest mismatch (bytes/hash)');
const exePath = path.join(release, manifest.executable);
const exeSha = sha(await readFile(exePath));
if (exeSha !== manifest.executable_sha256) throw Error('executable hash mismatch');
const { verifyPackagedRuntimeArtifactClosure } = await import(pathToFileURL(publicRoot + '/role-model-router/apps/runtime-host-bridge/dist/package-sea.js').href);
await verifyPackagedRuntimeArtifactClosure({ releaseDir: release, closure: manifest.artifact_closure });
const files = [];
const walk = async dir => { for (const item of await readdir(dir, { withFileTypes: true })) { const p = path.join(dir, item.name); if (item.isDirectory()) await walk(p); else if (item.isFile()) { const bytes = await readFile(p); files.push({ path: path.relative(release, p).replaceAll('\\','/'), bytes: bytes.length, sha256: sha(bytes) }); } } };
await walk(release);
files.sort((a,b)=>a.path.localeCompare(b.path));
const receipt = {
  schemaVersion: 'run105.full2.v1',
  verifiedAt: new Date().toISOString(),
  scope: 'Run105 Phase5 responsive final: full2 exact paired development build; static seal + closure verification only',
  serverLaunched: false, portsTouched: false, stageOrProductionTouched: false,
  releasePath: release,
  executablePath: exePath,
  publicIdentity, privateIdentity,
  publicExpectedCommit: '7162930d76dc1c317c8d192a2e3fbbdcde6f878c', privateExpectedCommit: 'da40a115237432b248f6b5282a4ac42f8fb90179',
  executableSha256: exeSha,
  releaseManifestSha256: sha(await readFile(release + '/manifest.json')),
  privateDistributionManifestSha256: sha(privateBytes),
  stagedDistributionManifestSha256: sha(stagedBytes),
  artifactClosureVerified: true,
  artifactClosureEntryCount: Object.keys(manifest.artifact_closure).length,
  sourceSeal: privateManifest.sourceSeal,
  runtimeChannelContext: privateManifest.runtimeChannelContext,
  releaseFiles: files
};
await writeFile(evidence + '/release-verification.json', JSON.stringify(receipt, null, 2) + '\n');
console.log(JSON.stringify({ ...receipt, releaseFiles: { count: files.length, paths: files.map(f=>f.path) } }, null, 2));
