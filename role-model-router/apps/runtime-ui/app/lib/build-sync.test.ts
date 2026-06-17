import { describe, expect, it } from "vitest";

import {
  extractRuntimeUiAssetSignature,
  shouldReloadForUpdatedRuntimeUiBuild,
} from "./build-sync";

describe("runtime-ui build sync", () => {
  it("extracts a stable signature from runtime-ui asset references", () => {
    const markup = `
      <link rel="modulepreload" href="/assets/manifest-2ccdf3ec.js" />
      <link rel="modulepreload" href="/assets/entry.client-Dy6QV84X.js" />
      <link rel="stylesheet" href="/assets/root-D31WnpxO.css" />
    `;

    expect(extractRuntimeUiAssetSignature(markup)).toBe(
      "/assets/entry.client-Dy6QV84X.js|/assets/manifest-2ccdf3ec.js|/assets/root-D31WnpxO.css",
    );
  });

  it("detects when the served runtime-ui build differs from the currently loaded assets", () => {
    const currentAssetMarkup = `
      /assets/manifest-old111.js
      /assets/entry.client-old222.js
      /assets/root-old333.css
    `;
    const serverHtml = `
      <link rel="modulepreload" href="/assets/manifest-new111.js" />
      <link rel="modulepreload" href="/assets/entry.client-new222.js" />
      <link rel="stylesheet" href="/assets/root-new333.css" />
    `;

    expect(
      shouldReloadForUpdatedRuntimeUiBuild({
        currentAssetMarkup,
        serverHtml,
      }),
    ).toBe(true);
  });

  it("does not request a reload when the served build matches the current assets", () => {
    const currentAssetMarkup = `
      /assets/manifest-2ccdf3ec.js
      /assets/entry.client-Dy6QV84X.js
      /assets/root-D31WnpxO.css
    `;
    const serverHtml = `
      <link rel="modulepreload" href="/assets/manifest-2ccdf3ec.js" />
      <link rel="modulepreload" href="/assets/entry.client-Dy6QV84X.js" />
      <link rel="stylesheet" href="/assets/root-D31WnpxO.css" />
    `;

    expect(
      shouldReloadForUpdatedRuntimeUiBuild({
        currentAssetMarkup,
        serverHtml,
      }),
    ).toBe(false);
  });
});
