import { mapDiscoveryToProviderConfig } from "./downstream-openai.js";
import type {
  DownstreamOpenAIDiscovery,
  PiExtensionAPI,
  PiRefreshModelsContext,
  ProviderRegistration,
} from "./types.js";

export function createProviderRegistration(
  discovery: DownstreamOpenAIDiscovery,
): ProviderRegistration {
  return mapDiscoveryToProviderConfig(discovery);
}

export function registerRoleModelProvider(
  pi: Pick<PiExtensionAPI, "registerProvider">,
  discovery: DownstreamOpenAIDiscovery,
  refreshModels?: (
    context: PiRefreshModelsContext,
  ) => Promise<ProviderRegistration["config"]["models"]>,
): ProviderRegistration {
  const registration = createProviderRegistration(discovery);
  pi.registerProvider(
    registration.providerId,
    refreshModels ? { ...registration.config, refreshModels } : registration.config,
  );
  return registration;
}
