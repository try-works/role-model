/**
 * Reference page stories captured from the shipped 0.0.20 build on :3456 (story-dump at 1806x963).
 * For every route: the page title, its ordered section headings (h2/h3/h4 + chart-card titles),
 * the table column sets it renders, and the named filter controls. The S565 scene test asserts
 * the Foldkit page against this capture; the UI build-out follows it.
 */
export interface StoryTable { readonly headers: ReadonlyArray<string>; readonly rows: number; }
export interface PageStory {
  readonly title: string;
  readonly headings: ReadonlyArray<{ readonly level: number; readonly text: string }>;
  readonly tables: ReadonlyArray<StoryTable>;
  readonly combos: ReadonlyArray<string>;
  readonly inputs: ReadonlyArray<string>;
  readonly textLen: number;
}

export const PAGE_STORIES = {
  Benchmark: {"title":"Capability benchmark","headings":[{"level":2,"text":"Run capability benchmark"},{"level":2,"text":"Benchmark scores"},{"level":2,"text":"Taxonomy dimensions"},{"level":2,"text":"Run history"}],"tables":[{"headers":["Model","Path","Scope","Status"],"rows":5}],"combos":["Quick (12 hard cases)","Deepseek Flash (High) (remote)"],"inputs":[],"textLen":2193},
  ControlController: {"title":"Routing controller","headings":[{"level":2,"text":"Controller assignment"}],"tables":[],"combos":[],"inputs":[],"textLen":2376},
  Endpoints: {"title":"Available models & endpoints","headings":[{"level":2,"text":"Runtime connections"}],"tables":[{"headers":["Provider","Connection","Model","Endpoint","Effort","Source","Health","Readiness"],"rows":5}],"combos":[],"inputs":[],"textLen":1695},
  Index: {"title":"Runtime overview","headings":[{"level":2,"text":"Model pool"},{"level":2,"text":"Token usage over time"},{"level":2,"text":"Cache efficiency trend"},{"level":2,"text":"Effective cost over time"},{"level":2,"text":"Cost avoided over time"},{"level":2,"text":"Latency trend"},{"level":2,"text":"Success vs failure volume"}],"tables":[],"combos":["By endpoint variant","All sources","All statuses","All buckets"],"inputs":[],"textLen":3141},
  Learning: {"title":"Learning overview","headings":[{"level":2,"text":"Learning overview"},{"level":2,"text":"Live replay & evaluation"},{"level":2,"text":"Recent decisions"}],"tables":[],"combos":[],"inputs":["Not needed on this machine — only for other clients"],"textLen":1179},
  LearningConfiguration: {"title":"Learning configuration","headings":[{"level":2,"text":"Learning configuration"}],"tables":[],"combos":[],"inputs":["Not needed on this machine — only for other clients"],"textLen":1184},
  LearningDecisions: {"title":"Decision receipts","headings":[{"level":2,"text":"Decision receipts"}],"tables":[],"combos":["all roles","all tasks","all outcomes"],"inputs":["Not needed on this machine — only for other clients"],"textLen":1235},
  LearningEvidence: {"title":"Cohort evidence","headings":[{"level":2,"text":"Evidence"},{"level":2,"text":"Evidence loss by reason"}],"tables":[{"headers":["Guardrail","Bound","Observed","Verdict"],"rows":4}],"combos":[],"inputs":["Not needed on this machine — only for other clients"],"textLen":1940},
  LearningHistory: {"title":"Learning history","headings":[{"level":2,"text":"Learning history"}],"tables":[],"combos":[],"inputs":["Not needed on this machine — only for other clients"],"textLen":1113},
  LearningPacks: {"title":"Learned packs","headings":[{"level":2,"text":"Learned packs"}],"tables":[],"combos":[],"inputs":["Not needed on this machine — only for other clients"],"textLen":1486},
  LocalChoose: {"title":"Choose local backend","headings":[{"level":2,"text":"Peer-backed models"},{"level":2,"text":"Llama-swap models"}],"tables":[],"combos":[],"inputs":[],"textLen":1205},
  LocalLlamaSwapModels: {"title":"Llama-swap models","headings":[{"level":2,"text":"Load model"},{"level":2,"text":"Loaded models"}],"tables":[],"combos":[],"inputs":["lfm2.5-8b-a1b"],"textLen":1512},
  LocalLogs: {"title":"Llama-swap logs","headings":[{"level":2,"text":"Structured local log history"},{"level":2,"text":"Raw log streams"}],"tables":[{"headers":["Time","Source","Level","Message","Request"],"rows":200}],"combos":[],"inputs":[],"textLen":78385},
  LocalPeerModels: {"title":"Peer models","headings":[{"level":2,"text":"Register model"},{"level":2,"text":"Registered models"}],"tables":[],"combos":[],"inputs":["openai/gpt-4.1"],"textLen":1414},
  LocalPeers: {"title":"Local endpoints","headings":[{"level":2,"text":"Endpoint inventory"},{"level":2,"text":"Add peer endpoint"}],"tables":[],"combos":[],"inputs":["http://127.0.0.1:1234","Bearer token (optional)"],"textLen":1036},
  LocalPolicy: {"title":"Llama-swap host policy","headings":[{"level":2,"text":"Policy configuration"},{"level":2,"text":"Raw policy"}],"tables":[],"combos":[],"inputs":[],"textLen":1295},
  LocalSwap: {"title":"Llama-swap swap history","headings":[{"level":2,"text":"Event ledger"},{"level":2,"text":"Ledger semantics"}],"tables":[],"combos":[],"inputs":[],"textLen":1414},
  Models: {"title":"Configured models","headings":[{"level":2,"text":"Model inventory"}],"tables":[],"combos":[],"inputs":[],"textLen":2176},
  ModelsRoles: {"title":"Runtime roles","headings":[{"level":2,"text":"Create role"},{"level":2,"text":"Role catalog"},{"level":2,"text":"Role task allowlists"},{"level":2,"text":"Edit selected role"}],"tables":[],"combos":["assistant","allowed"],"inputs":[],"textLen":5414},
  Observability: {"title":"Observability snapshot","headings":[{"level":2,"text":"Observability snapshot"}],"tables":[],"combos":[],"inputs":[],"textLen":3724},
  ObserveActivity: {"title":"Host activity and metrics","headings":[{"level":2,"text":"Recent host activity"},{"level":2,"text":"Capture inspector"}],"tables":[],"combos":[],"inputs":[],"textLen":1999},
  ObserveLogs: {"title":"Host logs","headings":[{"level":2,"text":"Structured log rows"},{"level":2,"text":"Raw lines"}],"tables":[{"headers":["Time","Source","Level","Message","Request"],"rows":200}],"combos":[],"inputs":[],"textLen":78780},
  ObserveRouting: {"title":"Routing analytics","headings":[],"tables":[],"combos":["By endpoint variant","All sources","All buckets"],"inputs":["Filter a specific requested role id","Filter a specific selected strategy","e.g. engineering","e.g. coder","Comma-separated values, e.g. high,max","Comma-separated values, e.g. variant,client","e.g. coder.review","e.g. deep-audit"],"textLen":795},
  Providers: {"title":"Remote providers","headings":[{"level":2,"text":"Choose provider and models"},{"level":2,"text":"Configured provider connections"}],"tables":[],"combos":["302.AI","302.AI API Key","Select a model…"],"inputs":[],"textLen":1344},
  Queues: {"title":"Queue state","headings":[{"level":1,"text":"Queues"}],"tables":[{"headers":["Queue","Mode","Waiting","Active","Delayed","Failed","Stalled","Oldest waiting","p50","p95","Last error","Drain"],"rows":0}],"combos":[],"inputs":[],"textLen":864},
  Requests: {"title":"Telemetry request ledger","headings":[{"level":2,"text":"Recent telemetry requests"}],"tables":[],"combos":["Total","All sources","Average latency","Endpoint variants","All statuses"],"inputs":["Filter a specific endpoint id","Filter a specific model id","Filter a specific provider id","Comma-separated values, e.g. high,max","Comma-separated values, e.g. variant,client","e.g. engineering","e.g. coder","e.g. coder.review"],"textLen":1004},
  Router: {"title":"Routing overview","headings":[{"level":2,"text":"Alias inventory"},{"level":2,"text":"Routing candidates"}],"tables":[{"headers":["Alias","Mode","Effective models","Candidate expansion","Readiness"],"rows":18},{"headers":["Model","Endpoint","Source","Health","Routing"],"rows":5}],"combos":[],"inputs":[],"textLen":4010},
  RouterAgentStrategy: {"title":"Agent strategy","headings":[{"level":2,"text":"Agent strategy"},{"level":2,"text":"Posture diagnostics"},{"level":2,"text":"Entries"}],"tables":[],"combos":["Quality","Baseline","remote"],"inputs":["coder","qwen3-coder"],"textLen":2901},
  RouterCandidates: {"title":"Candidate inventory","headings":[{"level":2,"text":"Candidate inventory"}],"tables":[],"combos":[],"inputs":[],"textLen":2329},
  RouterConfig: {"title":"Routing strategy","headings":[],"tables":[],"combos":[],"inputs":[],"textLen":729},
  RouterDecisions: {"title":"Routing decisions","headings":[{"level":2,"text":"Decision ledger"}],"tables":[],"combos":[],"inputs":[],"textLen":4324},
  RouterStrategy: {"title":"Routing strategy","headings":[],"tables":[],"combos":[],"inputs":[],"textLen":729},
  RouterWorkloads: {"title":"Workloads","headings":[{"level":2,"text":"Workloads"},{"level":2,"text":"Posture diagnostics"},{"level":2,"text":"Workload templates"},{"level":2,"text":"Entries"}],"tables":[],"combos":[],"inputs":[],"textLen":1603},
  Runtime: {"title":"Runtime config","headings":[{"level":2,"text":"Config editor"},{"level":2,"text":"Applied snapshot"},{"level":2,"text":"Page actions"}],"tables":[],"combos":[],"inputs":[],"textLen":4946},
  SessionReadiness: {"title":"Session readiness","headings":[{"level":2,"text":"Session bootstrap"},{"level":2,"text":"Canonical lifecycle"},{"level":2,"text":"Operator intent manifest"},{"level":2,"text":"Credential readiness"},{"level":2,"text":"Routable inventory"},{"level":2,"text":"Alias drift warnings"}],"tables":[],"combos":[],"inputs":[],"textLen":1651},
  StorageRetention: {"title":"Storage & retention","headings":[{"level":2,"text":"Logical classes"},{"level":2,"text":"Retention policy"},{"level":2,"text":"Manual pruning"}],"tables":[],"combos":[],"inputs":[],"textLen":1590},
  StoreReceipts: {"title":"Store degradation receipts","headings":[{"level":2,"text":"Store degradation receipts"}],"tables":[],"combos":[],"inputs":[],"textLen":5417},
  SystemExtensions: {"title":"Extension boundary","headings":[{"level":2,"text":"Replay automation"},{"level":2,"text":"Contribution posture"},{"level":2,"text":"Recommendation ledger"},{"level":2,"text":"Extension inventory"}],"tables":[],"combos":[],"inputs":[],"textLen":1431},
  SystemOperator: {"title":"Operator controls","headings":[{"level":2,"text":"Operator Controls"},{"level":2,"text":"Trace lineage"},{"level":2,"text":"Replay Jobs"},{"level":2,"text":"Evaluation Jobs"},{"level":2,"text":"Shadow Learning"}],"tables":[],"combos":[],"inputs":["Paste a local operator token…","trace-root…"],"textLen":2047},
  SystemPeers: {"title":"Peer topology","headings":[{"level":2,"text":"Peer inventory"},{"level":2,"text":"Peer config"},{"level":2,"text":"Contract fields"}],"tables":[],"combos":[],"inputs":[],"textLen":1272},
} as const satisfies Record<string, PageStory>;

