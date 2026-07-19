import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

import { DeviceAuthorizationCard } from "./device-authorization-card";

describe("DeviceAuthorizationCard", () => {
  test("renders explicit copy and open-page guidance for Codex Subscription", () => {
    const markup = renderToStaticMarkup(
      <DeviceAuthorizationCard
        session={{
          authRequestId: "auth-001",
          providerAccountId: "openai.personal.codex-subscription",
          providerId: "openai",
          variantId: "openai-codex-subscription",
          status: "pending",
          userCode: "ABCD-12345",
          verificationUri: "https://auth.openai.com/codex/device",
          verificationUriComplete: "https://auth.openai.com/codex/device",
        }}
        copyCodeLabel="Copy code"
        onCopyCode={vi.fn()}
      />,
    );

    expect(markup).toContain("Enter this code on the OpenAI page");
    expect(markup).toContain("ABCD-12345");
    expect(markup).toContain("Copy code");
    expect(markup).toContain("Refresh code and open OpenAI verification page");
    expect(markup).toContain("OpenAI asks for this code after you sign in.");
  });

  test("keeps the existing auto-poll guidance for non-Codex device auth", () => {
    const markup = renderToStaticMarkup(
      <DeviceAuthorizationCard
        session={{
          authRequestId: "auth-001",
          providerAccountId: "moonshot.personal.kimi-code",
          providerId: "moonshot",
          variantId: "kimi-code",
          status: "pending",
          userCode: "WXYZ-1234",
          verificationUri: "https://auth.kimi.com/device",
          verificationUriComplete: "https://auth.kimi.com/device?user_code=WXYZ-1234",
        }}
        copyCodeLabel="Copy code"
        onCopyCode={vi.fn()}
      />,
    );

    expect(markup).toContain("User code:");
    expect(markup).toContain(
      "The verification page opens in a new tab and this screen keeps checking automatically.",
    );
    expect(markup).not.toContain("Open OpenAI verification page");
  });
});
