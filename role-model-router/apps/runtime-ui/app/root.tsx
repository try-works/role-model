import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration } from "react-router";
import type { ReactNode } from "react";

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
    href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap",
  },
];

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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
  let message = "Something went wrong.";
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
      <main className="mx-auto max-w-3xl rounded-none border border-rose-200 bg-white p-8 text-rose-700">
        <h1 className="text-2xl font-light">{message}</h1>
        <p className="mt-3">{details}</p>
      </main>
    </div>
  );
}
