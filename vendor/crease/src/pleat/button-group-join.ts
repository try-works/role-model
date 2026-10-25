import { Style, When } from '@pleat/core'
// Mirrors the Tailwind button-group child joins:
// [&>*:not(:first-child)]:rounded-l-none [&>*:not(:first-child)]:border-l-0
// [&>*:not(:last-child)]:rounded-r-none (and the vertical equivalents),
// [&>*]:focus-visible:relative [&>*]:focus-visible:z-10, and [&>input]:flex-1.
import { foundationTokens } from './foundations-tokens'

export const joinStyles = {
  join: Style.empty.pipe(
    Style.when(
      When.pseudo(':where([data-slot="button-group"] > :focus-visible)'),
      { position: 'relative', zIndex: 10 },
    ),
    Style.when(
      When.pseudo(
        ':where([data-slot="button-group"][data-orientation="horizontal"] > :not(:first-child))',
      ),
      { borderBottomLeftRadius: 0, borderLeftWidth: 0, borderTopLeftRadius: 0 },
    ),
    Style.when(
      When.pseudo(
        ':where([data-slot="button-group"][data-orientation="vertical"] > :not(:last-child))',
      ),
      { borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
    ),
    Style.when(
      When.pseudo(
        ':where([data-slot="button-group"][data-orientation="horizontal"] > :not(:last-child))',
      ),
      { borderBottomRightRadius: 0, borderTopRightRadius: 0 },
    ),
    Style.when(
      When.pseudo(
        ':where([data-slot="button-group"][data-orientation="vertical"] > :not(:first-child))',
      ),
      { borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTopWidth: 0 },
    ),
  ),
  inputGrow: Style.empty.pipe(
    Style.when(When.pseudo(':where([data-slot="button-group"] > input)'), {
      flex: '1',
    }),
  ),
  triggerFit: Style.empty.pipe(
    Style.when(
      When.pseudo(
        ':where([data-slot="button-group"] > [data-slot="select-trigger"])',
      ),
      { width: 'fit-content' },
    ),
  ),
  triggerRadiusBack: Style.empty.pipe(
    Style.when(
      When.pseudo(
        ':where([data-slot="button-group"]:has(> select[aria-hidden="true"]:last-child) > [data-slot="select-trigger"]:last-of-type)',
      ),
      {
        borderBottomRightRadius: foundationTokens.radiusMd,
        borderTopRightRadius: foundationTokens.radiusMd,
      },
    ),
  ),
}
