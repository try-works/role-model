import { Navigate, useLocation } from "react-router";

const legacyRouteMap: Record<string, string> = {
  "/app/local/peers": "/app/local/endpoints",
  "/app/control/providers": "/app/remote/providers",
  "/app/control/routing-strategy": "/app/router/strategy",
  "/app/control/runtime-config": "/app/system/runtime-config",
  "/app/control/controller": "/app/router/controller",
  "/app/control/endpoints": "/app/connect",
  "/app/control/roles": "/app/models/roles",
  "/app/control/models": "/app/models",
  "/app/endpoints": "/app/connect",
  "/app/endpoints/downstream": "/app/connect/downstream",
  "/app/endpoints/upstream": "/app/connect/upstream",
  "/app/integrations/downstream": "/app/connect/downstream",
  "/app/integrations/upstream": "/app/connect/upstream",
};

export default function LegacyRouteRedirect() {
  const location = useLocation();
  return <Navigate to={legacyRouteMap[location.pathname] ?? "/app"} replace />;
}
