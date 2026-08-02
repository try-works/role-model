import { Navigate } from "react-router";

/** Fixed Decision #15 — RM3 Router IA has no Config segment. */
export default function RouterConfigRoute() {
  return <Navigate to="/app/router/strategy" replace />;
}
