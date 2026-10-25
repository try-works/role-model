import * as stylex from '@stylexjs/stylex'

// Mirrors the Tailwind button-group child joins:
// [&>*:not(:first-child)]:rounded-l-none [&>*:not(:first-child)]:border-l-0
// [&>*:not(:last-child)]:rounded-r-none (and the vertical equivalents),
// [&>*]:focus-visible:relative [&>*]:focus-visible:z-10, and [&>input]:flex-1.
import { foundationTokens } from './foundations-tokens.stylex'

export const joinStyles = stylex.create({
  join: {
    position: {
      default: null,
      ':where([data-slot="button-group"] > :focus-visible)': 'relative',
    },
    zIndex: {
      default: null,
      ':where([data-slot="button-group"] > :focus-visible)': 10,
    },
    borderBottomLeftRadius: {
      default: null,
      ':where([data-slot="button-group"][data-orientation="horizontal"] > :not(:first-child))': 0,
      ':where([data-slot="button-group"][data-orientation="vertical"] > :not(:last-child))': 0,
    },
    borderBottomRightRadius: {
      default: null,
      ':where([data-slot="button-group"][data-orientation="horizontal"] > :not(:last-child))': 0,
      ':where([data-slot="button-group"][data-orientation="vertical"] > :not(:last-child))': 0,
    },
    borderLeftWidth: {
      default: null,
      ':where([data-slot="button-group"][data-orientation="horizontal"] > :not(:first-child))': 0,
    },
    borderTopLeftRadius: {
      default: null,
      ':where([data-slot="button-group"][data-orientation="horizontal"] > :not(:first-child))': 0,
      ':where([data-slot="button-group"][data-orientation="vertical"] > :not(:first-child))': 0,
    },
    borderTopRightRadius: {
      default: null,
      ':where([data-slot="button-group"][data-orientation="horizontal"] > :not(:last-child))': 0,
      ':where([data-slot="button-group"][data-orientation="vertical"] > :not(:first-child))': 0,
    },
    borderTopWidth: {
      default: null,
      ':where([data-slot="button-group"][data-orientation="vertical"] > :not(:first-child))': 0,
    },
  },
  // [&>input]:flex-1
  inputGrow: {
    flex: {
      default: null,
      ':where([data-slot="button-group"] > input)': '1',
    },
  },
  // [&>[data-slot=select-trigger]:not([class*='w-'])]:w-fit
  triggerFit: {
    width: {
      default: null,
      ':where([data-slot="button-group"] > [data-slot="select-trigger"])':
        'fit-content',
    },
  },
  // has-[select[aria-hidden=true]:last-child]:[&>[data-slot=select-trigger]:last-of-type]:rounded-r-md
  triggerRadiusBack: {
    borderBottomRightRadius: {
      default: null,
      ':where([data-slot="button-group"]:has(> select[aria-hidden="true"]:last-child) > [data-slot="select-trigger"]:last-of-type)':
        foundationTokens.radiusMd,
    },
    borderTopRightRadius: {
      default: null,
      ':where([data-slot="button-group"]:has(> select[aria-hidden="true"]:last-child) > [data-slot="select-trigger"]:last-of-type)':
        foundationTokens.radiusMd,
    },
  },
})
