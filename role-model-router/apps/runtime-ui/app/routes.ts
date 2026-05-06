import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/index.tsx"),
  route("app", "routes/app-layout.tsx", [
    index("routes/dashboard.tsx"),
    route("providers", "routes/providers.tsx"),
    route("accounts", "routes/accounts.tsx"),
    route("workbench", "routes/workbench.tsx"),
    route("runtime", "routes/runtime.tsx"),
    route("endpoints", "routes/endpoints.tsx"),
    route("requests", "routes/requests.tsx"),
    route("requests/:requestId", "routes/request-detail.tsx"),
  ]),
  route("*", "routes/not-found.tsx"),
] satisfies RouteConfig;
