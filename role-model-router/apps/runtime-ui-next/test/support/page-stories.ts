/**
 * Reference page stories captured from the shipped 0.0.20 build on :3456 (story-dump at 1806x963).
 * Per route: page title, ordered section headings (h2/h3/h4 + chart-card titles), the table
 * column sets it renders, and the named filter controls (field label + visible value). The S565
 * scene asserts the Foldkit page against this capture; the UI build-out follows it.
 */
export interface StoryTable {
  readonly headers: ReadonlyArray<string>;
  readonly rows: number;
}
export interface StoryControl {
  readonly label: string;
  readonly text: string;
}
export interface PageStory {
  readonly title: string;
  readonly headings: ReadonlyArray<{ readonly level: number; readonly text: string }>;
  readonly tables: ReadonlyArray<StoryTable>;
  readonly combos: ReadonlyArray<StoryControl>;
  readonly inputs: ReadonlyArray<string>;
  readonly textLen: number;
}

export const PAGE_STORIES = {
  Benchmark: {
    title: "Capability benchmark",
    headings: [
      { level: 2, text: "Run capability benchmark" },
      { level: 2, text: "Benchmark scores" },
      { level: 2, text: "Taxonomy dimensions" },
      { level: 2, text: "Run history" },
    ],
    tables: [{ headers: ["Model", "Path", "Scope", "Status"], rows: 5 }],
    combos: [
      { label: "Benchmark mode", text: "Quick (12 hard cases)" },
      { label: "Judge endpoint", text: "Deepseek Flash (High) (remote)" },
    ],
    inputs: [],
    textLen: 2193,
  },
  ControlController: {
    title: "Routing controller",
    headings: [{ level: 2, text: "Controller assignment" }],
    tables: [],
    combos: [],
    inputs: [],
    textLen: 2376,
  },
  Endpoints: {
    title: "Available models & endpoints",
    headings: [{ level: 2, text: "Runtime connections" }],
    tables: [
      {
        headers: [
          "Provider",
          "Connection",
          "Model",
          "Endpoint",
          "Effort",
          "Source",
          "Health",
          "Readiness",
        ],
        rows: 5,
      },
    ],
    combos: [],
    inputs: [],
    textLen: 1695,
  },
  Index: {
    title: "Runtime overview",
    headings: [
      { level: 2, text: "Model pool" },
      { level: 2, text: "Token usage over time" },
      { level: 2, text: "Cache efficiency trend" },
      { level: 2, text: "Effective cost over time" },
      { level: 2, text: "Cost avoided over time" },
      { level: 2, text: "Latency trend" },
      { level: 2, text: "Success vs failure volume" },
    ],
    tables: [],
    combos: [
      { label: "Breakdown", text: "By endpoint variant" },
      { label: "Source filter", text: "All sources" },
      { label: "Status", text: "All statuses" },
      { label: "Difficulty", text: "All buckets" },
    ],
    inputs: [],
    textLen: 3140,
  },
  Learning: {
    title: "Learning overview",
    headings: [
      { level: 2, text: "Learning overview" },
      { level: 2, text: "Live replay & evaluation" },
      { level: 2, text: "Recent decisions" },
    ],
    tables: [],
    combos: [],
    inputs: ["Not needed on this machine — only for other clients"],
    textLen: 1179,
  },
  LearningConfiguration: {
    title: "Learning configuration",
    headings: [{ level: 2, text: "Learning configuration" }],
    tables: [],
    combos: [],
    inputs: ["Not needed on this machine — only for other clients"],
    textLen: 1184,
  },
  LearningDecisions: {
    title: "Decision receipts",
    headings: [{ level: 2, text: "Decision receipts" }],
    tables: [],
    combos: [
      { label: "Role", text: "all roles" },
      { label: "Task", text: "all tasks" },
      { label: "Outcome", text: "all outcomes" },
    ],
    inputs: ["Not needed on this machine — only for other clients"],
    textLen: 1235,
  },
  LearningEvidence: {
    title: "Cohort evidence",
    headings: [
      { level: 2, text: "Evidence" },
      { level: 2, text: "Evidence loss by reason" },
    ],
    tables: [{ headers: ["Guardrail", "Bound", "Observed", "Verdict"], rows: 4 }],
    combos: [],
    inputs: ["Not needed on this machine — only for other clients"],
    textLen: 1940,
  },
  LearningHistory: {
    title: "Learning history",
    headings: [{ level: 2, text: "Learning history" }],
    tables: [],
    combos: [],
    inputs: ["Not needed on this machine — only for other clients"],
    textLen: 1113,
  },
  LearningPacks: {
    title: "Learned packs",
    headings: [{ level: 2, text: "Learned packs" }],
    tables: [],
    combos: [],
    inputs: ["Not needed on this machine — only for other clients"],
    textLen: 1486,
  },
  LocalChoose: {
    title: "Choose local backend",
    headings: [
      { level: 2, text: "Peer-backed models" },
      { level: 2, text: "Llama-swap models" },
    ],
    tables: [],
    combos: [],
    inputs: [],
    textLen: 1205,
  },
  LocalLlamaSwapModels: {
    title: "Llama-swap models",
    headings: [
      { level: 2, text: "Load model" },
      { level: 2, text: "Role summary" },
      { level: 2, text: "Loaded models" },
    ],
    tables: [],
    combos: [],
    inputs: ["lfm2.5-8b-a1b"],
    textLen: 1512,
  },
  LocalLogs: {
    title: "Llama-swap logs",
    headings: [
      { level: 2, text: "Structured local log history" },
      { level: 2, text: "Raw log streams" },
    ],
    tables: [{ headers: ["Time", "Source", "Level", "Message", "Request"], rows: 200 }],
    combos: [],
    inputs: [],
    textLen: 78385,
  },
  LocalPeerModels: {
    title: "Peer models",
    headings: [
      { level: 2, text: "Register model" },
      { level: 2, text: "Registered models" },
    ],
    tables: [],
    combos: [],
    inputs: ["openai/gpt-4.1"],
    textLen: 1414,
  },
  LocalPeers: {
    title: "Local endpoints",
    headings: [
      { level: 2, text: "Endpoint inventory" },
      { level: 2, text: "Add peer endpoint" },
    ],
    tables: [],
    combos: [],
    inputs: ["http://127.0.0.1:1234", "Bearer token (optional)"],
    textLen: 1036,
  },
  LocalPolicy: {
    title: "Llama-swap host policy",
    headings: [
      { level: 2, text: "Policy configuration" },
      { level: 2, text: "Raw policy" },
    ],
    tables: [],
    combos: [],
    inputs: [],
    textLen: 1295,
  },
  LocalSwap: {
    title: "Llama-swap swap history",
    headings: [
      { level: 2, text: "Event ledger" },
      { level: 2, text: "Ledger semantics" },
    ],
    tables: [],
    combos: [],
    inputs: [],
    textLen: 1414,
  },
  Models: {
    title: "Configured models",
    headings: [{ level: 2, text: "Model inventory" }],
    tables: [],
    combos: [],
    inputs: [],
    textLen: 2176,
  },
  ModelsRoles: {
    title: "Runtime roles",
    headings: [
      { level: 2, text: "Create role" },
      { level: 2, text: "Role catalog" },
      { level: 2, text: "Role task allowlists" },
      { level: 2, text: "Edit selected role" },
    ],
    tables: [],
    combos: [
      { label: "Kind", text: "assistant" },
      { label: "Tool policy mode", text: "allowed" },
    ],
    inputs: [],
    textLen: 5414,
  },
  Observability: {
    title: "Observability snapshot",
    headings: [{ level: 2, text: "Observability snapshot" }],
    tables: [],
    combos: [],
    inputs: [],
    textLen: 3724,
  },
  ObserveActivity: {
    title: "Host activity and metrics",
    headings: [
      { level: 2, text: "Recent host activity" },
      { level: 2, text: "Capture inspector" },
    ],
    tables: [],
    combos: [],
    inputs: [],
    textLen: 1926,
  },
  ObserveLogs: {
    title: "Host logs",
    headings: [
      { level: 2, text: "Structured log rows" },
      { level: 2, text: "Raw lines" },
    ],
    tables: [{ headers: ["Time", "Source", "Level", "Message", "Request"], rows: 200 }],
    combos: [],
    inputs: [],
    textLen: 78780,
  },
  ObserveRouting: {
    title: "Routing analytics",
    headings: [],
    tables: [],
    combos: [
      { label: "Breakdown", text: "By endpoint variant" },
      { label: "Source", text: "All sources" },
      { label: "Difficulty", text: "All buckets" },
    ],
    inputs: [
      "Filter a specific requested role id",
      "Filter a specific selected strategy",
      "e.g. engineering",
      "e.g. coder",
      "Comma-separated values, e.g. high,max",
      "Comma-separated values, e.g. variant,client",
      "e.g. coder.review",
      "e.g. deep-audit",
    ],
    textLen: 795,
  },
  Providers: {
    title: "Remote providers",
    headings: [
      { level: 2, text: "Choose provider and models" },
      { level: 2, text: "Configured provider connections" },
    ],
    tables: [],
    combos: [
      { label: "Provider", text: "302.AI" },
      { label: "Connection method", text: "302.AI API Key" },
      { label: "Model", text: "Select a model…" },
    ],
    inputs: [],
    textLen: 1344,
  },
  Queues: {
    title: "Queue state",
    headings: [{ level: 1, text: "Queues" }],
    tables: [
      {
        headers: [
          "Queue",
          "Mode",
          "Waiting",
          "Active",
          "Delayed",
          "Failed",
          "Stalled",
          "Oldest waiting",
          "p50",
          "p95",
          "Last error",
          "Drain",
        ],
        rows: 0,
      },
    ],
    combos: [],
    inputs: [],
    textLen: 864,
  },
  Requests: {
    title: "Telemetry request ledger",
    headings: [{ level: 2, text: "Recent telemetry requests" }],
    tables: [],
    combos: [
      { label: "Breakdown", text: "Total" },
      { label: "Source", text: "All sources" },
      { label: "Ranking metric", text: "Average latency" },
      { label: "Ranking target", text: "Endpoint variants" },
      { label: "Status family", text: "All statuses" },
    ],
    inputs: [
      "Filter a specific endpoint id",
      "Filter a specific model id",
      "Filter a specific provider id",
      "Comma-separated values, e.g. high,max",
      "Comma-separated values, e.g. variant,client",
      "e.g. engineering",
      "e.g. coder",
      "e.g. coder.review",
    ],
    textLen: 1004,
  },
  Router: {
    title: "Routing overview",
    headings: [
      { level: 2, text: "Alias inventory" },
      { level: 2, text: "Routing candidates" },
    ],
    tables: [
      {
        headers: ["Alias", "Mode", "Effective models", "Candidate expansion", "Readiness"],
        rows: 18,
      },
      { headers: ["Model", "Endpoint", "Source", "Health", "Routing"], rows: 5 },
    ],
    combos: [],
    inputs: [],
    textLen: 4010,
  },
  RouterAgentStrategy: {
    title: "Agent strategy",
    headings: [
      { level: 2, text: "Agent strategy" },
      { level: 2, text: "Posture diagnostics" },
    ],
    tables: [],
    combos: [],
    inputs: [],
    textLen: 900,
  },
  RouterCandidates: {
    title: "Candidate inventory",
    headings: [{ level: 2, text: "Candidate inventory" }],
    tables: [],
    combos: [],
    inputs: [],
    textLen: 2329,
  },
  RouterConfig: {
    title: "Routing strategy",
    headings: [],
    tables: [],
    combos: [],
    inputs: [],
    textLen: 729,
  },
  RouterDecisions: {
    title: "Routing decisions",
    headings: [{ level: 2, text: "Decision ledger" }],
    tables: [],
    combos: [],
    inputs: [],
    textLen: 4062,
  },
  RouterStrategy: {
    title: "Routing strategy",
    headings: [],
    tables: [],
    combos: [],
    inputs: [],
    textLen: 729,
  },
  RouterWorkloads: {
    title: "Workloads",
    headings: [
      { level: 2, text: "Workloads" },
      { level: 2, text: "Posture diagnostics" },
    ],
    tables: [],
    combos: [],
    inputs: [],
    textLen: 900,
  },
  Runtime: {
    title: "Runtime topology",
    headings: [
      { level: 2, text: "Applied runtime policy" },
      { level: 2, text: "Execution readiness" },
      { level: 2, text: "Controller posture" },
      { level: 2, text: "Version facts" },
    ],
    tables: [],
    combos: [],
    inputs: [],
    textLen: 1568,
  },
  SessionReadiness: {
    title: "Session readiness",
    headings: [
      { level: 2, text: "Session bootstrap" },
      { level: 2, text: "Canonical lifecycle" },
      { level: 2, text: "Operator intent manifest" },
      { level: 2, text: "Credential readiness" },
      { level: 2, text: "Routable inventory" },
      { level: 2, text: "Alias drift warnings" },
    ],
    tables: [],
    combos: [],
    inputs: [],
    textLen: 1651,
  },
  StorageRetention: {
    title: "Storage & retention",
    headings: [
      { level: 2, text: "Logical classes" },
      { level: 2, text: "Retention policy" },
      { level: 2, text: "Manual pruning" },
    ],
    tables: [],
    combos: [],
    inputs: [],
    textLen: 1590,
  },
  StoreReceipts: {
    title: "Store degradation receipts",
    headings: [{ level: 2, text: "Store degradation receipts" }],
    tables: [],
    combos: [],
    inputs: [],
    textLen: 5417,
  },
  SystemExtensions: {
    title: "Extension boundary",
    headings: [
      { level: 2, text: "Contribution posture" },
      { level: 2, text: "Recommendation ledger" },
      { level: 2, text: "Replay automation" },
      { level: 2, text: "Extension inventory" },
    ],
    tables: [],
    combos: [],
    inputs: [],
    textLen: 1431,
  },
  SystemOperator: {
    title: "Operator controls",
    headings: [
      { level: 2, text: "Operator Controls" },
      { level: 2, text: "Operator Capability Status" },
      { level: 2, text: "Trace lineage" },
      { level: 2, text: "Replay Jobs" },
      { level: 2, text: "Evaluation Jobs" },
      { level: 2, text: "Shadow Learning" },
    ],
    tables: [],
    combos: [],
    inputs: ["Paste a local operator token…", "trace-root…"],
    textLen: 2047,
  },
  SystemPeers: {
    title: "Peer topology",
    headings: [
      { level: 2, text: "Peer inventory" },
      { level: 2, text: "Peer config" },
      { level: 2, text: "Contract fields" },
    ],
    tables: [],
    combos: [],
    inputs: [],
    textLen: 1272,
  },
  // --- S592: port-captured stories (no :3456 capture exists for these routes) -------------------
  // Captured 2026-10-31 from the CURRENT Foldkit port render (renderToString with
  // test/support/runtime-shell.ts shellModel at the default route state), NOT from the :3456
  // reference build. They are regression snapshots: they pin today's port render so a change on
  // these pages is visible in review, but they cannot prove parity with :3456. Re-capture from
  // :3456 and flip the provenance comment when an owner capture exists.
  Dashboard: {
    title: "Dashboard",
    headings: [{ level: 2, text: "Dashboard" }],
    tables: [],
    combos: [],
    inputs: [],
    textLen: 376,
  },
  Diagnostics: {
    title: "Diagnostics",
    headings: [{ level: 2, text: "Diagnostics: 42" }],
    tables: [],
    combos: [],
    inputs: [],
    textLen: 284,
  },
  IntegrationsDownstream: {
    title: "Connect your application",
    headings: [
      { level: 2, text: "Connection contract" },
      { level: 2, text: "Consumer setup" },
    ],
    tables: [],
    combos: [],
    inputs: [],
    textLen: 1538,
  },
  IntegrationsUpstream: {
    title: "Upstream passthrough",
    headings: [
      { level: 2, text: "Provider accounts in scope" },
      { level: 2, text: "Boundary guidance" },
      { level: 2, text: "Upstream target inventory" },
    ],
    tables: [],
    combos: [],
    inputs: [],
    textLen: 1055,
  },
  NotFound: {
    title: "Not found: /missing",
    headings: [{ level: 2, text: "Not found: /missing" }],
    tables: [],
    combos: [],
    inputs: [],
    textLen: 361,
  },
  QueuesConfiguration: {
    title: "Queue configuration",
    headings: [{ level: 2, text: "Queue configuration" }],
    tables: [],
    combos: [],
    inputs: [],
    textLen: 406,
  },
  RequestDetail: {
    title: "Telemetry request detail",
    headings: [{ level: 2, text: "Request detail" }],
    tables: [],
    combos: [],
    inputs: [],
    textLen: 401,
  },
  RouterDecisionDetail: {
    title: "Routing decision detail",
    headings: [{ level: 2, text: "Router decision detail" }],
    tables: [],
    combos: [],
    inputs: [],
    textLen: 416,
  },
  RuntimeConfig: {
    title: "Runtime config",
    headings: [
      { level: 2, text: "Runtime" },
      { level: 2, text: "Runtime config" },
    ],
    tables: [],
    combos: [],
    inputs: [],
    textLen: 719,
  },
  // Studio renders one route with tabs; this is the default (chat) render. The five per-tab
  // captures remain in STUDIO_TAB_STORIES below.
  Studio: {
    title: "Chat workspace",
    headings: [
      { level: 2, text: "Request" },
      { level: 2, text: "Result workspace" },
    ],
    tables: [],
    combos: [],
    inputs: [],
    textLen: 352,
  },
} as const satisfies Record<string, PageStory>;

