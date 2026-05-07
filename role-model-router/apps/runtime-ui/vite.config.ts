import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const runtimeLegacyProxyTarget = process.env.RUNTIME_UI_PROXY_TARGET;
const runtimeHostTarget = process.env.RUNTIME_UI_HOST_TARGET ?? runtimeLegacyProxyTarget ?? "http://127.0.0.1:8080";
const runtimeBridgeTarget = process.env.RUNTIME_UI_BRIDGE_TARGET ?? runtimeLegacyProxyTarget ?? "http://127.0.0.1:8091";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
  server: {
    proxy: {
      "/api/role-model": runtimeBridgeTarget,
      "/healthz": runtimeBridgeTarget,
      "/api/captures": runtimeHostTarget,
      "/api/events": runtimeHostTarget,
      "/api/metrics": runtimeHostTarget,
      "/api/models": runtimeHostTarget,
      "/api/version": runtimeHostTarget,
      "/completion": runtimeHostTarget,
      "/health": runtimeHostTarget,
      "/infill": runtimeHostTarget,
      "/logs": runtimeHostTarget,
      "/running": runtimeHostTarget,
      "/sdapi": runtimeHostTarget,
      "/upstream": runtimeHostTarget,
      "/v1": runtimeHostTarget,
    },
  },
});
