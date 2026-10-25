// The StyleX build resolves this module to landing-tour-skin.stylex.ts.
export const tourSkin = {
  deprecatedInk: 'text-red-700 dark:text-red-400',
  section: 'mx-auto w-full max-w-[1200px] px-4 py-14 md:px-8 md:py-20',
  control:
    'h-10 rounded-full px-4 text-sm transition-[background-color,color,box-shadow,scale] duration-200 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  subtleLink:
    'inline-flex min-h-10 items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  icon: 'size-4',
  checkIcon: 'size-3.5',
  sectionHeader: 'mb-8 flex max-w-2xl flex-col gap-3 md:mb-10',
  sectionTitle:
    'text-3xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl',
  sectionCopy: 'max-w-xl leading-relaxed text-pretty text-muted-foreground',
  colorPicker: 'flex items-center gap-1',
  colorButton:
    'group flex size-10 shrink-0 items-center justify-center rounded-full outline-none transition-[box-shadow,scale] active:scale-[0.96] focus-visible:ring-2 focus-visible:ring-ring',
  colorSelected:
    'flex size-6 items-center justify-center rounded-full text-white ring-2 ring-foreground/20 ring-offset-2 ring-offset-background',
  colorIdle:
    'flex size-6 items-center justify-center rounded-full text-white transition-transform group-hover:scale-110',
  showcaseFrame:
    'overflow-hidden rounded-3xl bg-muted/50 p-2 shadow-[0_0_0_1px_var(--border),0_12px_40px_-24px_rgba(0,0,0,0.18)] sm:p-3',
  frameToolbar: 'flex h-10 items-center gap-3 px-2 pb-2 sm:px-3',
  frameDots: 'flex shrink-0 gap-1.5',
  frameDot: 'size-2.5 rounded-full bg-foreground/20',
  frameTitle: 'text-xs font-medium text-foreground/80',
  frameStatus:
    'ml-auto inline-flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground',
  statusDot: 'size-1.5 rounded-full bg-emerald-500',
  frameContent:
    'overflow-hidden rounded-xl bg-background shadow-[0_0_0_1px_var(--border)]',
  iframe: 'block h-[620px] w-full border-0 bg-background sm:h-[680px]',
  showcaseBody: 'relative flex min-w-0 flex-col gap-4',
  showcaseFooter: 'flex flex-wrap items-center justify-between gap-x-6 gap-y-2',
  mutedSmall: 'text-sm text-muted-foreground',
  showcaseLinks: 'flex items-center gap-5',
  choices: 'grid gap-3',
  label: 'text-sm font-medium',
  choiceRow: 'flex flex-wrap gap-2',
  choiceSelected:
    'h-10 rounded-full px-4 text-sm transition-[background-color,color,box-shadow,scale] duration-200 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-foreground text-background',
  choiceIdle:
    'h-10 rounded-full px-4 text-sm transition-[background-color,color,box-shadow,scale] duration-200 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-muted/70 text-foreground/75 hover:bg-muted hover:text-foreground',
  initials:
    'flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-foreground',
  studioLayout: 'grid gap-10 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-14',
  studioControls: 'flex flex-col gap-7',
  gridTight: 'grid gap-2',
  studioRoot: 'landing-studio min-w-0',
  studioPreview:
    'create-board-theme grid min-h-[420px] place-items-center rounded-2xl bg-muted/40 p-5 sm:p-10',
  studioCard:
    'w-full max-w-md overflow-hidden rounded-[calc(var(--radius)+8px)] bg-card text-card-foreground shadow-[0_0_0_1px_var(--border),0_16px_40px_-20px_rgba(0,0,0,0.15)]',
  studioHeader: 'flex items-center gap-3 border-b p-6',
  studioLogo:
    'flex size-10 items-center justify-center rounded-[var(--radius)] bg-primary text-primary-foreground',
  cardTitle: 'text-base font-semibold',
  caption: 'mt-1 text-xs text-muted-foreground',
  pushRight: 'ml-auto',
  studioBody: 'grid gap-5 p-6',
  row: 'flex items-center gap-3',
  mutedCaption: 'text-xs text-muted-foreground',
  memberRole: 'ml-auto text-xs text-muted-foreground',
  studioNotifications: 'border-t pt-5',
  studioPreset: 'mt-3 text-center font-mono text-[11px] text-muted-foreground',
  inspectorLine: 'flex min-w-0 gap-2',
  inspectorKey: 'shrink-0 text-zinc-400',
  inspectorString: 'break-all text-amber-200',
  inspectorValue: 'text-emerald-300',
  inspectorPunctuation: 'text-zinc-400',
  stateLayout:
    'grid overflow-hidden rounded-2xl bg-muted/30 shadow-[0_0_0_1px_var(--border)] md:grid-cols-2',
  stateControls: 'flex min-w-0 flex-col justify-center gap-6 p-6 sm:p-10',
  between: 'flex items-center justify-between',
  stateFooter: 'flex items-center justify-between gap-4 border-t pt-5',
  inspector: 'flex min-w-0 flex-col bg-zinc-950 text-zinc-100',
  inspectorHeader:
    'flex items-center justify-between border-b border-white/10 px-6 py-4',
  inspectorLabel: 'font-mono text-xs text-zinc-400',
  liveLabel: 'inline-flex items-center gap-1.5 text-[11px] text-emerald-300',
  liveDot: 'size-1.5 rounded-full bg-emerald-400',
  inspectorBody: 'min-h-44 px-6 py-6 font-mono text-xs leading-7 sm:text-sm',
  eventLog: 'mt-auto border-t border-white/10 px-6 py-5',
  eventLogLabel: 'mb-3 text-[10px] tracking-widest text-zinc-400 uppercase',
  eventRow: 'flex items-center gap-3 font-mono text-[11px]',
  eventActiveDot: 'size-1 rounded-full bg-emerald-400',
  eventIdleDot: 'size-1 rounded-full bg-zinc-600',
  eventActive: 'text-zinc-200',
  dialogCode: 'rounded-lg bg-muted p-4 font-mono text-xs',
  dialogClose:
    'h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground',
  demoCard:
    'flex min-w-0 flex-col rounded-2xl bg-background shadow-[0_0_0_1px_var(--border)]',
  demoContent: 'flex min-h-52 flex-1 flex-col justify-center gap-4 p-6',
  demoFooter: 'flex items-start justify-between gap-3 border-t px-6 py-5',
  demoTitle: 'text-sm font-semibold',
  demoDescription: 'mt-1 text-xs leading-relaxed text-muted-foreground',
  demoLink:
    'flex size-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
  srOnly: 'sr-only',
  tableSort: 'text-right',
  playgroundHeader: 'flex flex-wrap items-end justify-between gap-5',
  playgroundLink:
    'inline-flex min-h-10 items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring mb-10',
  playgroundGrid: 'grid gap-5 sm:grid-cols-2 lg:grid-cols-3',
  center: 'flex justify-center',
  centeredCaption: 'text-center text-xs text-muted-foreground',
  formError: 'text-xs text-destructive',
  formSuccess: 'text-xs text-emerald-700 dark:text-emerald-400',
  chartCard:
    'rounded-2xl bg-background p-5 shadow-[0_0_0_1px_var(--border)] sm:p-8',
  chartHeader: 'flex flex-wrap items-start justify-between gap-5',
  chartTotal: 'mt-2 text-3xl font-semibold tracking-tight tabular-nums',
  chartPeriods: 'flex rounded-full bg-muted/70 p-1',
  periodSelected:
    'h-10 rounded-full px-4 text-sm transition-[background-color,color,box-shadow,scale] duration-200 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-background text-foreground shadow-sm',
  periodIdle:
    'h-10 rounded-full px-4 text-sm transition-[background-color,color,box-shadow,scale] duration-200 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 text-foreground/75 hover:text-foreground',
  chartSeries: 'mt-8 flex flex-wrap gap-2',
  seriesSelected:
    'h-10 rounded-full px-4 text-sm transition-[background-color,color,box-shadow,scale] duration-200 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-muted text-foreground',
  seriesIdle:
    'h-10 rounded-full px-4 text-sm transition-[background-color,color,box-shadow,scale] duration-200 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 text-foreground/75 hover:bg-muted/50',
  chartFooter:
    'mt-3 flex flex-wrap items-center justify-between gap-3 border-t pt-5',
  chartLegend: 'flex items-center gap-5 text-xs text-muted-foreground',
  legendItem: 'flex items-center gap-2',
  visitorsDot: 'size-2 rounded-full bg-chart-1',
  signupsDot: 'size-2 rounded-full bg-chart-2',
  gettingStarted:
    'grid items-center gap-8 rounded-2xl bg-muted/40 p-6 sm:p-10 lg:grid-cols-[1fr_1.2fr]',
  grid: 'grid gap-4',
  gettingStartedTitle:
    'text-2xl font-semibold tracking-tight text-balance sm:text-3xl',
  gettingStartedCopy:
    'max-w-sm text-sm leading-relaxed text-pretty text-muted-foreground',
  actions: 'flex flex-wrap gap-3',
  terminal:
    'min-w-0 rounded-xl bg-background p-5 shadow-[0_0_0_1px_var(--border)]',
  terminalHeader: 'mb-4 flex items-center justify-between',
  terminalLabel: 'font-mono text-xs text-muted-foreground',
  terminalRow: 'flex items-start gap-3',
  terminalPrompt: 'font-mono text-sm text-muted-foreground',
  terminalCode:
    'min-w-0 flex-1 font-mono text-xs leading-6 break-words sm:text-sm',
  terminalFooter:
    'mt-4 border-t pt-4 text-xs leading-relaxed text-muted-foreground',
  faq: 'mx-auto grid w-full max-w-[1200px] gap-8 px-4 py-14 md:grid-cols-[1fr_1.5fr] md:px-8 md:py-20',
  faqIntro: 'max-w-sm',
  faqTitle: 'text-2xl font-semibold tracking-tight sm:text-3xl',
  faqCopy: 'mt-3 text-sm leading-relaxed text-muted-foreground',
  faqItem: 'group border-b border-border py-5 first:pt-0',
  faqSummary:
    'flex min-h-10 cursor-pointer list-none items-center justify-between gap-4 rounded-sm text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden',
  faqIcon:
    'text-lg font-normal text-muted-foreground transition-transform group-open:rotate-45',
  faqAnswer:
    'max-w-lg pt-3 text-sm leading-relaxed text-pretty text-muted-foreground',
} as const
