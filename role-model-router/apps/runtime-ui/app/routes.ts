import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/index.tsx"),
  route("app", "routes/app-layout.tsx", [
    index("routes/dashboard.tsx"),
    route("studio/chat", "routes/workbench.tsx"),
    route("studio/images", "routes/studio-images.tsx"),
    route("studio/audio", "routes/studio-audio.tsx"),
    route("studio/rerank", "routes/studio-rerank.tsx"),
    route("studio/advanced", "routes/studio-advanced.tsx"),
    route("control/providers", "routes/providers.tsx"),
    route("control/runtime-config", "routes/control-runtime-config.tsx"),
    route("control/controller", "routes/control-controller.tsx"),
    route("control/endpoints", "routes/endpoints.tsx"),
    route("control/models", "routes/control-models.tsx"),
    route("observe/activity", "routes/observe-activity.tsx"),
    route("observe/requests", "routes/requests.tsx"),
    route("observe/requests/:requestId", "routes/request-detail.tsx"),
    route("observe/logs", "routes/observe-logs.tsx"),
    route("integrations/downstream", "routes/integrations-downstream.tsx"),
    route("integrations/upstream", "routes/integrations-upstream.tsx"),
    route("system/runtime", "routes/runtime.tsx"),
    route("system/peers", "routes/system-peers.tsx"),
  ]),
  route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;
