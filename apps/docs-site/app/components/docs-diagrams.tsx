import type { ReactNode } from "react";

type Step = {
  title: string;
  detail?: string;
};

function DiagramFrame({
  children,
  caption,
}: {
  children: ReactNode;
  caption?: string;
}) {
  return (
    <figure className="my-6 overflow-x-auto rounded-xl border border-fd-border/60 bg-fd-card/30 p-4">
      <div className="min-w-[320px]">{children}</div>
      {caption ? (
        <figcaption className="mt-3 text-center text-sm text-fd-muted-foreground">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

function DiagramCard({
  title,
  detail,
}: {
  title: string;
  detail?: string;
}) {
  return (
    <div className="rounded-lg border border-fd-border bg-fd-background px-4 py-3 text-center shadow-sm">
      <div className="font-medium text-fd-foreground">{title}</div>
      {detail ? <div className="mt-1 text-sm text-fd-muted-foreground">{detail}</div> : null}
    </div>
  );
}

function DiagramLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-center text-xs font-medium uppercase tracking-[0.16em] text-fd-muted-foreground">
      {children}
    </div>
  );
}

function DownArrow() {
  return (
    <div className="flex justify-center py-1 text-fd-muted-foreground">
      <svg
        aria-hidden="true"
        className="h-6 w-6"
        fill="none"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 4V18M6 12L12 18L18 12"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
}

function VerticalStepsDiagram({
  steps,
  caption,
}: {
  steps: Step[];
  caption?: string;
}) {
  return (
    <DiagramFrame caption={caption}>
      <div className="mx-auto flex max-w-2xl flex-col items-stretch gap-0">
        {steps.map((step, index) => (
          <div key={step.title}>
            <DiagramCard detail={step.detail} title={step.title} />
            {index < steps.length - 1 ? <DownArrow /> : null}
          </div>
        ))}
      </div>
    </DiagramFrame>
  );
}

export function ProtocolPipelineDiagram() {
  return (
    <VerticalStepsDiagram
      caption="The canonical protocol objects become an explainable router decision, then feed future routing through new evidence."
      steps={[
        {
          title: "EndpointIdentity",
          detail: "What concrete endpoint the router can choose.",
        },
        {
          title: "DeclaredCapabilityProfile",
          detail: "What the endpoint claims to support.",
        },
        {
          title: "ObservedPerformanceProfile",
          detail: "What measurement says the endpoint actually does.",
        },
        {
          title: "Role / Task / Binding context",
          detail: "Execution intent and endpoint-role compatibility.",
        },
        {
          title: "RoutingPolicy",
          detail: "Hard constraints plus optimization intent.",
        },
        {
          title: "RouterDecision",
          detail: "Eligibility, scores, chosen endpoint, fallbacks, and reasons.",
        },
        {
          title: "Trace / Usage / Feedback",
          detail: "Execution artifacts that become future measured evidence.",
        },
      ]}
    />
  );
}

export function RoleModelRoutingDiagram() {
  return (
    <VerticalStepsDiagram
      caption="role-model turns a role-and-task request into a ranked decision across concrete endpoints that serve models."
      steps={[
        {
          title: "Role / task request",
          detail: "What kind of work is needed and what constraints apply.",
        },
        {
          title: "Model lineage inside endpoint identity",
          detail:
            "Each endpoint carries the model family it serves through model_id, package_id, and variant_id.",
        },
        {
          title: "Eligible model-serving endpoints",
          detail: "The router narrows to concrete endpoints that can satisfy the request.",
        },
        {
          title: "Observed performance + policy",
          detail: "Measured behavior and policy decide which eligible endpoint should win.",
        },
        {
          title: "Explainable RouterDecision",
          detail: "The chosen endpoint, fallbacks, and reasons are emitted as protocol artifacts.",
        },
      ]}
    />
  );
}

export function ProtocolLifecycleDiagram() {
  return (
    <VerticalStepsDiagram
      caption="A protocol lifecycle starts with endpoint publication and ends with new evidence influencing later decisions."
      steps={[
        {
          title: "1. Publish endpoint identity",
          detail: "Define the concrete routable endpoint.",
        },
        {
          title: "2. Publish declared profile",
          detail: "Record capabilities, modalities, context, and tool support.",
        },
        {
          title: "3. Accumulate observed samples",
          detail: "Collect benchmark and live-request evidence.",
        },
        {
          title: "4. Assemble role, task, and policy",
          detail: "Describe the work and the routing constraints.",
        },
        {
          title: "5. Emit RouterDecision",
          detail: "Evaluate eligibility, score candidates, and choose a winner.",
        },
        {
          title: "6. Emit traces and usage",
          detail: "Record execution timing, outcome, and accounting.",
        },
        {
          title: "7. Update observed performance",
          detail: "Aggregate new evidence for future routing.",
        },
      ]}
    />
  );
}

export function ProtocolObjectModelDiagram() {
  return (
    <DiagramFrame caption="Endpoint evidence and execution intent stay separate until policy and routing combine them into one decision.">
      <div className="space-y-4">
        <DiagramLabel>Endpoint evidence</DiagramLabel>
        <div className="grid gap-3 md:grid-cols-3">
          <DiagramCard detail="Concrete endpoint identity." title="EndpointIdentity" />
          <DiagramCard
            detail="Declared compatibility and constraints."
            title="DeclaredCapabilityProfile"
          />
          <DiagramCard detail="Measured behavior over time." title="ObservedPerformanceProfile" />
        </div>

        <DownArrow />
        <DiagramCard
          detail="The routable candidate assembled from identity plus profiles."
          title="Candidate endpoint"
        />

        <DownArrow />
        <DiagramLabel>Execution intent</DiagramLabel>
        <div className="grid gap-3 md:grid-cols-4">
          <DiagramCard detail="Execution persona and policy contract." title="RoleDefinition" />
          <DiagramCard detail="Unit of work being requested." title="TaskDefinition" />
          <DiagramCard detail="Endpoint-specific role activation." title="RoleBinding" />
          <DiagramCard detail="Role-task execution patch." title="TaskExecutionProfile" />
        </div>

        <DownArrow />
        <DiagramCard
          detail="The combined role, task, and binding context that routing must satisfy."
          title="Execution intent"
        />

        <DownArrow />
        <div className="grid gap-3 md:grid-cols-3">
          <DiagramCard detail="Who can be chosen." title="Candidate endpoint" />
          <DiagramCard detail="What constraints and preferences apply." title="RoutingPolicy" />
          <DiagramCard detail="What work must be satisfied." title="Execution intent" />
        </div>

        <DownArrow />
        <DiagramCard
          detail="Policy snapshot, eligibility, scores, winner, fallbacks, and reasons."
          title="RouterDecision"
        />

        <DownArrow />
        <div className="grid gap-3 md:grid-cols-2">
          <DiagramCard detail="TraceSpan, TraceEvent, and UsageEvent." title="Observability" />
          <DiagramCard
            detail="New measurement that feeds later routing."
            title="ObservedPerformanceProfile updates"
          />
        </div>
      </div>
    </DiagramFrame>
  );
}

export function RoutingFlowDiagram() {
  return (
    <DiagramFrame caption="The reference router turns a request plus protocol context into an explainable decision and ordered fallbacks.">
      <div className="space-y-3">
        <DiagramCard
          detail="Request plus candidates, role definitions, task definitions, and role bindings."
          title="Routing input"
        />
        <DownArrow />
        <DiagramCard
          detail="Normalize strategy, locality, and effective capability requirements."
          title="Build policy snapshot"
        />
        <DownArrow />
        <DiagramCard
          detail="Apply hard checks for status, policy, role/task compatibility, capabilities, modalities, tools, context, and budget."
          title="Evaluate eligibility"
        />
        <DownArrow />
        <DiagramCard
          detail="Score eligible candidates across quality, latency, throughput, cost, reliability, and preference."
          title="Compare and score"
        />
        <DownArrow />
        <DiagramCard
          detail="Resolve close scores with quality, latency, reliability, then stable endpoint ID."
          title="Apply tie-breaks"
        />
        <DownArrow />
        <DiagramCard
          detail="Emit policy snapshot, eligibility, scored candidates, chosen endpoint, fallbacks, and reason codes."
          title="RouterDecision"
        />
        <DownArrow />
        <div className="grid gap-3 md:grid-cols-3">
          <DiagramCard
            detail="Remaining eligible candidates in ranked order."
            title="Fallback ordering"
          />
          <DiagramCard
            detail="Trace and usage artifacts for execution."
            title="Observability outputs"
          />
          <DiagramCard
            detail="New measurements that inform later routing."
            title="Future profile updates"
          />
        </div>
      </div>
    </DiagramFrame>
  );
}

export function RoutingObservabilityDiagram() {
  return (
    <DiagramFrame caption="Routing stays inspectable because the decision, trace, usage, and profile-update layers remain linked by shared IDs.">
      <div className="space-y-3">
        <DiagramCard
          detail="Summary of the policy, eligibility, ranking, winner, fallbacks, and reasons."
          title="RouterDecision"
        />
        <DownArrow />
        <div className="grid gap-3 md:grid-cols-3">
          <DiagramCard
            detail="Timing and phase-level execution detail."
            title="TraceSpan / TraceEvent"
          />
          <DiagramCard detail="Outcome and accounting for the request." title="UsageEvent" />
          <DiagramCard detail="Recorded benchmark or live-request sample." title="Profile sample" />
        </div>
        <DownArrow />
        <DiagramCard
          detail="Aggregated freshness-weighted, confidence-scored evidence for later routing."
          title="ObservedPerformanceProfile"
        />
      </div>
    </DiagramFrame>
  );
}
