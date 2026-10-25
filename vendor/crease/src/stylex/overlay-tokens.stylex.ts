import * as stylex from '@stylexjs/stylex'

import { complexTokens } from './complex-tokens.stylex'
import { interactionTokens } from './interaction-tokens.stylex.const'
import { foundationTokens } from './foundations-tokens.stylex'
import { tokens } from './tokens.stylex'

/** Canonical roles shared by dialogs, menus, pickers, and transient feedback. */
export const overlayStyles = stylex.create({
  arrow: {
    backgroundColor: tokens.primary,
    position: 'absolute',
    transform: 'rotate(45deg)',
    height: '0.625rem',
    width: '0.625rem',
  },
  backdrop: {
    inset: 0,
    position: 'fixed',
    zIndex: 40,
  },
  close: {
    borderColor: tokens.transparent,
    /* TW 'rounded-xs' (2px) — keeps the focus ring's rounded-square shape. */
    borderRadius: complexTokens.smallRadius,
    borderStyle: 'solid',
    backgroundColor: tokens.transparent,
    boxShadow: {
      default: tokens.shadowNone,
      /* TW 'focus:ring-2 focus:ring-offset-2 focus:ring-ring' — a 2px
         background-offset then a 2px full-alpha ring (not the shared
         3px/50% focusRingShadow). */
      ':focus': tokens.focusRingOffsetShadow,
    },
    cursor: interactionTokens.cursorAction,
    opacity: { default: 0.7, ':hover': 1 },
    outlineStyle: 'none',
    position: 'absolute',
    transitionDuration: {
      default: interactionTokens.motionFast,
      '@media (prefers-reduced-motion: reduce)': interactionTokens.motionNone,
    },
    transitionTimingFunction: interactionTokens.easingStandard,
    right: '1rem',
    top: '1rem',
  },
  description: {
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
  dialog: {
    padding: 0,
    borderColor: tokens.transparent,
    alignItems: 'center',
    backgroundColor: tokens.transparent,
    display: { default: 'none', ':is([open])': 'flex' },
    justifyContent: 'center',
  },
  footer: {
    gap: '0.5rem',
    display: 'flex',
    flexDirection: {
      default: 'column-reverse',
      '@media (min-width: 640px)': 'row',
    },
    justifyContent: 'flex-end',
  },
  group: {
    padding: '0.25rem',
    overflow: 'hidden',
    color: tokens.foreground,
  },
  header: {
    gap: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
    textAlign: {
      default: 'center',
      '@media (min-width: 640px)': 'left',
    },
  },
  icon: {
    color: tokens.mutedForeground,
    flexShrink: 0,
    pointerEvents: 'none',
    transitionDuration: {
      default: interactionTokens.motionModerate,
      '@media (prefers-reduced-motion: reduce)': interactionTokens.motionNone,
    },
    transitionTimingFunction: interactionTokens.easingStandard,
    height: '1rem',
    width: '1rem',
  },
  indicator: {
    display: 'flex',
    opacity: 0,
    marginLeft: 'auto',
  },
  input: {
    borderColor: tokens.transparent,
    backgroundColor: tokens.transparent,
    color: tokens.foreground,
    fontFamily: 'inherit',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    outlineStyle: 'none',
    height: '2.5rem',
    width: '100%',
  },
  inputWrapper: {
    gap: '0.5rem',
    paddingInline: '0.75rem',
    alignItems: 'center',
    display: 'flex',
    borderBottomColor: tokens.border,
    borderBottomStyle: 'solid',
    borderBottomWidth: 1,
    height: '2.25rem',
  },
  item: {
    borderRadius: tokens.controlRadius,
    gap: '0.5rem',
    paddingBlock: '0.375rem',
    paddingInline: '0.5rem',
    alignItems: 'center',
    backgroundColor: {
      default: tokens.transparent,
      // Foldkit uses empty active markers; dropdown menus emit boolean values.
      ':is([data-active="true"], [data-active=""], [data-selected])':
        tokens.accent,
      ':hover': tokens.accent,
    },
    color: {
      default: tokens.foreground,
      ':is([data-active="true"], [data-active=""], [data-selected])':
        tokens.accentForeground,
      ':hover': tokens.accentForeground,
    },
    cursor: interactionTokens.cursorDefault,
    display: 'flex',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    opacity: {
      default: 1,
      ':is([data-disabled], [aria-disabled="true"])': 0.5,
    },
    outlineStyle: 'none',
    pointerEvents: {
      default: 'auto',
      ':is([data-disabled], [aria-disabled="true"])': 'none',
    },
    position: 'relative',
    userSelect: 'none',
    width: '100%',
  },
  label: {
    paddingBlock: '0.375rem',
    paddingInline: '0.5rem',
    color: tokens.mutedForeground,
    fontSize: '0.75rem',
    lineHeight: '1rem',
  },
  list: {
    padding: '0.25rem',
    maxHeight: '18.75rem',
    overflowX: 'hidden',
    overflowY: 'auto',
  },
  media: {
    borderRadius: tokens.controlRadius,
    alignItems: 'center',
    backgroundColor: tokens.secondary,
    display: 'inline-flex',
    justifyContent: 'center',
    height: '4rem',
    width: '4rem',
  },
  overlay: {
    inset: 0,
    backgroundColor: tokens.backdrop,
    opacity: { default: 1, ':is([data-closed])': 0 },
    position: 'fixed',
    transitionDuration: {
      default: interactionTokens.motionModerate,
      '@media (prefers-reduced-motion: reduce)': interactionTokens.motionNone,
    },
    transitionProperty: {
      default: 'opacity',
      '@media (prefers-reduced-motion: reduce)': 'none',
    },
    transitionTimingFunction: interactionTokens.easingStandard,
    zIndex: 50,
  },
  /* Menus, popovers, selects and comboboxes: shadcn `rounded-md bg-popover
     shadow-md`. Dialogs keep the larger panel radius. */
  /* Dialogs and sheets: shadcn `shadow-lg`. */
  modal: {
    boxShadow: foundationTokens.shadowLg,
  },
  floating: {
    borderRadius: tokens.controlRadius,
    backgroundColor: foundationTokens.popover,
    boxShadow: foundationTokens.shadowMd,
  },
  panel: {
    borderColor: tokens.border,
    borderRadius: tokens.radius,
    borderStyle: 'solid',
    borderWidth: 1,
    overflow: 'hidden',
    backgroundColor: tokens.background,
    boxShadow: tokens.shadowCard,
    color: tokens.foreground,
    opacity: { default: 1, ':is([data-closed])': 0 },
    position: 'relative',
    transform: { default: 'none', ':is([data-closed])': 'scale(0.95)' },
    transitionDuration: {
      default: interactionTokens.motionModerate,
      '@media (prefers-reduced-motion: reduce)': interactionTokens.motionNone,
    },
    transitionProperty: {
      default: 'opacity, transform',
      '@media (prefers-reduced-motion: reduce)': 'none',
    },
    transitionTimingFunction: interactionTokens.easingStandard,
    zIndex: 50,
    maxWidth: 'calc(100vw - 2rem)',
    width: '100%',
  },
  panelContent: {
    padding: '1rem',
  },
  root: {
    borderRadius: tokens.controlRadius,
    overflow: 'hidden',
    backgroundColor: tokens.background,
    color: tokens.foreground,
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
  },
  separator: {
    marginBlock: '0.25rem',
    backgroundColor: tokens.border,
    pointerEvents: 'none',
    height: '1px',
  },
  shortcut: {
    color: tokens.mutedForeground,
    fontSize: '0.75rem',
    letterSpacing: '0.1em',
    lineHeight: '1rem',
    marginLeft: 'auto',
  },
  title: {
    color: tokens.foreground,
    fontSize: '1.125rem',
    fontWeight: 600,
    lineHeight: 1,
  },
  tooltip: {
    borderRadius: tokens.controlRadius,
    paddingBlock: '0.375rem',
    paddingInline: '0.75rem',
    backgroundColor: tokens.primary,
    color: tokens.primaryForeground,
    fontSize: '0.75rem',
    lineHeight: '1rem',
    position: 'relative',
    textWrap: 'balance',
    zIndex: 50,
    width: 'fit-content',
  },
  trigger: {
    borderColor: {
      default: tokens.input,
      ':focus-visible': tokens.ring,
    },
    borderRadius: tokens.controlRadius,
    borderStyle: 'solid',
    borderWidth: 1,
    gap: '0.5rem',
    paddingBlock: '0.375rem',
    paddingInline: '0.625rem',
    alignItems: 'center',
    backgroundColor: tokens.transparent,
    boxShadow: {
      default: tokens.shadowNone,
      ':focus-visible': tokens.focusRingShadow,
    },
    color: tokens.foreground,
    cursor: interactionTokens.cursorAction,
    display: 'inline-flex',
    fontSize: '0.875rem',
    justifyContent: 'space-between',
    lineHeight: '1.25rem',
    opacity: {
      default: 1,
      ':is([data-disabled], [aria-disabled="true"])': 0.5,
    },
    outlineStyle: 'none',
    pointerEvents: {
      default: 'auto',
      ':is([data-disabled], [aria-disabled="true"])': 'none',
    },
    minHeight: '2rem',
  },
  viewport: {
    padding: '0.25rem',
    width: '100%',
  },
})
