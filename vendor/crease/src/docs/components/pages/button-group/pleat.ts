import { Style, When } from '@pleat/core'
import { reset } from '@/pleat/reset'
import { Option } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  buttonGroupFixtures,
  type ButtonGroupFixture,
  type BgNode,
} from '@/docs/components/pages/button-group/shared'
import * as Icon from '@/lib/icon'
import * as Button from '@/pleat/button'
import * as ButtonGroup from '@/pleat/button-group'
import * as DropdownMenu from '@/pleat/dropdown-menu'
import * as Input from '@/pleat/input'
import * as InputGroup from '@/pleat/input-group'
import * as Popover from '@/pleat/popover'
import * as Select from '@/pleat/select'
import * as Textarea from '@/pleat/textarea'
import * as Tooltip from '@/pleat/tooltip'
import type { ComponentLayoutStyle } from '@/pleat/contracts'
import { foundationTokens } from '../../../../pleat/foundations-tokens'
import { className } from '@/pleat/style'
import { tokens } from '../../../../pleat/tokens'

const styles = {
  stack: Style.make({
    gap: '2rem',
    alignItems: 'flex-start',
    display: 'flex',
    flexDirection: 'column',
  }),
  voiceButton: Style.make({
    borderRadius: 'calc(var(--radius) - 5px)',
    alignItems: 'center',
    color: tokens.mutedForeground,
    display: 'inline-flex',
    justifyContent: 'center',
    height: '1.5rem',
    width: '1.5rem',
  }),
  iconSm: Style.make({ fontSize: '0.875rem', lineHeight: '1.25rem' }),
  iconMd: Style.make({
    flexShrink: 0,
    pointerEvents: 'none',
    height: '1rem',
    width: '1rem',
  }),
  iconMdPlain: Style.make({ height: '1rem', width: '1rem' }),
  iconMdRtl: Style.make({
    flexShrink: 0,
    pointerEvents: 'none',
    transform: 'rotate(180deg)',
    height: '1rem',
    width: '1rem',
  }),
  joinedHFirst: Style.make({
    borderBottomLeftRadius: 'calc(var(--radius) - 2px)',
    borderBottomRightRadius: 0,
    borderTopLeftRadius: 'calc(var(--radius) - 2px)',
    borderTopRightRadius: 0,
  }),
  joinedHLast: Style.make({
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 'calc(var(--radius) - 2px)',
    borderLeftWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 'calc(var(--radius) - 2px)',
  }),
  joinedHMid: Style.make({ borderRadius: 0, borderLeftWidth: 0 }),
  joinedVFirst: Style.make({
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderTopLeftRadius: 'calc(var(--radius) - 2px)',
    borderTopRightRadius: 'calc(var(--radius) - 2px)',
  }),
  joinedVLast: Style.make({
    borderBottomLeftRadius: 'calc(var(--radius) - 2px)',
    borderBottomRightRadius: 'calc(var(--radius) - 2px)',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderTopWidth: 0,
  }),
  joinedVMid: Style.make({ borderRadius: 0, borderTopWidth: 0 }),
  joinedSingle: Style.make({ borderRadius: 'calc(var(--radius) - 2px)' }),
  inputFlex: Style.make({ flexBasis: '0%', flexGrow: '1', flexShrink: '1' }),
  hiddenSmFlex: Style.make({ display: 'none' }).pipe(
    Style.when(When.minWidth('40rem'), { display: 'flex' }),
  ),
  pillRadius: Style.make({
    '--radius': '9999rem',
    '--radius-md': 'calc(9999rem - 2px)',
  }),
  selectTrigger: Style.make({
    boxShadow: foundationTokens.shadowXs,
    display: 'flex',
    fontFamily:
      'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
    whiteSpace: 'nowrap',
    height: '2rem',
    minHeight: 0,
    width: 'fit-content',
  }),
  inputGroupInput: Style.make({ display: 'flex' }),
  inputGroupInputEnd: Style.make({ display: 'flex', paddingRight: '0.5rem' }),
  inputGroupAddon: Style.make({ order: 9999 }),
  groupHeight: Style.make({ height: '2.25rem' }),
  inputGroupAddonButton: Style.make({ order: 9999, marginRight: '-0.45rem' }),
  tooltipTrigger: Style.make({ color: tokens.mutedForeground }),
  popoverBody: Style.make({
    gap: '0.75rem',
    display: 'grid',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  }),
  popoverHead: Style.make({ gap: '0.25rem', display: 'grid' }),
  popoverTitle: Style.make({
    fontSize: '0.875rem',
    fontWeight: 500,
    lineHeight: '1.25rem',
  }),
  popoverCopy: Style.make({
    color: tokens.mutedForeground,
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  }),
  popoverFootnote: Style.make({
    color: tokens.mutedForeground,
    fontSize: '0.75rem',
    lineHeight: '1rem',
  }),
  menuIcon: Style.make({ fontSize: '1rem', lineHeight: '1.5rem' }),
}

