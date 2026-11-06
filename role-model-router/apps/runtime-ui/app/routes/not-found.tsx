import { Link, useLocation } from "react-router";

import { SectionCard } from "../components/page-primitives";

// R14: the client-side selfcheck surface. It is deliberately owned by the catch-all route so the
// production route table and its inventory stay unchanged; /selfcheck is a diagnostic page, not a
// product route. The specimen and checksum are owned by ui-parity and imported, never copied.
import {
  SELFCHECK_ENTRIES,
  SELFCHECK_MARKER,
} from "../../../../packages/ui-parity/src/selfcheck-surface-core.js";

const entryValue = (key: string): string => {
  const entry = SELFCHECK_ENTRIES.find((candidate) => candidate.key === key);
  if (entry === undefined) throw new Error(`selfcheck specimen is missing entry: ${key}`);
  return entry.value;
};

function SelfcheckSurface() {
  const marker = SELFCHECK_MARKER;
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
          data-selfcheck-value={entryValue("heading")}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--rm-muted)]">
            Selfcheck
          </p>
          <h1 className="text-2xl font-semibold text-[var(--rm-fg)]">{entryValue("heading")}</h1>
          <p className="max-w-[60ch] text-sm leading-6 text-[var(--rm-secondary)]">
            Deterministic parity specimen served by the React runtime client.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="rounded-md border border-[var(--rm-border)] px-3 py-1.5 text-sm font-semibold"
            data-selfcheck-key="button"
            data-selfcheck-value={entryValue("button")}
            disabled
            type="button"
          >
            {entryValue("button")}
          </button>
          <span
            className="rounded-sm bg-[var(--rm-surface)] px-2 py-1 text-[11px] font-semibold"
            data-selfcheck-key="badge"
            data-selfcheck-value={entryValue("badge")}
          >
            {entryValue("badge")}
          </span>
        </div>
        <label
          className="block text-sm"
          data-selfcheck-key="input"
          data-selfcheck-value={entryValue("input")}
        >
          {entryValue("input")}
          <input
            aria-label={entryValue("input")}
            className="mt-1 block w-full rounded-md border border-[var(--rm-border)] bg-[var(--rm-surface)] px-2 py-1.5 text-sm"
            readOnly
            value={entryValue("input").toLowerCase()}
          />
        </label>
        <div
          className="rounded-md border border-[var(--rm-border)] p-3 text-sm"
          data-selfcheck-key="chart"
          data-selfcheck-value={entryValue("chart")}
        >
          {entryValue("chart")}
        </div>
        <div
          className="rounded-md border border-[var(--rm-border)] p-3 text-sm"
          data-selfcheck-key="table"
          data-selfcheck-value={entryValue("table")}
        >
          {entryValue("table")}
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