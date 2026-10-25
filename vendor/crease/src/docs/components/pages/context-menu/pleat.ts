import { Style } from '@pleat/core'
import { reset } from '@/pleat/reset'
import { Option } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  contextMenuFixtures,
  fixtureItems,
  fixtureLabel,
} from '@/docs/components/pages/context-menu/shared'
import { resolveItemConfig } from '@/docs/components/pages/dropdown-menu/shared'
import * as Icon from '@/lib/icon'
import * as ContextMenu from '@/pleat/context-menu'
import { className } from '@/pleat/style'

const styles = {
  stack: Style.make({
    gap: '0.75rem',
    display: 'grid',
    justifyItems: 'center',
  }),
  targetInner: Style.make({
    borderColor: 'var(--border)',
    borderRadius: 'var(--radius-xl)',
    borderStyle: 'dashed',
    borderWidth: '1px',
    alignItems: 'center',
    aspectRatio: '16 / 9',
    display: 'flex',
    fontSize: '0.875rem',
    justifyContent: 'center',
    lineHeight: '1.25rem',
    width: '20rem',
  }),
  status: Style.make({
    color: 'var(--muted-foreground)',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  }),
  icon: Style.make({ height: '1rem', width: '1rem' }),
}

type Preview = Readonly<{
  menu: ContextMenu.Model
  maybeLastAction: Option.Option<string>
  checkedValues: ReadonlyArray<string>
  peopleValue: Option.Option<string>
  themeValue: Option.Option<string>
}>

export const contextMenuPleatPreview: ExamplePreviewProvider = <Msg>(
  index: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html | undefined => {
  const fixture = contextMenuFixtures[index]
  if (fixture === undefined) return undefined
  const preview = model as Preview
  return h.div(
    [h.Class(className(styles.stack))],
    [
      ContextMenu.contextMenu(
        {
          model: preview.menu,
          toParentMessage: message =>
            onMessageJson(
              JSON.stringify({ _tag: 'GotContextMenuMessage', message }),
            ),
          trigger: h.div(
            [h.Class(className(styles.targetInner))],
            ['Right click here'],
          ),
          ariaLabel: `${fixture.title} menu`,
          items: fixtureItems(fixture),
          itemToConfig: item => {
            const spec = fixture.items.find(
              candidate => candidate.value === item,
            )
            const radioValue =
              spec?.group === 'People'
                ? (Option.getOrNull(preview.peopleValue) ?? undefined)
                : (Option.getOrNull(preview.themeValue) ?? undefined)
            const state = { checkedValues: preview.checkedValues, radioValue }
            return spec === undefined
              ? { label: item }
              : resolveItemConfig(spec, state, name =>
                  Icon.icon(name, { class: className(styles.icon) }, h),
                )
          },
          ...(fixture.keepOpenOnCheckableSelect === true
            ? { keepOpenOnCheckableSelect: true }
            : {}),
          ...(fixture.direction === 'rtl' ? { direction: 'rtl' as const } : {}),
        },
        h,
      ),
      h.p(
        [h.Role('status'), h.Class(className(reset.text, styles.status))],
        [
          Option.match(preview.maybeLastAction, {
            onNone: () => 'No action selected.',
            onSome: action => `Last action: ${fixtureLabel(fixture, action)}`,
          }),
        ],
      ),
    ],
  )
}
