import { Navigate } from "react-router";

export default function LocalMatrixRoute() {
  return <Navigate to="/app/local/models?view=grid" replace />;
}
