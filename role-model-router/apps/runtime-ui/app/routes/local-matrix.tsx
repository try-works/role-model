import { Navigate } from "react-router";

export default function LocalMatrixRoute() {
  return <Navigate to="/app/local/llama-swap/models?view=grid" replace />;
}
