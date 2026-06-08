import { Outlet } from "react-router";

import { AppShell } from "../components/app-shell";
import { ShellHeaderProvider } from "../lib/shell-header-context";

export default function AppLayoutRoute() {
  return (
    <ShellHeaderProvider>
      <AppShell>
        <Outlet />
      </AppShell>
    </ShellHeaderProvider>
  );
}
