import type { ReactNode } from "react";
import { useLocation } from "react-router";

import { cn } from "../lib/cn";
import {
  getRuntimeRouteDefinition,
  mutedPanelClassName,
  raisedPanelClassName,
  secondaryButtonClassName,
} from "../lib/design-system";
import { EmptyState, PageHeader, SectionCard } from "./page-primitives";

function BlueprintPanel({
  label,
  body,
  className,
  emphasis = false,
}: {
  label: string;
  body: string;
  className?: string;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        `${emphasis ? raisedPanelClassName : mutedPanelClassName} min-h-32 p-4 md:p-5`,
        className,
      )}
    >
      <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--rm-muted)]">
        {label}
      </p>
      <p className="mt-3 max-w-[34ch] text-sm leading-6 text-[var(--rm-secondary)]">{body}</p>
    </div>
  );
}

function TemplateBlueprint({ template }: { template: string }) {
  if (template === "summary-board") {
    return (
      <div className="grid grid-cols-12 gap-4">
        <BlueprintPanel
          className="col-span-12 md:col-span-4"
          label="Counters"
          body="Top-line runtime counts appear first so the page opens with a fast operational read."
          emphasis
        />
        <BlueprintPanel
          className="col-span-12 md:col-span-4"
          label="Attention items"
          body="Surface degraded or blocked states in a second compact summary block."
        />
        <BlueprintPanel
          className="col-span-12 md:col-span-4"
          label="Controller pulse"
          body="Reserve a concise controller and endpoint posture summary in the third summary cell."
        />
        <BlueprintPanel
          className="col-span-12 md:col-span-8"
          label="Primary ledger"
          body="The dominant lower-left region holds recent requests, activity, or issues that demand follow-up."
        />
        <BlueprintPanel
          className="col-span-12 md:col-span-4"
          label="Readiness rail"
          body="A narrow side rail carries provider or system readiness so it does not compete with the main ledger."
        />
      </div>
    );
  }

  if (template === "studio-workspace") {
    return (
      <div className="grid grid-cols-12 gap-4">
        <BlueprintPanel
          className="col-span-12 xl:col-span-4"
          label="Composer rail"
          body="Keep inputs, mode switches, and compact controls in a narrow left rail with no decorative nesting."
        />
        <BlueprintPanel
          className="col-span-12 xl:col-span-8"
          label="Primary result stage"
          body="The dominant pane belongs to the generated output, transcript, ranking result, or contract response."
          emphasis
        />
        <BlueprintPanel
          className="col-span-12 md:col-span-6"
          label="Diagnostics"
          body="Usage, receipts, captures, or request metadata stack below the primary stage on smaller screens."
        />
        <BlueprintPanel
          className="col-span-12 md:col-span-6"
          label="Payload reference"
          body="Raw request and response artifacts remain adjacent instead of moving into hidden drawers."
        />
      </div>
    );
  }

  if (template === "registry-detail") {
    return (
      <div className="grid grid-cols-12 gap-4">
        <BlueprintPanel
          className="col-span-12 xl:col-span-5"
          label="Registry rail"
          body="Keep the candidate list, variants, or editable registry rows in a compact scanning column."
        />
        <BlueprintPanel
          className="col-span-12 xl:col-span-7"
          label="Detail dossier"
          body="Use the larger pane for readiness notes, forms, and current operational state."
          emphasis
        />
        <BlueprintPanel
          className="col-span-12"
          label="Action strip"
          body="Primary actions sit below the two-column split so setup steps remain visible at the end of the reading flow."
        />
      </div>
    );
  }

  if (template === "model-inventory") {
    return (
      <div className="grid grid-cols-12 gap-4">
        <BlueprintPanel
          className="col-span-12"
          label="Filter bar"
          body="Reserve a full-width band for search, role filters, and concise model inventory controls."
        />
        <BlueprintPanel
          className="col-span-12 lg:col-span-8"
          label="Card grid"
          body="Configured models render as a mobile-first grid of cards so source, status, roles, and tooling remain comparable at a glance."
          emphasis
        />
        <BlueprintPanel
          className="col-span-12 lg:col-span-4"
          label="Detail modal contract"
          body="The right column documents the shared modal structure rather than adding another persistent detail page."
        />
      </div>
    );
  }

  if (template === "ledger-inspector") {
    return (
      <div className="grid grid-cols-12 gap-4">
        <BlueprintPanel
          className="col-span-12 xl:col-span-7"
          label="Ledger"
          body="The primary column is a dense request, activity, or capture ledger optimized for scanning and linking."
          emphasis
        />
        <BlueprintPanel
          className="col-span-12 xl:col-span-5"
          label="Inspector"
          body="Use the secondary column for captures, profiles, metrics details, and execution receipts."
        />
        <BlueprintPanel
          className="col-span-12"
          label="Raw payload rail"
          body="Raw JSON and transport details sit below the split when they should not compete with the primary ledger."
        />
      </div>
    );
  }

  if (template === "dual-console") {
    return (
      <div className="grid grid-cols-12 gap-4">
        <BlueprintPanel
          className="col-span-12 md:col-span-6"
          label="Console A"
          body="The first console gets a full-height pane with one explicit source label and minimal toolbar."
          emphasis
        />
        <BlueprintPanel
          className="col-span-12 md:col-span-6"
          label="Console B"
          body="The second console mirrors the first so proxy and upstream output can be compared side by side."
        />
      </div>
    );
  }

  if (template === "contract-reference") {
    return (
      <div className="grid grid-cols-12 gap-4">
        <BlueprintPanel
          className="col-span-12 xl:col-span-4"
          label="Reference column"
          body="A narrow left column carries base URLs, auth posture, and the reading-order summary."
        />
        <BlueprintPanel
          className="col-span-12 xl:col-span-8"
          label="Implementation panel"
          body="Use the larger pane for examples, compatibility notes, and operator commands."
          emphasis
        />
        <BlueprintPanel
          className="col-span-12"
          label="Boundary notes"
          body="Keep caveats and integration limits in a final full-width row instead of duplicating them across separate pages."
        />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-12 gap-4">
      <BlueprintPanel
        className="col-span-12 md:col-span-4"
        label="Runtime summary"
        body="Lead with lifecycle and control-plane facts in a compact top row."
        emphasis
      />
      <BlueprintPanel
        className="col-span-12 md:col-span-4"
        label="Policy blocks"
        body="Use structured side-by-side panels for version, auth, config-watch, and vendor posture."
      />
      <BlueprintPanel
        className="col-span-12 md:col-span-4"
        label="Preserved tools"
        body="Keep raw host links visible but subordinate to the repo-owned system view."
      />
      <BlueprintPanel
        className="col-span-12 xl:col-span-8"
        label="Topology pane"
        body="The main lower pane holds runtime, peer, or host topology with explicit boundaries and no ornamental chrome."
      />
      <BlueprintPanel
        className="col-span-12 xl:col-span-4"
        label="Operator rail"
        body="Reserve a narrower rail for version facts, policy notes, or follow-up actions."
      />
    </div>
  );
}

export function FutureSurface({
  eyebrow,
  title,
  description,
  notes,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  notes: readonly string[];
  actions?: ReactNode;
}) {
  const location = useLocation();
  const route = getRuntimeRouteDefinition(location.pathname);
  const template = route?.template ?? "registry-detail";

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={eyebrow} title={title} description={description} actions={actions} />
      <SectionCard
        title="Layout blueprint"
        description={`This planned page now carries an explicit ${template} structure so the final implementation has a clear Swiss-style reading order before live data lands.`}
      >
        <TemplateBlueprint template={template} />
      </SectionCard>
      <SectionCard
        title="Planned surface"
        description="This page is intentionally scaffolded while the first-priority routes land with real runtime data."
      >
        {notes.length === 0 ? (
          <EmptyState label="No planning notes were provided for this surface." />
        ) : (
          <ul className="space-y-3 text-sm leading-6 text-[var(--rm-secondary)]">
            {notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

export const futureSurfaceLinkClass = secondaryButtonClassName;
