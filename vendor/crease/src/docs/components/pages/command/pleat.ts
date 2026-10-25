import { Style } from '@pleat/core'
import type { Option } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  commandFixtures,
  itemsForFixture,
} from '@/docs/components/pages/command/shared'
import * as Icon from '@/lib/icon'
import * as Button from '@/pleat/button'
import * as CommandMenu from '@/pleat/command'
import * as Dialog from '@/pleat/dialog'
import { className } from '@/pleat/style'

import { layoutStyle } from '@/pleat/contracts'
const styles = {
  stack: Style.make({ gap: '1rem', display: 'flex', flexDirection: 'column' }),
  fit: layoutStyle({ width: 'fit-content' }),
  icon: Style.make({ height: '1rem', width: '1rem' }),
  itemRow: Style.make({ gap: '0.5rem', alignItems: 'center', display: 'flex' }),
}

type Preview = Readonly<{
  dialog: Dialog.Model
  command: CommandMenu.Model
  maybeValue: Option.Option<string>
}>

export const commandPleatPreview: ExamplePreviewProvider = <Msg>(
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
