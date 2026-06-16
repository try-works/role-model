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

export function FirstRunSetupDiagram() {
  return (
    <VerticalStepsDiagram
      caption="The first-time setup path should establish the real candidate set first, then benchmark it, then choose strategy from evidence."
      steps={[
        {
          title: "Install and launch the runtime",
          detail: "Start the packaged router and open the operator UI on the local machine.",
        },
        {
          title: "Connect providers and local backends",
          detail: "Wire in the exact local and remote execution paths you plan to route across.",
        },
        {
          title: "Activate models and assign roles",
          detail:
            "Publish the real endpoint inventory and bind each model only to the roles it should serve.",
        },
        {
          title: "Run the full benchmark",
          detail:
            "Grade the configured candidate set and write measured quality into observed profiles.",
        },
        {
          title: "Choose and save routing strategy",
          detail: "Set balanced, quality, latency, or cost after the benchmark evidence exists.",
        },
        {
          title: "Validate a real routed request",
          detail:
            "Inspect Router and Observe to confirm the winner, fallbacks, and reasons match the evidence.",
        },
      ]}
    />
  );
}

export function DocumentationArchitectureDiagram() {
  return (
    <VerticalStepsDiagram
      caption="The docs now move from first-time setup into runtime operation, then into router behavior and deeper protocol reference instead of splitting routing into two top-level sections."
      steps={[
        {
          title: "Get Started",
          detail:
            "Install, connect endpoints, benchmark the real set, choose strategy, and validate the first decision.",
        },
        {
          title: "Runtime",
          detail:
            "Use the actual runtime UI for model activation, benchmarking, strategy control, and live decision review.",
        },
        {
          title: "Router",
          detail:
            "Explain candidate selection, scoring, tie-breaks, exclusions, and decision behavior.",
        },
        {
          title: "Concepts",
          detail: "Build the mental model for roles, tasks, endpoints, policy, and observability.",
        },
        {
          title: "Reference",
          detail:
            "Provide the schema-level vocabulary and canonical artifact semantics when exact contracts matter.",
        },
      ]}
    />
  );
}

export function OperatorShellDiagram() {
  return (
    <DiagramFrame caption="The operator shell separates first-time setup from ongoing decision review so operators can move left-to-right through the lifecycle.">
      <div className="space-y-4">
        <DiagramLabel>Setup surfaces</DiagramLabel>
        <div className="grid gap-3 md:grid-cols-4">
          <DiagramCard
            detail="Onboarding entry point that links operators into the local and remote setup paths."
            title="Connect"
          />
          <DiagramCard
            detail="Local runtimes, local models, and local endpoint readiness."
            title="Local"
          />
          <DiagramCard detail="Provider accounts and remote execution posture." title="Remote" />
          <DiagramCard
            detail="Model inventory, role activation, and benchmark operations."
            title="Models"
          />
        </div>
        <DownArrow />
        <DiagramLabel>Decision review surfaces</DiagramLabel>
        <div className="grid gap-3 md:grid-cols-2">
          <DiagramCard
            detail="Candidate sets, strategy posture, scored decisions, and fallbacks."
            title="Router"
          />
          <DiagramCard
            detail="Request history, telemetry, usage, logs, and endpoint evidence."
            title="Observe"
          />
        </div>
        <DownArrow />
        <DiagramCard
          detail="Readiness, runtime health, and diagnostics that explain whether the shell itself is healthy."
          title="System"
        />
      </div>
    </DiagramFrame>
  );
}

export function BenchmarkStrategyLoopDiagram() {
  return (
    <VerticalStepsDiagram
      caption="Benchmarking is the evidence loop that turns a configured inventory into an informed routing strategy and a checkable live decision."
      steps={[
        {
          title: "Configured endpoint set",
          detail: "The active local and remote endpoints that actually compete for the work.",
        },
        {
          title: "Run the full benchmark",
          detail: "Exercise the candidate set and grade outcomes through the benchmark judge path.",
        },
        {
          title: "Observed profiles update",
          detail: "Benchmark-derived quality and health signals become routable evidence.",
        },
        {
          title: "Choose routing strategy",
          detail:
            "Pick balanced, quality, latency, or cost from the benchmark story instead of prior assumptions.",
        },
        {
          title: "Validate live routed requests",
          detail: "Confirm Router and Observe tell the same story once traffic starts flowing.",
        },
        {
          title: "Re-benchmark after inventory changes",
          detail:
            "Any material provider, model, or role change should refresh the evidence before further tuning.",
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
