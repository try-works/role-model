import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

const runtimeProxyTarget = process.env.RUNTIME_UI_PROXY_TARGET ?? "http://127.0.0.1:8091";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
  server: {
    proxy: {
      "/api": runtimeProxyTarget,
      "/v1": runtimeProxyTarget,
      "/healthz": runtimeProxyTarget,
      "/logs": runtimeProxyTarget,
    },
  },
});
