import { renderToString } from "@role-model-router/foldkit/experimental/server";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";

import { Message } from "../src/message";
import type { Model } from "../src/model";
import { initialProviderAccountState } from "../src/provider-account";
import { initialDeviceAuthState } from "../src/features/device-auth/model";
import { view } from "../src/view";
import { shellModel, shellUpdate } from "./support/runtime-shell";

/**
 * S664: choosing a Moonshot AI / Kimi Code connection must trigger the OAuth2 device-code flow from
 * the connect card, not ask for an API key and then fail activation with "add the provider credential".
 * The variant metadata carries authMode; the card must route on it.
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
  variants: [{ authMode: "api-key-static", label: "Default", modelIds: ["gpt-6"], variantId: "default" }],
};

const renderProviders = async (provider: unknown, draft: Partial<ReturnType<typeof initialProviderAccountState>["draft"]> = {}) => {
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
    deviceAuth: initialDeviceAuthState(),
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
    const container = await renderProviders(moonshot, {
      modelInput: "moonshot/kimi-k3",
      providerId: "moonshot",
      providerKind: "provider-openai",
      variantId: "kimi-code",
    });
    const text = container.textContent ?? "";
    expect(text).toContain("Connect with Kimi (device authorization)");
    // The API-key path must not be what the OAuth variant presents.
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
    const base = shellModel();
    const model = shellModel({
      providerAccount: {
        ...initialProviderAccountState(),
        draft: {
          ...initialProviderAccountState().draft,
          modelInput: "moonshot/kimi-k3",
          providerId: "moonshot",
          providerKind: "provider-openai",
          variantId: "kimi-code",
        },
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
});
