import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

/**
 * S199: a token NAME is not a contrast ratio.
 *
 * s178 asserted that the light muted token maps to `--rm3-light-muted-foreground`. That passes even
 * if the token is redefined to a pale grey, which is precisely the defect it was written for. This
 * resolves the token to a hex value and computes WCAG contrast against the light background.
 */
const appDir = path.join(import.meta.dirname, "..");
const tokens = await readFile(
  path.join(appDir, "..", "runtime-ui", "app", "rm3-tokens.css"),
  "utf8",
);

const hexFor = (name) => {
  const at = tokens.indexOf(`${name}:`);
  if (at < 0) return undefined;
  const value = tokens.slice(at + name.length + 1).trimStart();
  const end = value.indexOf(";");
  const raw = (end < 0 ? value : value.slice(0, end)).trim();
  return raw.startsWith("#") ? raw : undefined;
};
const parseHex = (hex) => {
  const clean = hex.slice(1);
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean.slice(0, 6);
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  };
};
const channel = (v) => {
  const x = v / 255;
  return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
};
const luminance = ({ r, g, b }) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
const contrast = (a, b) => {
  const l1 = luminance(a);
  const l2 = luminance(b);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
};

test("S199: light muted text clears WCAG AA against the light background", () => {
  const muted = hexFor("--rm3-light-muted-foreground");
  const background = hexFor("--rm3-light-background");
  assert.ok(muted, "the muted foreground resolves to a hex value");
  assert.ok(background, "the light background resolves to a hex value");
  const ratio = contrast(parseHex(muted), parseHex(background));
  assert.ok(ratio >= 4.5, `light muted contrast is ${ratio.toFixed(2)}:1, below WCAG AA 4.5:1`);
});

test("S199: the accent fill and its ink clear WCAG AA (the S175 invisible-Run defect)", () => {
  // The Run button was white-on-white because the fill used --rm-accent with text-white. The pair
  // that must be used is accent/on-primary, and it must actually contrast.
  const fill = hexFor("--rm3-primary");
  const ink = hexFor("--rm3-primary-foreground");
  assert.ok(fill, "the accent fill resolves to a hex value");
  assert.ok(ink, "the accent ink resolves to a hex value");
  const ratio = contrast(parseHex(fill), parseHex(ink));
  assert.ok(ratio >= 4.5, `accent fill vs ink is ${ratio.toFixed(2)}:1, below WCAG AA 4.5:1`);
});

test("S199: the ring colour would NOT have cleared it (the old mapping was a real defect)", () => {
  const ring = hexFor("--rm3-light-ring");
  const background = hexFor("--rm3-light-background");
  assert.ok(ring && background);
  const ratio = contrast(parseHex(ring), parseHex(background));
  assert.ok(
    ratio < 4.5,
    `the ring colour is only acceptable because it is no longer used for text: ${ratio.toFixed(2)}:1`,
  );
});
