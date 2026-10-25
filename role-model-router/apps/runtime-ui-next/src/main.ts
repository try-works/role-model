// Browser entry for the Foldkit runtime UI (run115 S31).
//
// Serves the same shell the tests mount, against the same origin the host serves
// the API from, so the packaged runtime can host this client via --static-root.
import { mountWithDiagnostics } from "./mount";

const container = document.getElementById("root");
if (!container) throw new Error("runtime-ui-next requires a #root container");

mountWithDiagnostics(container, {
  baseUrl: window.location.origin,
});
