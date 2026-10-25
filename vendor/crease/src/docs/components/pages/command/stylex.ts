import type { Option } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import * as stylex from '@stylexjs/stylex'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  commandFixtures,
  itemsForFixture,
} from '@/docs/components/pages/command/shared'
import * as Icon from '@/lib/icon'
import * as Button from '@/stylex/button'
import * as CommandMenu from '@/stylex/command'
import * as Dialog from '@/stylex/dialog'
import { className } from '@/stylex/style'

const styles = stylex.create({
  stack: { gap: '1rem', display: 'flex', flexDirection: 'column' },
  fit: { width: 'fit-content' },
  icon: { height: '1rem', width: '1rem' },
  itemRow: { gap: '0.5rem', alignItems: 'center', display: 'flex' },
})

type Preview = Readonly<{
  dialog: Dialog.Model
  command: CommandMenu.Model
  maybeValue: Option.Option<string>
}>

export const commandStyleXPreview: ExamplePreviewProvider = <Msg>(
  index: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html | undefined => {
  const fixture = commandFixtures[index]
  if (fixture === undefined) return undefined
  const preview = model as Preview
  const items = itemsForFixture(fixture)

  const palette = CommandMenu.command(
    {
      model: preview.command,
      maybeSelectedValue: preview.maybeValue,
      restingInputValue: '',
      toParentMessage: message =>
        onMessageJson(JSON.stringify({ _tag: 'GotCommandMessage', message })),
      items: items.map(item => item.value),
      itemToConfig: value => {
        const item = items.find(entry => entry.value === value)
        return {
          content: h.span(
            [h.Class(className(styles.itemRow))],
            [
              ...(item?.icon === undefined
                ? []
                : [Icon.icon(item.icon, { class: className(styles.icon) }, h)]),
              h.span([], [value]),
            ],
          ),
          ...(item?.shortcut === undefined ? {} : { shortcut: item.shortcut }),
        }
      },
      itemGroupKey: value =>
        items.find(entry => entry.value === value)?.group ?? 'Other',
      groupToHeading: group => group,
      placeholder:
        fixture.kind === 'rtl'
          ? 'اكتب أمرًا أو ابحث...'
          : 'Type a command or search...',
      ariaLabel: fixture.kind === 'rtl' ? 'قائمة الأوامر' : 'Command menu',
      emptyContent: 'No results found.',
    },
    h,
  )

  return h.div(
    [
      ...(fixture.kind === 'rtl' ? [h.Dir('rtl')] : []),
      h.Class(className(styles.stack)),
    ],
    [
      Button.button(
        {
          variant: 'outline',
          layoutStyle: styles.fit,
          onClick: onMessageJson(JSON.stringify({ _tag: 'OpenedMenu' })),
          children: ['Open Menu'],
        },
        h,
      ),
      Dialog.dialog(
        {
          model: preview.dialog,
          toParentMessage: message =>
            onMessageJson(
              JSON.stringify({ _tag: 'GotDialogMessage', message }),
            ),
          title: fixture.kind === 'rtl' ? 'قائمة الأوامر' : 'Command menu',
          content: () => [palette],
        },
        h,
      ),
    ],
  )
}