export const STUDIO_TAB_STORIES = {
  advanced: {"title":"Advanced workspace","headings":[{"level":2,"text":"Endpoint family"},{"level":2,"text":"Response workspace"}],"tables":[],"combos":["Responses","DeepSeek V4.1 Flash (High)"],"inputs":[],"textLen":1075},
  audio: {"title":"Audio workspace","headings":[{"level":2,"text":"Audio mode and request"},{"level":2,"text":"Audio result stage"}],"tables":[],"combos":["Speech synthesis","DeepSeek V4.1 Flash (High)","Select…"],"inputs":[],"textLen":969},
  chat: {"title":"Chat workspace","headings":[{"level":2,"text":"Request"},{"level":2,"text":"Result workspace"}],"tables":[],"combos":["DeepSeek V4.1 Flash (High)"],"inputs":[],"textLen":767},
  images: {"title":"Images workspace","headings":[{"level":2,"text":"Image request modes"},{"level":2,"text":"Image result stage"}],"tables":[],"combos":["OpenAI-style generation","DeepSeek V4.1 Flash (High)","1024x1024"],"inputs":[],"textLen":930},
  rerank: {"title":"Rerank workspace","headings":[{"level":2,"text":"Rerank request"},{"level":2,"text":"Ranked results"}],"tables":[],"combos":["/v1/rerank","DeepSeek V4.1 Flash (High)"],"inputs":[],"textLen":1051},
} as const satisfies Record<string, PageStory>;

