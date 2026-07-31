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
import { BOOT_RM3_TOKEN_KEYS, BOOT_THEME_PALETTES } from "./lib/theme";
import NotFoundRoute from "./routes/not-found";

export const links = () => [
  // Keep the packaged runtime shell self-contained so first paint never waits on remote assets.
  {
    rel: "preload",
    href: "/assets/fonts/inter-latin-400-normal.woff2",
    as: "font",
    type: "font/woff2",
    crossOrigin: "anonymous",
  },
  {
    rel: "preload",
    href: "/assets/fonts/inter-latin-600-normal.woff2",
    as: "font",
    type: "font/woff2",
    crossOrigin: "anonymous",
  },
  {
    rel: "preload",
    href: "/assets/fonts/ibm-plex-mono-latin-400-normal.woff2",
    as: "font",
    type: "font/woff2",
    crossOrigin: "anonymous",
  },
];

const themeBootstrapScript = `
(() => {
  try {
    const palettes = ${JSON.stringify(BOOT_THEME_PALETTES)};
    const rm3Tokens = ${JSON.stringify(BOOT_RM3_TOKEN_KEYS)};
    const key = "role-model-runtime-theme";
    const stored = window.localStorage.getItem(key);
    const theme =
      stored === "light" || stored === "dark"
        ? stored
        : "dark";
    const palette = palettes[theme] ?? palettes.dark;
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    root.style.backgroundColor = palette.bg;
    root.style.color = palette.fg;
    for (const [token, value] of Object.entries(palette)) {
      root.style.setProperty(\`--rm-\${token}\`, value);
    }
    const rm3 = rm3Tokens[theme] ?? rm3Tokens.dark;
    for (const [token, value] of Object.entries(rm3)) {
      root.style.setProperty(\`--rm3-\${token}\`, value);
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", palette.bg);
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
        <meta name="theme-color" content="#0a0a0a" />
        <meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: dark)" />
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: Static bootstrap prevents a theme flash before React hydration. */}
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
        <Meta />
        <Links />
      </head>
      <body
        style={{ background: "var(--rm-bg, #0a0a0a)", color: "var(--rm-fg, #ededed)", margin: 0 }}
      >
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

export function HydrateFallback() {
  return (
    <main
      style={{
        alignItems: "center",
        background: "var(--rm-bg, #0a0a0a)",
        color: "var(--rm-fg, #ededed)",
        display: "flex",
        fontFamily: 'var(--rm-font-display, "Geist", ui-sans-serif, system-ui, sans-serif)',
        minHeight: "100vh",
        padding: "24px",
      }}
    >
      <section
        style={{
          border: "1px solid var(--rm-border, #1f1f1f)",
          borderRadius: "16px",
          background: "var(--rm-surface, #0f0f0f)",
          boxShadow: "0 24px 80px rgba(0, 0, 0, 0.25)",
          margin: "0 auto",
          maxWidth: "560px",
          padding: "28px",
          width: "100%",
        }}
      >
        <p
          style={{
            color: "var(--rm-accent, #ffffff)",
            fontSize: "12px",
            fontWeight: 600,
            letterSpacing: "0.16em",
            margin: "0 0 14px",
            textTransform: "uppercase",
          }}
        >
          Runtime UI
        </p>
        <h1
          style={{
            fontSize: "22px",
            fontWeight: 400,
            letterSpacing: "-0.018em",
            lineHeight: "28px",
            margin: 0,
          }}
        >
          Loading role-model runtime
        </h1>
        <p
          style={{
            color: "var(--rm-secondary, #9a9a9a)",
            fontSize: "14px",
            lineHeight: "22px",
            margin: "12px 0 0",
          }}
        >
          Loading the local runtime interface and bundled design-system assets.
        </p>
      </section>
    </main>
  );
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
