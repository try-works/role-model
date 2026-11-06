import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

/**
 * S239: the packaged-candidate gate refuses a static root that is not byte-identical to the UI the
 * package ships (S212/S213). That comparison lived inline in the gate, so it could only be exercised by
 * running the whole gate against real binaries. Extracted here so it can be tested with two directories.
 */
export const listFiles = (root) => {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) out.push(path.relative(root, full).replaceAll(path.sep, "/"));
    }
  };
  walk(root);
  return out.sort();
};

export const staticRootIdentity = ({ packageClient, staticRoot }) => {
  const differences = [];
  const left = listFiles(path.resolve(staticRoot));
  const right = listFiles(packageClient);
  if (left.join("|") !== right.join("|")) differences.push("file lists differ");
  for (const file of right) {
    if (!left.includes(file)) continue;
    const a = readFileSync(path.join(staticRoot, file));
    const b = readFileSync(path.join(packageClient, file));
    if (Buffer.compare(a, b) !== 0) differences.push(`${file} differs`);
  }
  return { differences };
};
