const RUNTIME_UI_ASSET_PATTERN =
  /\/assets\/(?:manifest|entry\.client|root)-([A-Za-z0-9_-]+)\.(?:js|css)/g;

export function extractRuntimeUiAssetSignature(text: string): string | null {
  const matches = new Set<string>();
  for (const match of text.matchAll(RUNTIME_UI_ASSET_PATTERN)) {
    if (typeof match[0] === "string") {
      matches.add(match[0]);
    }
  }
  if (matches.size === 0) {
    return null;
  }
  return [...matches].sort((left, right) => left.localeCompare(right, "en")).join("|");
}

export function shouldReloadForUpdatedRuntimeUiBuild(input: {
  readonly currentAssetMarkup: string;
  readonly serverHtml: string;
}): boolean {
  const currentSignature = extractRuntimeUiAssetSignature(input.currentAssetMarkup);
  const serverSignature = extractRuntimeUiAssetSignature(input.serverHtml);
  if (!currentSignature || !serverSignature) {
    return false;
  }
  return currentSignature !== serverSignature;
}
