import { reset } from '@/stylex/reset'
import { Option } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import * as stylex from '@stylexjs/stylex'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  badgeToneVariant,
  itemLabels,
  overflowListFixtures,
  type OverflowListFixture,
} from '@/docs/components/pages/overflow-list/shared'
import * as Badge from '@/stylex/badge'
import * as Button from '@/stylex/button'
import * as MoreMenu from '@/stylex/more-menu'
import * as OverflowList from '@/stylex/overflow-list'
import { className } from '@/stylex/style'

const styles = stylex.create({
  frame: {
    gap: '0.75rem',
    display: 'grid',
    justifyItems: 'center',
    width: '100%',
  },
  framed: {
    padding: '0.5rem',
    borderColor: 'var(--border)',
    borderRadius: 'calc(var(--radius) - 2px)',
    borderStyle: 'dashed',
    borderWidth: '1px',
  },
  centered: {
    marginInline: 'auto',
    display: 'flex',
    justifyContent: 'center',
  },
  card: {
    padding: '0.5rem',
    borderColor: 'var(--border)',
    borderRadius: 'var(--radius)',
    borderStyle: 'solid',
    borderWidth: '1px',
    backgroundColor: 'var(--card)',
    width: '100%',
  },
  resizableCard: {
    padding: '0.5rem',
    borderColor: 'var(--border)',
    borderRadius: 'var(--radius)',
    borderStyle: 'solid',
    borderWidth: '1px',
    overflow: 'hidden',
    backgroundColor: 'var(--card)',
    resize: 'horizontal',
  },
  status: {
    color: 'var(--muted-foreground)',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
  indicatorLabel: {
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
  },
})

type PreviewMessageCarrier<Msg> = (messageJson: string) => Msg

const renderItems = <Msg>(
  fixture: OverflowListFixture,
  h: HtmlBuilder<Msg>,
): ReadonlyArray<Html | string> =>
  fixture.items.map(item =>
    item.kind === 'badge'
      ? Badge.badge(
          { variant: badgeToneVariant(item.tone), children: [item.label] },
          h,
        )
      : Button.button(
          {
            variant:
              item.variant === 'primary'
                ? 'default'
                : item.variant === 'destructive'
                  ? 'destructive'
                  : 'secondary',
            size: 'sm',
            children: [item.label],
          },
          h,
        ),
  )

const renderIndicator = <Msg>(
  fixture: OverflowListFixture,
  menu: MoreMenu.Model,
  onMessageJson: PreviewMessageCarrier<Msg>,
  h: HtmlBuilder<Msg>,
): ((items: ReadonlyArray<OverflowList.OverflowListItem>) => Html) => {
  const labels = itemLabels(fixture)
  switch (fixture.indicator) {
    case 'moreButton':
      return overflowItems =>
        Button.button(
          {
            variant: 'ghost',
            size: 'sm',
            children: [`+${String(overflowItems.length)} more`],
          },
          h,
        )
    case 'badge':
      return overflowItems =>
        Badge.badge(
          { variant: 'ghost', children: [`+${String(overflowItems.length)}`] },
          h,
        )
    case 'moreMenu':
      return overflowItems =>
        MoreMenu.moreMenu(
          {
            model: menu,
            toParentMessage: message =>
              onMessageJson(
                JSON.stringify({ _tag: 'GotMenuMessage', message }),
              ),
            icon: h.span(
              [h.Class(className(styles.indicatorLabel))],
              [`+${String(overflowItems.length)}`],
            ),
            items: overflowItems.map(({ index }) => ({
              label: labels[index] ?? '',
            })),
          },
          h,
        )
  }
}

const frame = <Msg>(
  fixture: OverflowListFixture,
  inner: Html,
  h: HtmlBuilder<Msg>,
): Html => {
  switch (fixture.container.kind) {
    case 'frame':
      return h.div(
        [
          h.Class(className(styles.framed)),
          h.Style({ maxWidth: `${String(fixture.container.maxWidth)}px` }),
        ],
        [inner],
      )
    case 'center':
      return h.div(
        [
          h.Class(className(styles.centered)),
          h.Style({ width: `${String(fixture.container.width)}px` }),
        ],
        [h.div([h.Class(className(styles.card))], [inner])],
      )
    case 'card':
      return h.div(
        [
          h.Class(className(styles.resizableCard)),
          h.Style({
            width: `${String(fixture.container.width)}px`,
            minWidth: `${String(fixture.container.minWidth ?? 80)}px`,
            maxWidth: '100%',
          }),
        ],
        [inner],
      )
  }
}

export const overflowListStyleXPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => {
  const fixture = overflowListFixtures[exampleIndex] ?? overflowListFixtures[0]
  const previewModel = model as {
    list: OverflowList.Model
    menu: MoreMenu.Model
    hiddenCount: number
  }
  return h.div(
    [h.Class(className(styles.frame))],
    [
      frame(
        fixture,
        OverflowList.overflowList(
          {
            model: previewModel.list,
            toParentMessage: message =>
              onMessageJson(
                JSON.stringify({ _tag: 'GotListMessage', message }),
              ),
            gap: fixture.gap,
            ...(fixture.maxVisibleItems === undefined
              ? {}
              : { maxVisibleItems: fixture.maxVisibleItems }),
            ...(fixture.maxRows === undefined
              ? {}
              : { maxRows: fixture.maxRows }),
            ...(fixture.collapseFrom === undefined
              ? {}
              : { collapseFrom: fixture.collapseFrom }),
            ...(fixture.container.kind === 'card'
              ? { behavior: 'observeParent' as const }
              : {}),
            overflowRenderer: renderIndicator(
              fixture,
              previewModel.menu,
              onMessageJson,
              h,
            ),
            children: renderItems(fixture, h),
          },
          h,
        ),
        h,
      ),
      h.p(
        [h.Role('status'), h.Class(className(reset.text, styles.status))],
        [
          previewModel.hiddenCount === 0
            ? 'Everything fits.'
            : `${String(previewModel.hiddenCount)} item(s) collapsed.`,
        ],
      ),
    ],
  )
}
