import * as stylex from '@stylexjs/stylex'

/** Semantic values used only by the authored card specimens in this batch. */
export const cardDemoTokens = stylex.defineVars({
  pendingIndicator: 'oklch(0.795 0.184 86.047)',
  artworkSurface: 'var(--muted)',
  artworkForeground: 'var(--muted-foreground)',
  round: '9999px',
  cameraPattern:
    'repeating-linear-gradient(45deg, transparent, transparent 10px, var(--border) 10px, var(--border) 11px)',
})
