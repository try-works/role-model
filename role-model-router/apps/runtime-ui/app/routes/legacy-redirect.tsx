import { Navigate, useLocation } from "react-router";

const legacyRouteMap: Record<string, string> = {
  "/app/local/models": "/app/local/choose",
  "/app/local/swap": "/app/local/llama-swap/swap",
  "/app/local/policy": "/app/local/llama-swap/policy",
  "/app/local/logs": "/app/local/llama-swap/logs",
  "/app/local/matrix": "/app/local/llama-swap/matrix",
  "/app/local/peers": "/app/local/endpoints",
  "/app/control/providers": "/app/remote/providers",
  "/app/control/routing-strategy": "/app/router/strategy",
  "/app/control/runtime-config": "/app/system/runtime-config",
  "/app/control/session-readiness": "/app/system/session-readiness",
  "/app/control/controller": "/app/router/controller",
  "/app/control/endpoints": "/app/connect",
  "/app/control/roles": "/app/models/roles",
  "/app/control/models": "/app/models",
  "/app/control/benchmark": "/app/models/benchmark",
  "/app/endpoints": "/app/connect",
  "/app/endpoints/downstream": "/app/connect/downstream",
  "/app/endpoints/upstream": "/app/connect/upstream",
  "/app/observe": "/app/observe/requests",
  "/app/router/config": "/app/router/strategy",
  "/app/integrations/downstream": "/app/connect/downstream",
  "/app/integrations/upstream": "/app/connect/upstream",
};

export default function LegacyRouteRedirect() {
  const location = useLocation();
  return <Navigate to={legacyRouteMap[location.pathname] ?? "/app"} replace />;
}
