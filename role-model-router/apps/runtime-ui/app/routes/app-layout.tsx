import { Outlet } from "react-router";

import { AppShell } from "../components/app-shell";

export default function AppLayoutRoute() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
