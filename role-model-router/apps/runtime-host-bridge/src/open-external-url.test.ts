import { describe, expect, test } from "vitest";

import { resolveOpenExternalUrlCommand } from "./open-external-url.js";

/**
 * Regression: Kimi/Moonshot device OAuth returns verification_uri_complete with ?user_code=.
 * Windows must not use explorer.exe (mishandles query strings); open-url must preserve the full URL.
 * Bound by addenda/05-manual-qa.kimi-oauth-verification-url-open.addendum-02.md
 */
describe("resolveOpenExternalUrlCommand (Kimi OAuth verification URL regression)", () => {
  const kimiVerificationUrl =
    "https://www.kimi.com/code/authorize_device?user_code=ABCD-EFGH";

  test("uses cmd start on Windows so query-string OAuth URLs open in the browser", () => {
    expect(resolveOpenExternalUrlCommand("win32", kimiVerificationUrl)).toEqual({
      file: "cmd.exe",
      args: ["/c", "start", "", kimiVerificationUrl],
    });
  });

  test("never routes https verification URLs through explorer.exe on Windows", () => {
    const command = resolveOpenExternalUrlCommand("win32", kimiVerificationUrl);
    expect(command.file.toLowerCase()).not.toBe("explorer.exe");
    expect(command.args.join(" ")).not.toMatch(/explorer/i);
    expect(command.args.at(-1)).toBe(kimiVerificationUrl);
  });

  test("preserves query and hash fragments as a single URL argument on Windows", () => {
    const url =
      "https://auth.kimi.com/device?user_code=WXYZ-1234&client_id=17e5f671-d194-4dfb-9706-5516cb48c098#section";
    const command = resolveOpenExternalUrlCommand("win32", url);
    expect(command).toEqual({
      file: "cmd.exe",
      args: ["/c", "start", "", url],
    });
    expect(command.args).toHaveLength(4);
  });

  test("uses open on macOS and xdg-open on Linux", () => {
    const url = "https://auth.openai.com/device";
    expect(resolveOpenExternalUrlCommand("darwin", url)).toEqual({
      file: "open",
      args: [url],
    });
    expect(resolveOpenExternalUrlCommand("linux", url)).toEqual({
      file: "xdg-open",
      args: [url],
    });
  });
});