type PreviewSnapshot = Readonly<{
  menu: DropdownMenu.Model
  label: Option.Option<string>
  query: string
  amount: string
  message: string
  task: string
  voiceEnabled: boolean
  select: Select.Model
  maybeCurrency: Option.Option<string>
  popover: Popover.Model
  tooltip: Tooltip.Model
}>

const CURRENCIES = [
  { value: '$', label: 'US Dollar' },
  { value: '€', label: 'Euro' },
  { value: '£', label: 'British Pound' },
]

const DEMO_ITEMS = [
  'mark-read',
  'archive',
  'snooze',
  'add-calendar',
  'add-list',
  'label-as',
  'trash',
]
const CONVERSATION_ITEMS = [
  'mute',
  'mark-read',
  'report',
  'block',
  'share',
  'delete',
]
const LABEL_VALUES = ['personal', 'work', 'other']

const demoLabels = (isRtl: boolean): Record<string, string> =>
  isRtl
    ? {
        'mark-read': 'وضع علامة كمقروء',
        archive: 'أرشفة',
        snooze: 'تأجيل',
        'add-calendar': 'إضافة إلى التقويم',
        'add-list': 'إضافة إلى القائمة',
        'label-as': 'تصنيف كـ...',
        trash: 'سلة المهملات',
        personal: 'شخصي',
        work: 'عمل',
        other: 'آخر',
      }
    : {
        'mark-read': 'Mark as Read',
        archive: 'Archive',
        snooze: 'Snooze',
        'add-calendar': 'Add to Calendar',
        'add-list': 'Add to List',
        'label-as': 'Label As...',
        trash: 'Trash',
        personal: 'Personal',
        work: 'Work',
        other: 'Other',
      }

const DEMO_ICONS: Record<string, string> = {
  'mark-read': 'mail-check',
  archive: 'archive',
  snooze: 'clock',
  'add-calendar': 'calendar-plus',
  'add-list': 'list-filter',
  'label-as': 'tag',
  trash: 'trash-2',
}
const CONVERSATION_ICONS: Record<string, string> = {
  mute: 'volume-off',
  'mark-read': 'check',
  report: 'triangle-alert',
  block: 'user-round-x',
  share: 'share',
  delete: 'trash',
}

