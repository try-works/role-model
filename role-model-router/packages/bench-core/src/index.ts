export interface BenchmarkCase {
  case_id: string;
  prompt_ref: string;
  capability: string;
}

export function createBenchmarkSuite(taskType: string, cases: BenchmarkCase[]) {
  return {
    suite_id: `${taskType}-baseline`,
    task_type: taskType,
    capability_targets: [...new Set(cases.map((item) => item.capability))],
    cases,
  };
}
