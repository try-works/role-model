import { mapDiscoveryToProviderConfig } from "./downstream-openai.js";
import type { DownstreamOpenAIDiscovery, PiExtensionAPI, ProviderRegistration } from "./types.js";

export function createProviderRegistration(
  discovery: DownstreamOpenAIDiscovery,
): ProviderRegistration {
  return mapDiscoveryToProviderConfig(discovery);
}

export function registerRoleModelProvider(
  pi: Pick<PiExtensionAPI, "registerProvider">,
  discovery: DownstreamOpenAIDiscovery,
): ProviderRegistration {
  const registration = createProviderRegistration(discovery);
  pi.registerProvider(registration.providerId, registration.config);
  return registration;
}