/**
 * S592: the route tags whose PAGE_STORIES entry was captured from the current port render rather
 * than from the shipped 0.0.20 build on :3456. Keep in sync with the block comment above; the
 * coverage test in s565 runs every route tag either way.
 */
export const PORT_CAPTURED_ROUTE_TAGS = [
  "Dashboard",
  "Diagnostics",
  "IntegrationsDownstream",
  "IntegrationsUpstream",
  "NotFound",
  "QueuesConfiguration",
  "RequestDetail",
  "RouterDecisionDetail",
  "RuntimeConfig",
  "Studio",
] as const;

export const STUDIO_TAB_STORIES = {
  advanced: {
    title: "Advanced workspace",
    headings: [
      { level: 2, text: "Endpoint family" },
      { level: 2, text: "Response workspace" },
    ],
    tables: [],
    combos: [
      { label: "Family", text: "Responses" },
      { label: "Model", text: "DeepSeek V4.1 Flash (High)" },
    ],
    inputs: [],
    textLen: 1075,
  },
  audio: {
    title: "Audio workspace",
    headings: [
      { level: 2, text: "Audio mode and request" },
      { level: 2, text: "Audio result stage" },
    ],
    tables: [],
    combos: [
      { label: "Mode", text: "Speech synthesis" },
      { label: "Model", text: "DeepSeek V4.1 Flash (High)" },
      { label: "Voice", text: "Select…" },
    ],
    inputs: [],
    textLen: 969,
  },
  chat: {
    title: "Chat workspace",
    headings: [
      { level: 2, text: "Request" },
      { level: 2, text: "Result workspace" },
    ],
    tables: [],
    combos: [{ label: "Model", text: "DeepSeek V4.1 Flash (High)" }],
    inputs: [],
    textLen: 767,
  },
  images: {
    title: "Images workspace",
    headings: [
      { level: 2, text: "Image request modes" },
      { level: 2, text: "Image result stage" },
    ],
    tables: [],
    combos: [
      { label: "Mode", text: "OpenAI-style generation" },
      { label: "Model", text: "DeepSeek V4.1 Flash (High)" },
      { label: "Size", text: "1024x1024" },
    ],
    inputs: [],
    textLen: 930,
  },
  rerank: {
    title: "Rerank workspace",
    headings: [
      { level: 2, text: "Rerank request" },
      { level: 2, text: "Ranked results" },
    ],
    tables: [],
    combos: [
      { label: "Contract", text: "/v1/rerank" },
      { label: "Model", text: "DeepSeek V4.1 Flash (High)" },
    ],
    inputs: [],
    textLen: 1051,
  },
} as const satisfies Record<string, PageStory>;