const menuItemToConfig = <Msg>(
  model: PreviewSnapshot,
  menu: 'demo' | 'conversation',
  isRtl: boolean,
  h: HtmlBuilder<Msg>,
): ((item: string) => DropdownMenu.DropdownMenuItemConfig<string>) => {
  const labels = demoLabels(isRtl)
  return item => {
    if (menu === 'demo') {
      const icon = DEMO_ICONS[item]
      const base = {
        label: labels[item] ?? item,
        ...(icon === undefined
          ? {}
          : {
              icon: Icon.icon(icon, { class: className(styles.menuIcon) }, h),
            }),
        ...(item === 'snooze' || item === 'trash'
          ? { separatorBefore: true }
          : {}),
        ...(item === 'trash' ? { variant: 'destructive' as const } : {}),
      }
      if (item === 'label-as')
        return {
          ...base,
          submenu: {
            items: LABEL_VALUES,
            itemToConfig: sub => ({
              label: labels[sub] ?? sub,
              kind: 'radio' as const,
              isInset: true,
              isChecked: Option.contains(model.label, sub),
            }),
          },
        }
      return base
    }
    const icon = CONVERSATION_ICONS[item]
    return {
      label:
        (
          {
            mute: 'Mute Conversation',
            'mark-read': 'Mark as Read',
            report: 'Report Conversation',
            block: 'Block User',
            share: 'Share Conversation',
            delete: 'Delete Conversation',
          } as Record<string, string>
        )[item] ?? item,
      ...(icon === undefined
        ? {}
        : { icon: Icon.icon(icon, { class: className(styles.menuIcon) }, h) }),
      ...(item === 'delete'
        ? { variant: 'destructive' as const, separatorBefore: true }
        : {}),
    }
  }
}

const FIELD_TAG: Record<string, string> = {
  query: 'ChangedQuery',
  amount: 'ChangedAmount',
  message: 'ChangedMessage',
  task: 'ChangedTask',
}

const fixtureKey = (fixture: ButtonGroupFixture): string =>
  fixture.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')

type JoinPosition = 'first' | 'middle' | 'last'

type GroupContext = Readonly<{
  position?: JoinPosition | undefined
  orientation: 'horizontal' | 'vertical'
}>

const joinStyle = (ctx: GroupContext): ComponentLayoutStyle => {
  if (ctx.position === undefined)
    return styles.joinedSingle as ComponentLayoutStyle
  const map =
    ctx.orientation === 'vertical'
      ? {
          first: styles.joinedVFirst,
          middle: styles.joinedVMid,
          last: styles.joinedVLast,
        }
      : {
          first: styles.joinedHFirst,
          middle: styles.joinedHMid,
          last: styles.joinedHLast,
        }
  return map[ctx.position] as ComponentLayoutStyle
}

const childContext = (
  index: number,
  count: number,
  orientation: 'horizontal' | 'vertical',
): GroupContext => ({
  position:
    count === 1
      ? undefined
      : index === 0
        ? 'first'
        : index === count - 1
          ? 'last'
          : 'middle',
  orientation,
})

