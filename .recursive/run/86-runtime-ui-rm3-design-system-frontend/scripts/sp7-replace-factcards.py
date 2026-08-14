"""Replace FactCard grids with MetricStrip panel across remaining SP7 routes."""
from pathlib import Path
import re

ROOT = Path(r"D:\DEV\role-model\.worktrees\86-runtime-ui-rm3-design-system-frontend\role-model-router\apps\runtime-ui\app\routes")

# Each entry: filename, exact old block, new block, and whether to add MetricStrip import
REPLACEMENTS = [
    (
        "session-readiness.tsx",
        '''      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <FactCard
          label="Bootstrap status"
          value={bootstrapStatus?.label ?? "Unavailable"}
          valueClassName={bodyStrongTextClassName}
          emphasis
        />
        <FactCard
          label="Host health"
          value={health.status}
          valueClassName={bodyStrongTextClassName}
        />
        <FactCard
          label="Lifecycle authority"
          value={lifecycleBanner?.authorityLabel ?? "Unavailable"}
          valueClassName={bodyStrongTextClassName}
        />
        <FactCard
          label="Execution mode"
          value={summary.executionMode ?? "unknown"}
          valueClassName={bodyStrongTextClassName}
        />
        <FactCard
          label="Routable endpoints"
          value={String(summary.inventorySummary?.endpointIdCount ?? summary.endpointCount)}
          valueClassName={bodyStrongTextClassName}
        />
      </div>''',
        '''      <MetricStrip
        aria-label="Session readiness summary"
        variant="panel"
        items={[
          {
            id: "bootstrap",
            label: "Bootstrap status",
            value: bootstrapStatus?.label ?? "Unavailable",
          },
          { id: "health", label: "Host health", value: health.status },
          {
            id: "lifecycle",
            label: "Lifecycle authority",
            value: lifecycleBanner?.authorityLabel ?? "Unavailable",
          },
          {
            id: "execution-mode",
            label: "Execution mode",
            value: summary.executionMode ?? "unknown",
          },
          {
            id: "endpoints",
            label: "Routable endpoints",
            value: String(summary.inventorySummary?.endpointIdCount ?? summary.endpointCount),
          },
        ]}
      />''',
    ),
    (
        "control-models.tsx",
        '''      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <FactCard
          label="Configured models"
          value={cards.length}
          detail="Every configured model appears once in the merged inventory."
          emphasis
        />
        <FactCard
          label="Healthy models"
          value={activeModelCount}
          detail="Endpoint summaries currently resolve to active."
        />
        <FactCard
          label="Tool-capable"
          value={toolCapableCount}
          detail="Models with at least one tool-capable endpoint."
        />
        <FactCard
          label="Observed requests"
          value={observedRequestsFact.value}
          detail={observedRequestsFact.detail}
        />
      </div>''',
        '''      <MetricStrip
        aria-label="Configured models summary"
        variant="panel"
        items={[
          { id: "configured", label: "Configured models", value: cards.length },
          { id: "healthy", label: "Healthy models", value: activeModelCount },
          { id: "tool-capable", label: "Tool-capable", value: toolCapableCount },
          {
            id: "observed",
            label: "Observed requests",
            value: observedRequestsFact.value,
          },
        ]}
      />''',
    ),
    (
        "control-roles.tsx",
        '''          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <FactCard
              label="Roles"
              value={policy.roleDefinitions.length}
              detail="Router-visible role definitions."
              emphasis
            />
            <FactCard
              label="Tasks"
              value={policy.taskDefinitions.length}
              detail="Task contracts in active allowlists."
            />
            <FactCard
              label="Restricted tool policy"
              value={limitedRoleCount}
              detail="Roles with limited or disabled tool access."
            />
            <FactCard
              label="Selected role"
              value={selectedRole?.role_id ?? "None"}
              detail="Currently loaded into the role editor."
            />
          </div>''',
        '''          <MetricStrip
            aria-label="Roles summary"
            variant="panel"
            items={[
              { id: "roles", label: "Roles", value: policy.roleDefinitions.length },
              { id: "tasks", label: "Tasks", value: policy.taskDefinitions.length },
              {
                id: "restricted",
                label: "Restricted tool policy",
                value: limitedRoleCount,
              },
              {
                id: "selected",
                label: "Selected role",
                value: selectedRole?.role_id ?? "None",
              },
            ]}
          />''',
    ),
    (
        "control-benchmark.tsx",
        '''      <div className="grid gap-4 xl:grid-cols-3">
        <FactCard
          label="Suite"
          value={suite.cases.filter((item) => item.benchmark_eligible).length}
          detail={`${suite.suite_id} v${suite.suite_version}`}
          emphasis
        />
        <FactCard
          label="Run size"
          value={eligibleCaseCount}
          detail={mode === "quick" ? "Quick mode hard subset." : "Full eligible benchmark set."}
          emphasis
        />
        <FactCard
          label="Judge"
          value={selectedJudgeModelLabel}
          detail={selectedJudgeCandidate ? "grading-only endpoint" : "judge not selected"}
          emphasis
          valueClassName={`${inlineTitleClassName} md:text-[20px] md:leading-[30px]`}
        />
      </div>''',
        '''      <MetricStrip
        aria-label="Benchmark run summary"
        variant="panel"
        items={[
          {
            id: "suite",
            label: "Suite",
            value: suite.cases.filter((item) => item.benchmark_eligible).length,
          },
          { id: "run-size", label: "Run size", value: eligibleCaseCount },
          { id: "judge", label: "Judge", value: selectedJudgeModelLabel },
        ]}
      />''',
    ),
    (
        "extensions.tsx",
        '''      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <FactCard
          label="Installed extensions"
          value={facts.installed}
          detail="Canonical packages present in this release pair."
          emphasis
        />
        <FactCard
          label="Ready workers"
          value={facts.ready}
          detail="Workers that passed lifecycle and health gates."
        />
        <FactCard
          label="Degraded"
          value={facts.degraded}
          detail="Bounded failures that do not interrupt routing."
        />
        <FactCard
          label="Active pack"
          value={activePack?.id ?? "None"}
          detail="Locally validated recommendation authority."
        />
      </div>''',
        '''      <MetricStrip
        aria-label="Extensions summary"
        variant="panel"
        items={[
          { id: "installed", label: "Installed extensions", value: facts.installed },
          { id: "ready", label: "Ready workers", value: facts.ready },
          { id: "degraded", label: "Degraded", value: facts.degraded },
          { id: "pack", label: "Active pack", value: activePack?.id ?? "None" },
        ]}
      />''',
    ),
    (
        "storage-retention.tsx",
        '''      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <FactCard
          label="Tracked usage"
          value={formatBytes(summary?.totalBytes ?? 0)}
          detail="Graph content, compact ledgers, derived views, and archives."
          emphasis
        />
        <FactCard
          label="Data classes"
          value={summary?.categories.length ?? 0}
          detail="Category, tier, and scope remain independently visible."
        />
        <FactCard
          label="Conflicts"
          value={conflictCount}
          detail="Legal holds, leases, and Managed policy blocks."
        />
        <FactCard
          label="Maintenance"
          value={summary?.activeJob?.status ?? "Idle"}
          detail="Background-only compaction; routing is never interrupted."
        />
      </div>''',
        '''      <MetricStrip
        aria-label="Storage retention summary"
        variant="panel"
        items={[
          {
            id: "usage",
            label: "Tracked usage",
            value: formatBytes(summary?.totalBytes ?? 0),
          },
          {
            id: "classes",
            label: "Data classes",
            value: summary?.categories.length ?? 0,
          },
          { id: "conflicts", label: "Conflicts", value: conflictCount },
          {
            id: "maintenance",
            label: "Maintenance",
            value: summary?.activeJob?.status ?? "Idle",
          },
        ]}
      />''',
    ),
    (
        "system-peers.tsx",
        '''      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <FactCard
          label="Configured peers"
          value={peerGroups.length}
          detail="Peer groups observed in the current runtime model list."
          emphasis
        />
        <FactCard
          label="Peer models"
          value={peerModelCount}
          detail="Models currently attributed to a peer source in the runtime listing."
        />
        <FactCard
          label="Runtime models"
          value={snapshot?.models.length ?? 0}
          detail="Total runtime-visible model count used as context for peer posture."
        />
      </div>''',
        '''      <MetricStrip
        aria-label="Peers summary"
        variant="panel"
        items={[
          { id: "peers", label: "Configured peers", value: peerGroups.length },
          { id: "peer-models", label: "Peer models", value: peerModelCount },
          {
            id: "runtime-models",
            label: "Runtime models",
            value: snapshot?.models.length ?? 0,
          },
        ]}
      />''',
    ),
    (
        "integrations-upstream.tsx",
        '''      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <FactCard
          label="Providers"
          value={providerCards.length}
          detail="Provider and account posture stays visible here without duplicating the editable Control pages."
          emphasis
        />
        <FactCard
          label="Accounts"
          value={snapshot?.accounts.length ?? 0}
          detail="Configured provider accounts that feed current upstream model access."
        />
        <FactCard
          label="Upstream targets"
          value={modelTargets.length}
          detail="Each target keeps a contextual `/upstream/<model>/` doorway instead of a global legacy-ui link."
        />
      </div>''',
        '''      <MetricStrip
        aria-label="Upstream summary"
        variant="panel"
        items={[
          { id: "providers", label: "Providers", value: providerCards.length },
          {
            id: "accounts",
            label: "Accounts",
            value: snapshot?.accounts.length ?? 0,
          },
          { id: "targets", label: "Upstream targets", value: modelTargets.length },
        ]}
      />''',
    ),
]


