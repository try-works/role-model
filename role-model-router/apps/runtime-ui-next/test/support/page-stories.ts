export interface PageStory {
  /** Ordered section/card headings the page displays, taken from the 0.0.20 build on :3456. */
  readonly headings: ReadonlyArray<string>;
  /** Reference table count and control volumes (0 when the page has none). */
  readonly tables: number;
  readonly buttons: number;
  readonly inputs: number;
  /** Reference body text length, used to catch invented or missing sections. */
  readonly textLen: number;
}

export const PAGE_STORIES = {
  Benchmark: { headings: ["Capability benchmark", "Run capability benchmark", "Benchmark scores", "Taxonomy dimensions", "Run history"], tables: 1, buttons: 31, inputs: 0, textLen: 1428 },
  ControlController: { headings: ["Routing controller", "Controller assignment"], tables: 0, buttons: 31, inputs: 0, textLen: 1193 },
  Endpoints: { headings: ["Available models & endpoints", "Runtime connections"], tables: 1, buttons: 24, inputs: 0, textLen: 741 },
  Index: { headings: ["Runtime overview"], tables: 0, buttons: 29, inputs: 0, textLen: 1745 },
  Learning: { headings: ["Learning overview", "Learning overview", "Live replay & evaluation", "Recent decisions"], tables: 0, buttons: 27, inputs: 1, textLen: 797 },
  LearningConfiguration: { headings: ["Learning configuration", "Learning configuration"], tables: 0, buttons: 27, inputs: 2, textLen: 569 },
  LearningDecisions: { headings: ["Decision receipts", "Decision receipts"], tables: 0, buttons: 30, inputs: 3, textLen: 639 },
  LearningEvidence: { headings: ["Cohort evidence", "Evidence", "Evidence loss by reason"], tables: 1, buttons: 27, inputs: 2, textLen: 1375 },
  LearningHistory: { headings: ["Learning history", "Learning history"], tables: 0, buttons: 27, inputs: 1, textLen: 503 },
  LearningPacks: { headings: ["Learned packs", "Learned packs"], tables: 0, buttons: 30, inputs: 1, textLen: 887 },
  LocalChoose: { headings: ["Choose local backend", "Peer-backed models", "Llama-swap models"], tables: 0, buttons: 21, inputs: 0, textLen: 590 },
  LocalLlamaSwapModels: { headings: ["Llama-swap models", "Load model", "Loaded models"], tables: 0, buttons: 30, inputs: 1, textLen: 911 },
  LocalLogs: { headings: ["Llama-swap logs", "Structured local log history", "Raw log streams"], tables: 1, buttons: 30, inputs: 0, textLen: 78784 },
  LocalPeerModels: { headings: ["Peer models", "Register model", "Registered models"], tables: 0, buttons: 58, inputs: 1, textLen: 596 },
  LocalPeers: { headings: ["Local endpoints", "Endpoint inventory", "Add peer endpoint"], tables: 0, buttons: 29, inputs: 2, textLen: 431 },
  LocalPolicy: { headings: ["Llama-swap host policy", "Policy configuration", "Raw policy"], tables: 0, buttons: 31, inputs: 2, textLen: 690 },
  LocalSwap: { headings: ["Llama-swap swap history", "Event ledger", "Ledger semantics"], tables: 0, buttons: 28, inputs: 0, textLen: 807 },
  Models: { headings: ["Configured models", "Model inventory"], tables: 0, buttons: 85, inputs: 0, textLen: 1570 },
  ModelsRoles: { headings: ["Runtime roles", "Create role", "Role catalog", "Role task allowlists", "Edit selected role"], tables: 0, buttons: 88, inputs: 17, textLen: 4689 },
  Observability: { headings: ["Observability snapshot", "Observability snapshot"], tables: 0, buttons: 29, inputs: 0, textLen: 3240 },
  ObserveActivity: { headings: ["Host activity and metrics", "Recent host activity", "Capture inspector"], tables: 0, buttons: 78, inputs: 0, textLen: 4269 },
  ObserveLogs: { headings: ["Host logs", "Structured log rows", "Raw lines"], tables: 1, buttons: 30, inputs: 0, textLen: 79187 },
  ObserveRouting: { headings: ["Routing analytics"], tables: 0, buttons: 35, inputs: 11, textLen: 203 },
  Providers: { headings: ["Remote providers", "Choose provider and models", "Configured provider connections"], tables: 0, buttons: 28, inputs: 2, textLen: 692 },
  Queues: { headings: ["Queue state", "Queues"], tables: 1, buttons: 28, inputs: 0, textLen: 269 },
  Requests: { headings: ["Telemetry request ledger", "Recent telemetry requests"], tables: 0, buttons: 37, inputs: 12, textLen: 389 },
  Router: { headings: ["Routing overview", "Alias inventory", "Routing candidates"], tables: 2, buttons: 28, inputs: 0, textLen: 1044 },
  RouterAgentStrategy: { headings: ["Agent strategy", "Agent strategy", "Posture diagnostics", "Entries"], tables: 0, buttons: 34, inputs: 3, textLen: 2360 },
  RouterCandidates: { headings: ["Candidate inventory", "Candidate inventory"], tables: 0, buttons: 28, inputs: 0, textLen: 1228 },
  RouterConfig: { headings: ["Routing strategy"], tables: 0, buttons: 28, inputs: 0, textLen: 116 },
  RouterDecisions: { headings: ["Routing decisions", "Decision ledger"], tables: 0, buttons: 28, inputs: 0, textLen: 13805 },
  RouterStrategy: { headings: ["Routing strategy"], tables: 0, buttons: 28, inputs: 0, textLen: 116 },
  RouterWorkloads: { headings: ["Workloads", "Workloads", "Posture diagnostics", "Workload templates", "Entries"], tables: 0, buttons: 32, inputs: 0, textLen: 1012 },
  Runtime: { headings: ["Runtime topology", "Applied runtime policy", "Execution readiness", "Controller posture", "Version facts"], tables: 0, buttons: 27, inputs: 0, textLen: 999 },
  SessionReadiness: { headings: ["Session readiness", "Session bootstrap", "Canonical lifecycle", "Operator intent manifest", "Credential readiness", "Routable inventory", "Alias drift warnings"], tables: 0, buttons: 27, inputs: 0, textLen: 1073 },
  StorageRetention: { headings: ["Storage & retention", "Logical classes", "Retention policy", "Manual pruning"], tables: 0, buttons: 30, inputs: 2, textLen: 1012 },
  StoreReceipts: { headings: ["Store degradation receipts", "Store degradation receipts"], tables: 0, buttons: 29, inputs: 0, textLen: 4869 },
  Studio: { headings: ["Chat workspace", "Request", "Result workspace"], tables: 0, buttons: 28, inputs: 1, textLen: 130 },
  SystemExtensions: { headings: ["Extension boundary", "Replay automation", "Contribution posture", "Recommendation ledger", "Extension inventory"], tables: 0, buttons: 29, inputs: 0, textLen: 838 },
  SystemOperator: { headings: ["Operator controls", "Operator Controls", "Trace lineage", "Replay Jobs", "Evaluation Jobs", "Shadow Learning"], tables: 0, buttons: 25, inputs: 4, textLen: 1456 },
  SystemPeers: { headings: ["Peer topology", "Peer inventory", "Peer config", "Contract fields"], tables: 0, buttons: 27, inputs: 0, textLen: 684 },
} as const satisfies Record<string, PageStory>;

export type PageStoryTag = keyof typeof PAGE_STORIES;

/** Studio stories per tab: the five captures are distinct pages under one route tag. */
export const STUDIO_TAB_STORIES = {
  chat: { headings: ["Chat workspace", "Request", "Result workspace"], tables: 0, buttons: 28, inputs: 1, textLen: 130 },
  images: { headings: ["Images workspace", "Image request modes", "Image result stage"], tables: 0, buttons: 30, inputs: 1, textLen: 297 },
  audio: { headings: ["Audio workspace", "Audio mode and request", "Audio result stage"], tables: 0, buttons: 30, inputs: 1, textLen: 309 },
  rerank: { headings: ["Rerank workspace", "Rerank request", "Ranked results"], tables: 0, buttons: 29, inputs: 2, textLen: 276 },
  advanced: { headings: ["Advanced workspace", "Endpoint family", "Response workspace"], tables: 0, buttons: 29, inputs: 1, textLen: 343 },
} as const satisfies Record<string, PageStory>;