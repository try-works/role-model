export type LintDiagnostic = Readonly<{
  ruleId: string
  message: string
  line: number
  column: number
  endLine: number
  endColumn: number
}>

export type LintCliRun = Readonly<{
  command: string
  exitCode: number
  lines: ReadonlyArray<string>
}>