def ensure_metric_strip_import(text: str) -> str:
    if 'from "@role-model/ui"' in text and "MetricStrip" in text.split('from "@role-model/ui"')[0][-80:]:
        return text
    if 'MetricStrip' in text and 'from "@role-model/ui"' in text:
        # already imported somehow
        if re.search(r'import\s*\{[^}]*MetricStrip', text):
            return text
    # Add import at top after first import or at beginning
    if re.search(r'import\s*\{[^}]*MetricStrip[^}]*\}\s*from\s*"@role-model/ui"', text):
        return text
    # Insert new import as first line
    return 'import { MetricStrip } from "@role-model/ui";\n' + text


def drop_fact_card_import(text: str) -> str:
    text = re.sub(r',\s*FactCard\b', '', text)
    text = re.sub(r'\bFactCard,\s*', '', text)
    return text


def main() -> None:
    for filename, old, new in REPLACEMENTS:
        path = ROOT / filename
        text = path.read_text(encoding="utf-8")
        if old not in text:
            print(f"MISS block: {filename}")
            # try normalize CRLF
            old_crlf = old.replace("\n", "\r\n")
            if old_crlf in text:
                text = text.replace(old_crlf, new.replace("\n", "\r\n"))
                print(f"  used CRLF for {filename}")
            else:
                continue
        else:
            text = text.replace(old, new)
        text = ensure_metric_strip_import(text)
        text = drop_fact_card_import(text)
        path.write_text(text, encoding="utf-8", newline="\n")
        print(f"OK {filename} FactCard left={text.count('FactCard')}")


if __name__ == "__main__":
    main()
