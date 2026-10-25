import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  tokenFixtures,
  type TokenItem,
} from '@/docs/components/pages/token/shared'
import * as Icon from '@/lib/icon'
import { className } from '@/stylex/style'
import { tokens } from '../../../../stylex/tokens.stylex'
import * as Badge from '@/stylex/badge'
import * as Token from '@/stylex/token'

const styles = stylex.create({
  column: { gap: '0.5rem', display: 'flex', flexDirection: 'column' },
  gapLarge: { gap: '2.5rem', display: 'flex', flexDirection: 'column' },
  row: { gap: '0.25rem', display: 'flex', flexWrap: 'wrap' },
  rowShowcase: {
    gap: '0.5rem',
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
  },
  caption: {
    color: tokens.mutedForeground,
    fontSize: '0.75rem',
    lineHeight: '1rem',
  },
  iconSm: { height: '0.75rem', width: '0.75rem' },
})

/* Literal icon names keep `icons:generate` statically scannable. */
const tokenIconMap: Record<
  NonNullable<TokenItem['icon']>,
  <M>(h: HtmlBuilder<M>) => Html
> = {
  user: h => Icon.icon('user', { class: className(styles.iconSm) }, h),
  star: h => Icon.icon('star', { class: className(styles.iconSm) }, h),
  tag: h => Icon.icon('tag', { class: className(styles.iconSm) }, h),
  'shield-check': h =>
    Icon.icon('shield-check', { class: className(styles.iconSm) }, h),
}
const tokenIcon = (name: NonNullable<TokenItem['icon']>) => tokenIconMap[name]

const itemView = <Msg>(item: TokenItem, noop: Msg, h: HtmlBuilder<Msg>) =>
  Token.token(
    {
      label: item.label,
      ...(item.color === undefined ? {} : { color: item.color }),
      ...(item.size === undefined ? {} : { size: item.size }),
      ...(item.icon === undefined ? {} : { icon: tokenIcon(item.icon) }),
      ...(item.endContent === undefined
        ? {}
        : {
            endContent: [
              Badge.badge(
                { variant: 'secondary', children: [item.endContent] },
                h,
              ),
            ],
          }),
      ...(item.isDisabled === true ? { isDisabled: true } : {}),
      ...(item.hasClick === true ? { onClick: noop } : {}),
      ...(item.hasRemove === true ? { onRemove: noop } : {}),
    },
    h,
  )

export const tokenStyleXPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  _model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => {
  const fixture = tokenFixtures[exampleIndex] ?? tokenFixtures[0]
  const noop = onMessageJson(
    JSON.stringify({ _tag: 'InteractedWithTokenPreview' }),
  )
  const singleSection =
    fixture.sections.length === 1 ? fixture.sections[0] : undefined
  if (singleSection !== undefined && singleSection.label === '')
    return h.div(
      [h.Class(className(styles.rowShowcase))],
      singleSection.items.map(item => itemView(item, noop, h)),
    )
  return h.div(
    [h.Class(className(styles.gapLarge))],
    fixture.sections.map(section =>
      h.div(
        [h.Class(className(styles.column))],
        [
          h.span([h.Class(className(styles.caption))], [section.label]),
          h.div(
            [h.Class(className(styles.row))],
            section.items.map(item => itemView(item, noop, h)),
          ),
        ],
      ),
    ),
  )
}
