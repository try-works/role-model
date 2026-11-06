import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";

/**
 * S178/S179: theme selection must be CSS-driven, and light-theme muted text must clear WCAG AA.
 *
 * index.html used to pin --rm-bg/--rm-fg/--rm-surface/--rm-border/--rm-accent/--rm-secondary to the
 * DARK palette as inline style on <html>. Inline style beats the stylesheet, so toggling
 * data-theme=light left those tokens dark: "Overview" rendered #ededed on #fafafa - 1.12:1,
 * effectively invisible. With the inline palette gone the stylesheet applies; the remaining muted
 * colour was #888 on #fff (3.54:1), now --rm3-light-muted-foreground (#666, 5.74:1).
 */
const appDir = path.join(import.meta.dirname, "..");

test("S178: index.html selects a theme but never writes palette tokens inline", async () => {
  const html = await readFile(path.join(appDir, "index.html"), "utf8");
  assert.doesNotMatch(
    html,
    /setProperty\(\s*"--rm-/,
    "palette tokens must come from CSS, not inline style",
  );
  assert.doesNotMatch(html, /palettes\s*=/, "no hard-coded palette table in the shell");
  assert.match(html, /dataset\.theme\s*=/, "the shell still selects a theme");
});

test("S179: the light theme maps muted text to the darker foreground token", async () => {
  const css = await readFile(path.join(appDir, "..", "runtime-ui", "app", "app.css"), "utf8");
  // The light and dark blocks are not necessarily ordered light-then-dark in the source, so this
  // asserts on the mapping itself rather than slicing a range that may be empty (it was, at first).
  assert.match(css, /--rm-muted:\s*var\(--rm3-light-muted-foreground\)/, "#888 on #fff is 3.54:1");
  assert.doesNotMatch(
    css,
    /--rm-muted:\s*var\(--rm3-light-ring\)/,
    "the light muted token must not be the ring colour",
  );
});