const nodeView = <Msg>(
  model: PreviewSnapshot,
  fixture: ButtonGroupFixture,
  node: BgNode,
  ctx: GroupContext | undefined,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const isRtl = fixture.direction === 'rtl'
  switch (node.t) {
    case 'button':
      return Button.button(
        {
          ...(node.variant === undefined ? {} : { variant: node.variant }),
          ...(node.size === undefined ? {} : { size: node.size }),
          ...(node.ariaLabel === undefined
            ? {}
            : { ariaLabel: node.ariaLabel }),
          ...(ctx === undefined ? {} : { layoutStyle: joinStyle(ctx) }),
          children: [
            ...(node.icon === undefined
              ? []
              : [
                  Icon.icon(
                    node.icon,
                    {
                      class: className(
                        fixture.direction === 'rtl' && node.rtlRotate === true
                          ? styles.iconMdRtl
                          : styles.iconMd,
                      ),
                    },
                    h,
                  ),
                ]),
            ...(node.label === undefined ? [] : [node.label]),
          ],
        },
        h,
      )
    case 'separator':
      return ButtonGroup.buttonGroupSeparator({}, h)
    case 'input':
      return Input.input(
        {
          id: `docs-button-group-${fixtureKey(fixture)}-${node.field}`,
          value: model[node.field],
          onInput: value =>
            onMessageJson(
              JSON.stringify({ _tag: FIELD_TAG[node.field], value }),
            ),
          placeholder: node.placeholder,
          layoutStyle: (ctx === undefined
            ? styles.groupHeight
            : [
                joinStyle(ctx),
                styles.inputFlex,
                styles.groupHeight,
              ]) as ComponentLayoutStyle,
        },
        h,
      )
    case 'inputGroup':
      return InputGroup.inputGroup(
        {
          layoutStyle: (ctx === undefined
            ? styles.groupHeight
            : [joinStyle(ctx), styles.groupHeight]) as ComponentLayoutStyle,
          children: [
            InputGroup.inputGroupInput(
              {
                id: `docs-button-group-${fixtureKey(fixture)}-message`,
                value: model.message,
                onInput: value =>
                  onMessageJson(
                    JSON.stringify({ _tag: 'ChangedMessage', value }),
                  ),
                placeholder: node.voiceToggle
                  ? model.voiceEnabled
                    ? 'Record and send audio...'
                    : 'Send a message...'
                  : 'Send a message...',
                ...(node.voiceToggle ? { isDisabled: model.voiceEnabled } : {}),
                ariaLabel: 'Message',
                layoutStyle: (node.voiceToggle
                  ? styles.inputGroupInputEnd
                  : styles.inputGroupInput) as ComponentLayoutStyle,
              },
              h,
            ),
            node.voiceToggle
              ? InputGroup.inputGroupAddon(
                  {
                    align: 'inline-end',
                    layoutStyle:
                      styles.inputGroupAddonButton as ComponentLayoutStyle,
                    children: [
                      h.button(
                        [
                          h.Type('button'),
                          h.AriaPressed(model.voiceEnabled ? 'true' : 'false'),
                          h.AriaLabel('Voice Mode'),
                          h.DataAttribute('active', String(model.voiceEnabled)),
                          h.OnClick(
                            onMessageJson(
                              JSON.stringify({ _tag: 'ToggledVoice' }),
                            ),
                          ),
                          h.Class(className(reset.button, styles.voiceButton)),
                        ],
                        [
                          Icon.icon(
                            'audio-lines',
                            { class: className(styles.iconSm) },
                            h,
                          ),
                        ],
                      ),
                    ],
                  },
                  h,
                )
              : Tooltip.tooltip(
                  {
                    model: model.tooltip,
                    toParentMessage: message =>
                      onMessageJson(
                        JSON.stringify({ _tag: 'GotTooltipMessage', message }),
                      ),
                    triggerLayoutStyle:
                      styles.tooltipTrigger as ComponentLayoutStyle,
                    trigger: InputGroup.inputGroupAddon(
                      {
                        align: 'inline-end',
                        layoutStyle:
                          styles.inputGroupAddon as ComponentLayoutStyle,
                        children: [
                          Icon.icon(
                            'audio-lines',
                            { class: className(styles.iconSm) },
                            h,
                          ),
                        ],
                      },
                      h,
                    ),
                    content: 'Voice Mode',
                    ariaLabel: 'Voice Mode',
                  },
                  h,
                ),
          ],
        },
        h,
      )
    case 'select':
      return Select.select(
        {
          model: model.select,
          maybeSelectedValue: model.maybeCurrency,
          toParentMessage: message =>
            onMessageJson(
              JSON.stringify({ _tag: 'GotSelectMessage', message }),
            ),
          items: CURRENCIES,
          itemToValue: item => item.value,
          itemToLabel: item => `${item.value} ${item.label}`,
          ariaLabel: 'Currency',
          triggerLayoutStyle: styles.selectTrigger as ComponentLayoutStyle,
        },
        h,
      )
    case 'dropdown':
      return DropdownMenu.dropdownMenu(
        {
          model: model.menu,
          toParentMessage: message =>
            onMessageJson(JSON.stringify({ _tag: 'GotMenuMessage', message })),
          trigger:
            node.menu === 'demo'
              ? Icon.icon(
                  'ellipsis',
                  {
                    ariaLabel: isRtl ? 'مزيد من الخيارات' : 'More Options',
                    class: className(styles.iconMdPlain),
                  },
                  h,
                )
              : Icon.icon(
                  'chevron-down',
                  {
                    ariaLabel: 'Options',
                    class: className(styles.iconMdPlain),
                  },
                  h,
                ),
          triggerButtonVariant: 'outline',
          triggerButtonSize: node.menu === 'demo' ? 'icon' : 'default',
          items: node.menu === 'demo' ? DEMO_ITEMS : CONVERSATION_ITEMS,
          itemToConfig: menuItemToConfig(model, node.menu, isRtl, h),
          align: 'end',
          ...(isRtl ? { direction: 'rtl' as const } : {}),
        },
        h,
      )
    case 'popover':
      return Popover.popover(
        {
          model: model.popover,
          toParentMessage: message =>
            onMessageJson(
              JSON.stringify({ _tag: 'GotPopoverMessage', message }),
            ),
          trigger: Icon.icon(
            'chevron-down',
            { ariaLabel: 'Open Popover', class: className(styles.iconMdPlain) },
            h,
          ),
          triggerButtonVariant: 'outline',
          triggerButtonSize: 'icon',
          align: 'end',
          content: h.div(
            [h.Class(className(styles.popoverBody))],
            [
              h.div(
                [h.Class(className(styles.popoverHead))],
                [
                  h.p(
                    [h.Class(className(reset.text, styles.popoverTitle))],
                    ['Start a new task with Copilot'],
                  ),
                  h.p(
                    [h.Class(className(reset.text, styles.popoverCopy))],
                    ['Describe your task in natural language.'],
                  ),
                ],
              ),
              Textarea.textarea(
                {
                  id: `docs-button-group-${fixtureKey(fixture)}-task`,
                  value: model.task,
                  onInput: value =>
                    onMessageJson(
                      JSON.stringify({ _tag: 'ChangedTask', value }),
                    ),
                  placeholder: 'I need to...',
                  resize: 'none',
                },
                h,
              ),
              h.p(
                [h.Class(className(reset.text, styles.popoverFootnote))],
                ['Copilot will open a pull request for review.'],
              ),
            ],
          ),
        },
        h,
      )
    case 'group':
      return ButtonGroup.buttonGroup(
        {
          ...(node.rtlHidden === true
            ? { layoutStyle: styles.hiddenSmFlex as ComponentLayoutStyle }
            : {}),
          children: node.children.map((child, index) =>
            nodeView(
              model,
              fixture,
              child,
              childContext(index, node.children.length, 'horizontal'),
              onMessageJson,
              h,
            ),
          ),
        },
        h,
      )
    case 'column':
      return h.div(
        [h.Class(className(styles.stack))],
        node.children.map(child =>
          nodeView(model, fixture, child, undefined, onMessageJson, h),
        ),
      )
  }
}

