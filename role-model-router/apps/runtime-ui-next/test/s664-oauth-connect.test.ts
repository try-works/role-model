import { renderToString } from "@role-model-router/foldkit/experimental/server";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { defineDeviceAuthCommands } from "../src/commands";
import { Message } from "../src/message";
import type { Model } from "../src/model";
import { initialProviderAccountState } from "../src/provider-account";
import { initialDeviceAuthState } from "../src/features/device-auth/model";
import { view } from "../src/view";
import { shellModel, shellUpdate } from "./support/runtime-shell";

/**
 * S664/S665: choosing a Moonshot AI / Kimi Code connection must trigger the OAuth2 device-code flow
 * from the connect card (not the API-key form), the runtime must open the authorization URL in the
 * user's browser once the device authorization is pending, and the card must expose the code + link.
 */
const providerRow = (meta: unknown) => ({
  id: "provider-row",
  label: "Provider",
  meta: JSON.stringify(meta),
  value: "ok",
});

const moonshot = {
  displayName: "Moonshot AI",
  envVars: ["MOONSHOT_API_KEY"],
  modelIds: [],
  providerId: "moonshot",
  providerKind: "provider-openai",
  variants: [
    {
      authMode: "oauth2-device-code",
      label: "Kimi Code",
      modelIds: ["moonshot/kimi-k3"],
      variantId: "kimi-code",
    },
    {
      authMode: "api-key-static",
      label: "Moonshot Open Platform",
      modelIds: ["moonshot/kimi-k2"],
      variantId: "moonshot-open-platform",
    },
  ],
};

const openai = {
  displayName: "OpenAI",
  envVars: ["OPENAI_API_KEY"],
  modelIds: ["gpt-6"],
  providerId: "openai",
  providerKind: "openai",
  variants: [
    { authMode: "api-key-static", label: "Default", modelIds: ["gpt-6"], variantId: "default" },
  ],
};

const pendingSession = {
  authRequestId: "auth-1",
  providerAccountId: "moonshot.personal.kimi-code",
  status: "pending" as const,
  userCode: "DQ4Y-GQUZ",
  verificationUri: "https://www.kimi.com/code/authorize_device",
  verificationUriComplete: "https://www.kimi.com/code/authorize_device?user_code=DQ4Y-GQUZ",
};

const moonshotDraft = {
  modelInput: "moonshot/kimi-k3",
  providerId: "moonshot",
  providerKind: "provider-openai",
  variantId: "kimi-code",
};

const renderProviders = async (
  provider: unknown,
  draft: Partial<ReturnType<typeof initialProviderAccountState>["draft"]> = {},
  deviceAuth = initialDeviceAuthState(),
) => {
  const base = shellModel();
  const model = shellModel({
    // SAFETY: the test supplies one of the exact AppRoute tags.
    route: { _tag: "Providers" } as Model["route"],
    readbacks: {
      ...base.readbacks,
      providerCatalog: { rows: [providerRow(provider)], status: "ok", token: 1 },
    },
    providerAccount: {
      ...initialProviderAccountState(),
      draft: { ...initialProviderAccountState().draft, ...draft },
    },
    deviceAuth,
  });
  const rendered = await Effect.runPromise(
    renderToString({ init: () => ({ model, commands: [] }), view }, { isHydratable: false }),
  );
  const container = document.createElement("div");
  container.innerHTML = rendered.html;
  return container;
};

describe("S664 OAuth connect routing", () => {
  it("routes the Kimi Code (oauth2-device-code) variant to the device-authorization action", async () => {
    const container = await renderProviders(moonshot, moonshotDraft);
    const text = container.textContent ?? "";
    expect(text).toContain("Connect with Kimi (device authorization)");
    expect(text).not.toContain("API key (optional)");
    expect(text).not.toContain("Save configuration");
  });

  it("keeps the API-key save path for api-key-static variants", async () => {
    const container = await renderProviders(openai, {
      modelInput: "gpt-6",
      providerId: "openai",
      providerKind: "openai",
      variantId: "default",
    });
    const text = container.textContent ?? "";
    expect(text).toContain("Save configuration");
    expect(text).toContain("API key (optional)");
    expect(text).not.toContain("Connect with Kimi (device authorization)");
  });

  it("seeds the device-auth draft and starts the read when the OAuth connect is requested", () => {
    const model = shellModel({
      providerAccount: {
        ...initialProviderAccountState(),
        draft: { ...initialProviderAccountState().draft, ...moonshotDraft },
      },
      deviceAuth: initialDeviceAuthState(),
    });
    const result = shellUpdate(model, Message.ProviderAccountDeviceAuthRequested({}));
    const device = result.model.deviceAuth;
    expect(device?.draft.providerId).toBe("moonshot");
    expect(device?.draft.variantId).toBe("kimi-code");
    expect(device?.draft.selectedModelIds).toEqual(["moonshot/kimi-k3"]);
    expect(device?.draft.authMode).toBe("oauth2-device-code");
    expect(device?.status).toBe("starting");
    expect((result.commands ?? []).length).toBeGreaterThan(0);
  });

  it("renders a clickable authorization link once a pending session has a verification URL", async () => {
    const container = await renderProviders(moonshot, moonshotDraft, {
      ...initialDeviceAuthState(),
      session: pendingSession,
      status: "pending",
    });
    const link = container.querySelector<HTMLAnchorElement>("a[data-device-auth-open-url]");
    expect(link).not.toBeNull();
    expect(link?.getAttribute("href")).toBe(pendingSession.verificationUriComplete);
    expect(link?.getAttribute("target")).toBe("_blank");
  });

  it("opens the authorization URL in the browser when the device authorization starts pending", async () => {
    const opened: string[] = [];
    const client = {
      activate: async () => ({}),
      list: async () => [],
      openUrl: async (url: string) => {
        opened.push(url);
        return {};
      },
      poll: async () => pendingSession,
      start: async () => pendingSession,
    };
    const commands = defineDeviceAuthCommands(
      // SAFETY: the fake implements every DeviceAuthClient member the start command uses.
      client as never,
    );
    const message = await Effect.runPromise(
      commands.start({ payload: JSON.stringify({}), token: 1 }).effect,
    );
    expect(message._tag).toBe("DeviceAuthStarted");
    expect(opened).toEqual([pendingSession.verificationUriComplete]);
  });
});
