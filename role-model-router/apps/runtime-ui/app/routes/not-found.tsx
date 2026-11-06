import { Link, useLocation } from "react-router";

import { SectionCard } from "../components/page-primitives";

// R14: the client-side selfcheck surface. It is deliberately owned by the catch-all route so the
// production route table and its inventory stay unchanged; /selfcheck is a diagnostic page, not a
// product route. The checksum is over the ordered specimen both clients must render identically.
const SELFCHECK_ENTRIES = [
  { key: "heading", value: "RM3 selfcheck surface" },
  { key: "button", value: "Save changes" },
  { key: "input", value: "Operator token" },
  { key: "badge", value: "READY" },
  { key: "chart", value: "requests / hour" },
  { key: "table", value: "4 rows" },
] as const;

const selfcheckMarker = (): string => {
  const canonical = [...SELFCHECK_ENTRIES]
    .sort((left, right) => (left.key < right.key ? -1 : left.key > right.key ? 1 : 0))
    .map((entry) => `${entry.key}\u0000${entry.value}`)
    .join("\u0001");
  let hash = 0x811c9dc5;
  for (let index = 0; index < canonical.length; index += 1) {
    hash ^= canonical.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
};

function SelfcheckSurface() {
  const marker = selfcheckMarker();
  return (
    <main
      className="min-h-screen bg-[var(--rm-bg)] p-4"
      data-selfcheck-marker={marker}
      data-selfcheck-surface="rm3"
    >
      <div className="mx-auto max-w-3xl space-y-6 pt-16">
        <div
          className="space-y-3"
          data-selfcheck-key="heading"
          data-selfcheck-value="RM3 selfcheck surface"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--rm-muted)]">
            Selfcheck
          </p>
          <h1 className="text-2xl font-semibold text-[var(--rm-fg)]">RM3 selfcheck surface</h1>
          <p className="max-w-[60ch] text-sm leading-6 text-[var(--rm-secondary)]">
            Deterministic parity specimen served by the React runtime client.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="rounded-md border border-[var(--rm-border)] px-3 py-1.5 text-sm font-semibold"
            data-selfcheck-key="button"
            data-selfcheck-value="Save changes"
            disabled
            type="button"
          >
            Save changes
          </button>
          <span
            className="rounded-sm bg-[var(--rm-surface)] px-2 py-1 text-[11px] font-semibold"
            data-selfcheck-key="badge"
            data-selfcheck-value="READY"
          >
            READY
          </span>
        </div>
        <label
          className="block text-sm"
          data-selfcheck-key="input"
          data-selfcheck-value="Operator token"
        >
          Operator token
          <input
            aria-label="Operator token"
            className="mt-1 block w-full rounded-md border border-[var(--rm-border)] bg-[var(--rm-surface)] px-2 py-1.5 text-sm"
            readOnly
            value="operator token"
          />
        </label>
        <div
          className="rounded-md border border-[var(--rm-border)] p-3 text-sm"
          data-selfcheck-key="chart"
          data-selfcheck-value="requests / hour"
        >
          requests / hour
        </div>
        <div
          className="rounded-md border border-[var(--rm-border)] p-3 text-sm"
          data-selfcheck-key="table"
          data-selfcheck-value="4 rows"
        >
          4 rows
        </div>
      </div>
    </main>
  );
}

export default function NotFoundRoute() {
  const { pathname } = useLocation();
  if (pathname === "/selfcheck") return <SelfcheckSurface />;
  return (
    <div className="min-h-screen bg-[var(--rm-bg)] p-4">
      <div className="mx-auto max-w-3xl space-y-6 pt-16">
        <div className="space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--rm-muted)]">
            Not found
          </p>
          <h1 className="text-2xl font-semibold text-[var(--rm-fg)]">
            This runtime route does not exist
          </h1>
          <p className="max-w-[60ch] text-sm leading-6 text-[var(--rm-secondary)]">
            Return to the operator shell to continue working with the runtime surfaces.
          </p>
        </div>
        <SectionCard title="Navigation" description="The repo-owned runtime UI lives under /app.">
          <Link className="text-sm font-semibold text-[var(--rm-accent)]" to="/app">
            Go to the dashboard
          </Link>
        </SectionCard>
      </div>
    </div>
  );
}