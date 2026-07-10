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

const bootThemePalettes = {
  dark: {
    accent: "#5e6ad2",
    bg: "#010102",
    border: "#23252a",
    fg: "#f7f8f8",
    secondary: "#d0d6e0",
    surface: "#0f1011",
  },
  light: {
    accent: "#5e6ad2",
    bg: "#ffffff",
    border: "#e3e6ec",
    fg: "#0f1115",
    secondary: "#3a4150",
    surface: "#f7f8f8",
  },
} as const;

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
    const palettes = ${JSON.stringify(bootThemePalettes)};
    const key = "role-model-runtime-theme";
    const stored = window.localStorage.getItem(key);
    const theme =
      stored === "light" || stored === "dark"
        ? stored
        : "dark";
    const palette = palettes[theme] ?? palettes.dark;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.documentElement.style.backgroundColor = palette.bg;
    document.documentElement.style.color = palette.fg;
    for (const [token, value] of Object.entries(palette)) {
      document.documentElement.style.setProperty(\`--rm-\${token}\`, value);
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
        <meta name="theme-color" content="#010102" />
        <meta name="theme-color" content="#010102" media="(prefers-color-scheme: dark)" />
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: Static bootstrap prevents a theme flash before React hydration. */}
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
        <Meta />
        <Links />
      </head>
      <body
        style={{ background: "var(--rm-bg, #010102)", color: "var(--rm-fg, #f7f8f8)", margin: 0 }}
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
        background: "var(--rm-bg, #010102)",
        color: "var(--rm-fg, #f7f8f8)",
        display: "flex",
        fontFamily: "var(--rm-font-display, Inter, Segoe UI, sans-serif)",
        minHeight: "100vh",
        padding: "24px",
      }}
    >
      <section
        style={{
          border: "1px solid var(--rm-border, #23252a)",
          borderRadius: "16px",
          background: "var(--rm-surface, #0f1011)",
          boxShadow: "0 24px 80px rgba(0, 0, 0, 0.25)",
          margin: "0 auto",
          maxWidth: "560px",
          padding: "28px",
          width: "100%",
        }}
      >
        <p
          style={{
            color: "var(--rm-accent, #5e6ad2)",
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
            color: "var(--rm-secondary, #d0d6e0)",
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