const fixtureView = <Msg>(
  fixture: ButtonGroupFixture,
  model: PreviewSnapshot,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const ungrouped =
    fixture.nodes.length === 1 && fixture.nodes[0]?.t === 'column'
  const [firstNode] = fixture.nodes
  const group =
    ungrouped && firstNode !== undefined
      ? nodeView(model, fixture, firstNode, undefined, onMessageJson, h)
      : ButtonGroup.buttonGroup(
          {
            ...(fixture.orientation === 'vertical'
              ? { orientation: 'vertical' as const }
              : {}),
            ...(fixture.ariaLabel === undefined
              ? {}
              : { ariaLabel: fixture.ariaLabel }),
            ...(fixture.rounded === true
              ? { layoutStyle: styles.pillRadius as ComponentLayoutStyle }
              : {}),
            children: fixture.nodes.map((node, index) =>
              nodeView(
                model,
                fixture,
                node,
                childContext(
                  index,
                  fixture.nodes.length,
                  fixture.orientation === 'vertical'
                    ? 'vertical'
                    : 'horizontal',
                ),
                onMessageJson,
                h,
              ),
            ),
          },
          h,
        )
  return fixture.direction === 'rtl' ? h.div([h.Dir('rtl')], [group]) : group
}

export const buttonGroupPleatPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) =>
  fixtureView(
    buttonGroupFixtures[exampleIndex] ?? buttonGroupFixtures[0]!,
    model as PreviewSnapshot,
    onMessageJson,
    h,
  )
