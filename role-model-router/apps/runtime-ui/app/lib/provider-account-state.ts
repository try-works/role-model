import type { RuntimeAccount, RuntimeDeviceAuthorization } from "./runtime-api";

export function resolveProviderAccountLifecycle(input: {
  readonly authMode: string;
  readonly providerAccountId: string;
  readonly oauthState: RuntimeDeviceAuthorization | null;
  readonly existingAccount?: Pick<RuntimeAccount, "providerAccountId" | "authMode" | "status" | "healthStatus" | "rotationState"> | null;
}): {
  readonly status: string;
  readonly healthStatus: string;
  readonly rotationState: string;
} {
  if (input.authMode === "api-key-static") {
    if (
      input.existingAccount?.providerAccountId === input.providerAccountId &&
      input.existingAccount.authMode === "api-key-static" &&
      input.existingAccount.status === "disabled" &&
      input.existingAccount.healthStatus === "credentials-missing"
    ) {
      return {
        status: input.existingAccount.status,
        healthStatus: input.existingAccount.healthStatus,
        rotationState: input.existingAccount.rotationState ?? "not-required",
      };
    }

    return {
      status: "active",
      healthStatus: "healthy",
      rotationState: "stable",
    };
  }

  if (input.oauthState?.status === "connected") {
    return {
      status: "active",
      healthStatus: "healthy",
      rotationState: "stable",
    };
  }

  if (
    input.existingAccount?.providerAccountId === input.providerAccountId &&
    input.existingAccount.authMode === "oauth2-device-code" &&
    input.existingAccount.status === "active" &&
    input.existingAccount.healthStatus === "healthy"
  ) {
    return {
      status: input.existingAccount.status,
      healthStatus: input.existingAccount.healthStatus,
      rotationState: input.existingAccount.rotationState ?? "stable",
    };
  }

  return {
    status: "disabled",
    healthStatus: "credentials-missing",
    rotationState: "in-progress",
  };
}
