// The StyleX build resolves this module to landing-skin.stylex.ts.
export const landingSkin = {
  sectionHeading: 'flex max-w-2xl flex-col gap-3',
  sectionTitle:
    'text-2xl font-semibold tracking-tight text-balance sm:text-3xl',
  sectionCopy: 'text-muted-foreground text-balance',
  collage: 'grid w-full max-w-xl gap-4',
  collageRow: 'grid grid-cols-[1fr_auto] items-start gap-4',
  badges: 'flex flex-col items-start gap-2',
  keyHints: 'text-muted-foreground mt-2 flex items-center gap-1 text-xs',
  hero: 'mx-auto grid w-full max-w-[1200px] items-center gap-12 px-4 py-16 md:grid-cols-2 md:px-8 md:py-24',
  heroCopy: 'flex flex-col items-start gap-6',
  brandRow: 'flex items-center gap-3',
  logo: 'size-10 rounded-[9px]',
  brand: 'text-lg font-semibold tracking-tight',
  accent: 'text-[oklch(0.62_0.15_145)]',
  heroTitle:
    'text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl',
  heroDescription: 'text-muted-foreground max-w-md text-lg text-balance',
  actions: 'flex flex-wrap items-center gap-3',
  license: 'text-muted-foreground text-xs',
  section:
    'mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-4 py-16 md:px-8',
  comparison:
    'relative w-full cursor-ew-resize touch-none overflow-hidden rounded-xl border shadow-sm select-none',
  image: 'block w-full',
  overlay: 'absolute inset-0',
  divider: 'bg-foreground/60 pointer-events-none absolute inset-y-0 w-px',
  leftLabel:
    'bg-background/90 text-foreground pointer-events-none absolute top-3 left-3 rounded-md border px-2 py-1 text-xs font-medium',
  rightLabel:
    'bg-background/90 text-foreground pointer-events-none absolute top-3 right-3 rounded-md border px-2 py-1 text-xs font-medium',
  range: 'absolute inset-0 h-full w-full cursor-ew-resize opacity-0',
  layer: 'flex flex-col gap-1 rounded-xl border p-4',
  label: 'text-sm font-semibold',
  muted: 'text-muted-foreground text-sm',
  band: 'bg-muted/40 border-y',
  columns:
    'mx-auto grid w-full max-w-[1200px] items-start gap-10 px-4 py-16 md:grid-cols-2 md:px-8',
  stack: 'flex flex-col gap-6',
  grid: 'grid gap-2',
  stackTight: 'flex flex-col gap-4',
  installCard:
    'bg-background flex flex-col gap-3 rounded-xl border p-4 shadow-sm',
  installRow: 'flex items-center justify-between gap-2',
  code: 'font-mono text-sm',
  checks: 'text-muted-foreground grid gap-2 text-sm',
  check: 'flex items-center gap-2',
  stat: 'hover:bg-muted/50 flex flex-col gap-1 rounded-xl border p-6 transition-colors',
  statValue: 'text-3xl font-semibold tracking-tight',
  stats: 'grid gap-4 sm:grid-cols-3',
  snippet:
    'bg-background overflow-x-auto rounded-xl border p-4 font-mono text-xs leading-relaxed shadow-sm',
  faqItem: 'flex flex-col gap-1.5',
  faqGrid: 'grid gap-8 md:grid-cols-2',
  footer: 'border-t',
  footerInner:
    'text-muted-foreground mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-4 px-4 py-10 text-sm md:px-8',
  footerLinks: 'flex flex-wrap items-center gap-4',
  footerLink: 'hover:text-foreground',
  revision: 'font-mono hover:text-foreground',
  icon: 'size-4',
} as const
