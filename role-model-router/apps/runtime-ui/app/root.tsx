import { useEffect, type ReactNode } from "react";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
} from "react-router";

import "./app.css";
import {
  extractRuntimeUiAssetSignature,
  shouldReloadForUpdatedRuntimeUiBuild,
} from "./lib/build-sync";
import { getThemeBootstrapScript } from "./lib/theme";
import NotFoundRoute from "./routes/not-found";

const themeBootstrapScript = getThemeBootstrapScript("rm-runtime-ui-theme");

export const links = () => [];

export function Layout({ children }: { children: ReactNode }) {
  useEffect(() => {
    let disposed = false;
    const currentAssetMarkup = Array.from(
      document.querySelectorAll('link[rel="modulepreload"], link[rel="stylesheet"]'),
    )
      .map((element) => element.getAttribute("href") ?? "")
      .filter((value) => value.length > 0)
      .join("\n");

    if (currentAssetMarkup.length === 0) {
      return () => {
        disposed = true;
      };
    }

    void fetch(window.location.pathname, {
      cache: "no-store",
      headers: {
        accept: "text/html",
      },
    })
      .then(async (response) => {
        if (!response.ok || disposed) {
          return;
        }
        const serverHtml = await response.text();
        if (
          disposed ||
          !shouldReloadForUpdatedRuntimeUiBuild({
            currentAssetMarkup,
            serverHtml,
          })
        ) {
          return;
        }
        const serverSignature = extractRuntimeUiAssetSignature(serverHtml);
        if (!serverSignature) {
          return;
        }
        const reloadKey = `rm-runtime-ui-build-sync:${window.location.pathname}`;
        if (window.sessionStorage.getItem(reloadKey) === serverSignature) {
          return;
        }
        window.sessionStorage.setItem(reloadKey, serverSignature);
        window.location.reload();
      })
      .catch(() => {
        // The runtime UI should stay usable even if this background freshness check fails.
      });

    return () => {
      disposed = true;
    };
  }, []);

  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light dark" />
        <meta name="theme-color" content="#f5f5f7" />
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: { error: unknown }) {
  const message = "Something went wrong.";
  let details = "The runtime UI could not render this route.";

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return <NotFoundRoute />;
    }
    details = error.statusText;
  } else if (error instanceof Error) {
    details = error.message;
  }

  return (
    <div className="min-h-screen bg-[var(--rm-bg)] p-4">
      <main className="mx-auto max-w-3xl rounded-[var(--rm-radius-panel)] border border-[var(--rm-accent)] bg-[var(--rm-surface)] p-8 text-[var(--rm-fg)]">
        <h1 className="text-2xl font-light">{message}</h1>
        <p className="mt-3 text-[var(--rm-secondary)]">{details}</p>
      </main>
    </div>
  );
}
