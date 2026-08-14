import { spawn } from "node:child_process";

export function resolveOpenExternalUrlCommand(
  platform: NodeJS.Platform,
  url: string,
): { readonly file: string; readonly args: readonly string[] } {
  if (platform === "win32") {
    // explorer.exe mishandles ?/# in https URLs (common for OAuth verification_uri_complete).
    // `cmd /c start "" <url>` opens the default browser reliably.
    return {
      file: "cmd.exe",
      args: ["/c", "start", "", url],
    };
  }

  if (platform === "darwin") {
    return {
      file: "open",
      args: [url],
    };
  }

  return {
    file: "xdg-open",
    args: [url],
  };
}

export function openUrlInDefaultBrowser(
  url: string,
  platform: NodeJS.Platform = process.platform,
): void {
  const command = resolveOpenExternalUrlCommand(platform, url);
  const child = spawn(command.file, [...command.args], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref();
}
