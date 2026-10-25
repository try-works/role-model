// The StyleX build resolves this module to skin.stylex.ts.
export const skin = {
  header: 'sticky top-0 z-40 border-b bg-background/95 backdrop-blur',
  bar: 'mx-auto flex min-h-14 w-full max-w-[1400px] items-center gap-2 px-4 min-[400px]:gap-4 md:gap-6 md:px-8',
  brand: 'shrink-0 text-sm font-semibold',
  nav: 'hidden items-center gap-6 sm:flex',
  link: 'text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
  active: 'text-sm font-medium text-foreground transition-colors',
  other: 'text-xs font-medium text-muted-foreground hover:text-foreground',
  actions: 'ml-auto flex items-center gap-1 sm:gap-2',
  searchTrigger:
    'inline-flex size-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md border bg-muted/30 text-sm text-muted-foreground outline-none transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none lg:h-9 lg:w-60 lg:justify-start lg:px-3',
  searchLabel: 'hidden lg:inline',
  searchShortcut:
    'ml-auto hidden rounded border bg-background px-1 text-[10px] font-medium leading-5 lg:inline-flex',
  searchResults: 'min-w-0',
  searchResult: 'flex w-full min-w-0 items-center gap-3 py-1',
  searchResultIcon: 'size-4 shrink-0 text-muted-foreground',
  searchResultCopy: 'flex min-w-0 flex-1 flex-col gap-1',
  searchResultTitle: 'text-sm font-medium',
  searchResultDescription: 'truncate text-xs text-foreground/75',
  searchHelp:
    'text-muted-foreground flex w-full flex-wrap items-center justify-between gap-3 border-t pt-3 text-xs',
  theme:
    'group relative inline-flex size-10 shrink-0 items-center justify-center rounded-md text-foreground outline-none transition-[color,background-color,transform] duration-200 hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.96]',
  iconLink:
    'inline-flex size-10 shrink-0 items-center justify-center rounded-md text-foreground outline-none transition-[color,background-color,transform] duration-200 hover:bg-accent hover:text-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.96]',
  themeIconWrap: 'relative size-4',
  themeIconSun:
    'theme-toggle-icon absolute inset-0 size-4 scale-100 opacity-100 transition-[scale,opacity] duration-200 ease-[cubic-bezier(0.2,0,0,1)] dark:scale-25 dark:opacity-0',
  themeIconMoon:
    'theme-toggle-icon absolute inset-0 size-4 scale-25 opacity-0 transition-[scale,opacity] duration-200 ease-[cubic-bezier(0.2,0,0,1)] dark:scale-100 dark:opacity-100',
  mobile: 'relative sm:hidden',
  summary:
    'flex size-10 cursor-pointer list-none items-center justify-center rounded-md hover:bg-accent',
  menu: 'absolute top-11 right-0 z-50 grid min-w-44 gap-4 rounded-lg border bg-background p-4 shadow-sm',
  icon: 'size-4',
  notFound: 'mx-auto max-w-xl px-8 py-16 text-muted-foreground',
  themeLabLauncher:
    'fixed right-5 bottom-20 z-40 inline-flex size-11 items-center justify-center rounded-full border bg-background text-foreground shadow-lg outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring',
  themeLabLauncherIcon: 'size-5',
  themeLabDot: 'absolute top-2 right-2 size-2 rounded-full bg-primary',
  themeLabPanel:
    'fixed top-16 right-5 bottom-5 z-40 flex w-[24rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl bg-card text-card-foreground shadow-xl ring-1 ring-border',
  themeLabHeader:
    'flex items-center justify-between gap-3 border-b border-border px-4 py-3',
  themeLabTitle: 'text-sm font-semibold',
  themeLabHint: 'font-mono text-[10px] text-muted-foreground',
  themeLabActions: 'flex items-center gap-1',
  themeLabApply: 'rounded-md px-2 py-1 text-xs font-medium transition-colors',
  themeLabApplyOn: 'bg-success/20 text-success',
  themeLabApplyOff:
    'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground',
  themeLabIconButton:
    'inline-flex size-7 items-center justify-center rounded-md text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring',
  themeLabIcon: 'size-4',
  themeLabBody: 'flex min-h-0 flex-1 flex-col overflow-hidden',
} as const
