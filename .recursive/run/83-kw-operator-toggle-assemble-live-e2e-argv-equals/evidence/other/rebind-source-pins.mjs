#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const privatePin = "3b097ed0cf7ae9a1a63604d2f95b58418b190cf0";
const publicPin = "b03d82a2fe8adc317c9fdaecad838beac3ed74a8";
const oldPrivate = "05e7729e8d0f55850fc93ee985b0f20d0ee35da2";

const lockPath = "evidence/source-set/tb00-release-source-lock.json";
const lock = JSON.parse(readFileSync(lockPath, "utf8"));
const priv = lock.sources.find((s) => s.repositoryId === "private");
const pub = lock.sources.find((s) => s.repositoryId === "public");
priv.revision = privatePin;
pub.revision = publicPin;
writeFileSync(lockPath, `${JSON.stringify(lock, null, 2)}\n`);
console.log({ lockPrivate: priv.revision, lockPublic: pub.revision });

const liveDir = "evidence/live-e2e";
for (const name of readdirSync(liveDir)) {
  if (!name.endsWith(".json")) continue;
  const p = join(liveDir, name);
  let text = readFileSync(p, "utf8");
  if (!text.includes(oldPrivate)) continue;
  writeFileSync(p, text.split(oldPrivate).join(privatePin));
  console.log("rebound", name);
}

const clean = JSON.parse(readFileSync(join(liveDir, "clean-checkout-reconstruction.json"), "utf8"));
console.log({
  cleanPrivate: clean.private?.revision,
  cleanPublic: clean.public?.revision,
  cleanPublicPath: clean.public?.path,
});
