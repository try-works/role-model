import { Style } from '@pleat/core'
import { className } from '@/pleat/style'
import { reset } from '@/pleat/reset'
import { Option } from 'effect'
import type { HtmlBuilder } from 'foldkit/html'
import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  dropdownMenuFixtures,
  fixtureItems,
  fixtureLabel,
  resolveItemConfig,
} from '@/docs/components/pages/dropdown-menu/shared'
import * as Avatar from '@/pleat/avatar'
import * as DropdownMenu from '@/pleat/dropdown-menu'
import * as Icon from '@/lib/icon'

const styles = {
  frame: Style.make({
    gap: '0.75rem',
    display: 'grid',
    justifyItems: 'center',
  }),
  status: Style.make({
    color: 'var(--muted-foreground)',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  }),
}

export const dropdownMenuPleatPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => {
  const fixture = dropdownMenuFixtures[exampleIndex] ?? dropdownMenuFixtures[0]
  const previewModel = model as {
    dropdownMenu: DropdownMenu.Model
    maybeLastAction: Option.Option<string>
    checkedValues: ReadonlyArray<string>
    radioValue: Option.Option<string>
  }
  const state = {
    checkedValues: previewModel.checkedValues,
    radioValue: Option.getOrNull(previewModel.radioValue) ?? undefined,
  }
  const trigger =
    fixture.trigger.kind === 'avatar'
      ? Avatar.avatar(
          {
            children: [
              Avatar.avatarFallback(
                { children: [fixture.trigger.initials] },
                h,
              ),
            ],
          },
          h,
        )
      : fixture.trigger.label
  return h.div(
    [h.Class(className(styles.frame))],
    [
      DropdownMenu.dropdownMenu(
        {
          model: previewModel.dropdownMenu,
          toParentMessage: message =>
            onMessageJson(
              JSON.stringify({ _tag: 'GotDropdownPreviewMessage', message }),
            ),
          trigger,
          ...(fixture.trigger.kind === 'avatar'
            ? {
                triggerButtonVariant: 'ghost' as const,
                triggerButtonSize: 'icon-sm' as const,
                triggerButtonRounded: true,
              }
            : { triggerButtonVariant: 'outline' as const }),
          ariaLabel: `${fixture.title} menu`,
          items: fixtureItems(fixture),
          itemToConfig: item => {
            const spec = fixture.items.find(
              candidate => candidate.value === item,
            )
            return spec === undefined
              ? { label: item }
              : resolveItemConfig(spec, state, name => Icon.icon(name, {}, h))
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
          Option.match(previewModel.maybeLastAction, {
            onNone: () => 'No action selected.',
            onSome: action => `Last action: ${fixtureLabel(fixture, action)}`,
          }),
        ],
      ),
    ],
  )
}
