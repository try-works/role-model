import type { ReactNode } from "react";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
} from "react-router";

import "./app.css";
import NotFoundRoute from "./routes/not-found";

export const links = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap",
  },
];

const themeBootstrapScript = `
(() => {
  try {
    const key = "role-model-runtime-theme";
    const stored = window.localStorage.getItem(key);
    const theme =
      stored === "light" || stored === "dark"
        ? stored
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", theme === "dark" ? "#000000" : "#f5f5f7");
    }
  } catch {}
})();
`;

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light dark" />
        <meta name="theme-color" content="#f5f5f7" />
        <meta name="theme-color" content="#000000" media="(prefers-color-scheme: dark)" />
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
        <h1 className="text-2xl font-semibold">{message}</h1>
        <p className="mt-3 text-[var(--rm-secondary)]">{details}</p>
      </main>
    </div>
  );
}
