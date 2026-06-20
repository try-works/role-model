import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";

import { DeviceAuthorizationModal } from "./device-authorization-modal";

describe("DeviceAuthorizationModal", () => {
  test("renders the Codex Subscription code in a popup-ready dialog", () => {
    const markup = renderToStaticMarkup(
      <DeviceAuthorizationModal
        session={{
          authRequestId: "auth-001",
          providerAccountId: "openai.personal.codex-subscription",
          providerId: "openai",
          variantId: "openai-codex-subscription",
          status: "pending",
          userCode: "UGLI-ABKUP",
          verificationUri: "https://auth.openai.com/codex/device",
          verificationUriComplete: "https://auth.openai.com/codex/device",
        }}
        copyCodeLabel="Copy code"
        onClose={vi.fn()}
        onCopyCode={vi.fn()}
      />,
    );

    expect(markup).toContain("OpenAI verification code");
    expect(markup).toContain("UGLI-ABKUP");
    expect(markup).toContain("Copy code");
    expect(markup).toContain("Open OpenAI verification page");
    expect(markup).toContain("Dismiss");
  });
});
