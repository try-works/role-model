import { Navigate } from "react-router";

/** Local Matrix stub: redirect to llama-swap models grid view (RM3 DS). */
export default function LocalMatrixRoute() {
  return <Navigate to="/app/local/llama-swap/models?view=grid" replace />;
}
