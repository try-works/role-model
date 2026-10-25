import { Option, Schema as S } from 'effect'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  buttonGroupFixtures,
  type ButtonGroupFixture,
  type BgNode,
} from '@/docs/components/pages/button-group/shared'
import * as Button from '@/ui/button'
import * as ButtonGroup from '@/ui/button-group'
import * as DropdownMenu from '@/ui/dropdown-menu'
import * as Icon from '@/lib/icon'
import * as Input from '@/ui/input'
import * as InputGroup from '@/ui/input-group'
import * as Popover from '@/ui/popover'
import * as Select from '@/ui/select'
import * as Textarea from '@/ui/textarea'
import * as Tooltip from '@/ui/tooltip'

const PreviewMessage = defineMessageUnion({
  GotMenuMessage: { message: DropdownMenu.Message },
  GotSelectMessage: { message: Select.Message },
  GotPopoverMessage: { message: Popover.Message },
  GotTooltipMessage: { message: Tooltip.Message },
  ChangedQuery: { value: S.String },
  ChangedAmount: { value: S.String },
  ChangedMessage: { value: S.String },
  ChangedTask: { value: S.String },
  ToggledVoice: {},
})
type PreviewMessage = typeof PreviewMessage.Type

const PreviewModel = S.Struct({
  _docsPage: S.Literal('button-group'),
  menu: DropdownMenu.Model,
  label: S.Option(S.String),
  query: S.String,
  amount: S.String,
  message: S.String,
  task: S.String,
  voiceEnabled: S.Boolean,
  select: Select.Model,
  maybeCurrency: S.Option(S.String),
  popover: Popover.Model,
  tooltip: Tooltip.Model,
})
type PreviewModel = typeof PreviewModel.Type

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
] as const
const CONVERSATION_ITEMS = [
  'mute',
  'mark-read',
  'report',
  'block',
  'share',
  'delete',
] as const
const LABEL_VALUES = ['personal', 'work', 'other'] as const

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

const menuItemToConfig = (
  model: PreviewModel,
  menu: 'demo' | 'conversation',
  isRtl: boolean,
  h: HtmlBuilder<PreviewMessage>,
): ((item: string) => DropdownMenu.DropdownMenuItemConfig<string>) => {
  const labels = demoLabels(isRtl)
  return item => {
    if (menu === 'demo') {
      const icon = DEMO_ICONS[item]
      const base = {
        label: labels[item] ?? item,
        ...(icon === undefined
          ? {}
          : { icon: Icon.icon(icon, { class: 'size-4' }, h) }),
        ...(item === 'snooze' || item === 'trash'
          ? { separatorBefore: true }
          : {}),
        ...(item === 'trash' ? { variant: 'destructive' as const } : {}),
      }
      if (item === 'label-as')
        return {
          ...base,
          submenu: {
            items: [...LABEL_VALUES],
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
        : { icon: Icon.icon(icon, { class: 'size-4' }, h) }),
      ...(item === 'delete'
        ? { variant: 'destructive' as const, separatorBefore: true }
        : {}),
    }
  }
}

const FIELD_MESSAGE: Record<
  'query' | 'amount' | 'message' | 'task',
  (value: string) => PreviewMessage
> = {
  query: value => PreviewMessage.ChangedQuery({ value }),
  amount: value => PreviewMessage.ChangedAmount({ value }),
  message: value => PreviewMessage.ChangedMessage({ value }),
  task: value => PreviewMessage.ChangedTask({ value }),
}

const fixtureKey = (fixture: ButtonGroupFixture): string =>
  fixture.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')

const nodeView = (
  model: PreviewModel,
  fixture: ButtonGroupFixture,
  node: BgNode,
  h: HtmlBuilder<PreviewMessage>,
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
          children: [
            ...(node.icon === undefined
              ? []
              : [
                  Icon.icon(
                    node.icon,
                    node.rtlRotate === true ? { class: 'rtl:rotate-180' } : {},
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
          onInput: value => FIELD_MESSAGE[node.field](value),
          placeholder: node.placeholder,
          // grouped controls sit next to h-9 buttons
          class: 'h-9',
        },
        h,
      )
    case 'inputGroup':
      return InputGroup.inputGroup(
        {
          // grouped controls sit next to h-9 buttons
          class: 'h-9',
          children: [
            InputGroup.inputGroupInput(
              {
                id: `docs-button-group-${fixtureKey(fixture)}-message`,
                value: model.message,
                onInput: value => PreviewMessage.ChangedMessage({ value }),
                placeholder: node.voiceToggle
                  ? model.voiceEnabled
                    ? 'Record and send audio...'
                    : 'Send a message...'
                  : 'Send a message...',
                ...(node.voiceToggle ? { isDisabled: model.voiceEnabled } : {}),
                ariaLabel: 'Message',
              },
              h,
            ),
            node.voiceToggle
              ? InputGroup.inputGroupAddon(
                  {
                    align: 'inline-end',
                    children: [
                      h.button(
                        [
                          h.Type('button'),
                          h.AriaPressed(model.voiceEnabled ? 'true' : 'false'),
                          h.AriaLabel('Voice Mode'),
                          h.DataAttribute('active', String(model.voiceEnabled)),
                          h.OnClick(PreviewMessage.ToggledVoice()),
                          h.Class(
                            'inline-flex size-6 items-center justify-center rounded-[calc(var(--radius)-5px)] text-muted-foreground data-[active=true]:bg-orange-100 data-[active=true]:text-orange-700 dark:data-[active=true]:bg-orange-800 dark:data-[active=true]:text-orange-100',
                          ),
                        ],
                        [Icon.icon('audio-lines', { class: 'size-3.5' }, h)],
                      ),
                    ],
                  },
                  h,
                )
              : Tooltip.tooltip(
                  {
                    model: model.tooltip,
                    toParentMessage: message =>
                      PreviewMessage.GotTooltipMessage({ message }),
                    trigger: InputGroup.inputGroupAddon(
                      {
                        align: 'inline-end',
                        children: [
                          Icon.icon('audio-lines', { class: 'size-3.5' }, h),
                        ],
                      },
                      h,
                    ),
                    triggerClass: 'text-muted-foreground',
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
            PreviewMessage.GotSelectMessage({ message }),
          items: CURRENCIES,
          itemToValue: item => item.value,
          itemToLabel: item => `${item.value} ${item.label}`,
          ariaLabel: 'Currency',
          triggerClass: 'font-mono',
        },
        h,
      )
    case 'dropdown':
      return DropdownMenu.dropdownMenu(
        {
          model: model.menu,
          toParentMessage: message =>
            PreviewMessage.GotMenuMessage({ message }),
          trigger:
            node.menu === 'demo'
              ? Icon.icon(
                  'ellipsis',
                  {
                    ariaLabel: isRtl ? 'مزيد من الخيارات' : 'More Options',
                  },
                  h,
                )
              : Icon.icon('chevron-down', { ariaLabel: 'Options' }, h),
          triggerClass:
            node.menu === 'demo'
              ? 'inline-flex size-9 items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground'
              : 'inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 hover:bg-accent hover:text-accent-foreground',
          items:
            node.menu === 'demo' ? [...DEMO_ITEMS] : [...CONVERSATION_ITEMS],
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
            PreviewMessage.GotPopoverMessage({ message }),
          trigger: Icon.icon('chevron-down', { ariaLabel: 'Open Popover' }, h),
          triggerClass:
            'inline-flex size-9 items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground',
          align: 'end',
          content: h.div(
            [h.Class('grid gap-3 text-sm')],
            [
              h.div(
                [h.Class('grid gap-1')],
                [
                  h.p(
                    [h.Class('text-sm font-medium')],
                    ['Start a new task with Copilot'],
                  ),
                  h.p(
                    [h.Class('text-sm text-muted-foreground')],
                    ['Describe your task in natural language.'],
                  ),
                ],
              ),
              Textarea.textarea(
                {
                  id: `docs-button-group-${fixtureKey(fixture)}-task`,
                  value: model.task,
                  onInput: value => PreviewMessage.ChangedTask({ value }),
                  placeholder: 'I need to...',
                  class: 'resize-none',
                },
                h,
              ),
              h.p(
                [h.Class('text-xs text-muted-foreground')],
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
          children: node.children.map(child =>
            nodeView(model, fixture, child, h),
          ),
          ...(node.rtlHidden === true ? { class: 'hidden sm:flex' } : {}),
        },
        h,
      )
    case 'column':
      return h.div(
        [h.Class('flex flex-col items-start gap-8')],
        node.children.map(child => nodeView(model, fixture, child, h)),
      )
  }
}

const fixtureView = (
  fixture: ButtonGroupFixture,
  model: PreviewModel,
  h: HtmlBuilder<PreviewMessage>,
): Html => {
  const ungrouped =
    fixture.nodes.length === 1 && fixture.nodes[0]?.t === 'column'
  const [firstNode] = fixture.nodes
  const group =
    ungrouped && firstNode !== undefined
      ? nodeView(model, fixture, firstNode, h)
      : ButtonGroup.buttonGroup(
          {
            ...(fixture.orientation === 'vertical'
              ? { orientation: 'vertical' as const }
              : {}),
            ...(fixture.ariaLabel === undefined
              ? {}
              : { ariaLabel: fixture.ariaLabel }),
            ...(fixture.rounded === true
              ? { class: '[--radius:9999rem]' }
              : {}),
            children: fixture.nodes.map(node =>
              nodeView(model, fixture, node, h),
            ),
          },
          h,
        )
  return fixture.direction === 'rtl' ? h.div([h.Dir('rtl')], [group]) : group
}

export const buttonGroupTailwindPreviewProgram = definePreviewProgram<
  PreviewModel,
  PreviewMessage
>({
  Model: PreviewModel,
  Message: PreviewMessage,
  init: index => ({
    _docsPage: 'button-group',
    menu: DropdownMenu.init({
      id: `docs-button-group-menu-${String(index)}`,
      isAnimated: false,
    }),
    label: Option.some('personal'),
    query: '',
    amount: '',
    message: '',
    task: '',
    voiceEnabled: false,
    select: Select.init({
      id: `docs-button-group-select-${String(index)}`,
      isAnimated: true,
    }),
    maybeCurrency: Option.some('$'),
    popover: Popover.init({ id: `docs-button-group-popover-${String(index)}` }),
    tooltip: Tooltip.init({ id: `docs-button-group-tooltip-${String(index)}` }),
  }),
  update: (model, message) => {
    switch (message._tag) {
      case 'GotMenuMessage': {
        const result = DropdownMenu.update(model.menu, message.message)
        const maybeSelection = Option.fromNullishOr(result.outMessage)
        return {
          model: {
            ...model,
            menu: result.model,
            label: Option.match(maybeSelection, {
              onNone: () => model.label,
              onSome: selection => Option.some(selection.value),
            }),
          },
          commands: Command.mapMessages(result.commands ?? [], next =>
            PreviewMessage.GotMenuMessage({ message: next }),
          ),
        }
      }
      case 'GotSelectMessage': {
        const result = Select.update(model.select, message.message)
        const maybeSelection = Option.fromNullishOr(result.outMessage)
        return {
          model: {
            ...model,
            select: result.model,
            maybeCurrency: Option.match(maybeSelection, {
              onNone: () => model.maybeCurrency,
              onSome: selection =>
                selection._tag === 'Selected'
                  ? Option.some(selection.value)
                  : Option.none<string>(),
            }),
          },
          commands: Command.mapMessages(result.commands ?? [], next =>
            PreviewMessage.GotSelectMessage({ message: next }),
          ),
        }
      }
      case 'GotPopoverMessage': {
        const result = Popover.update(model.popover, message.message)
        return {
          model: { ...model, popover: result.model },
          commands: Command.mapMessages(result.commands ?? [], next =>
            PreviewMessage.GotPopoverMessage({ message: next }),
          ),
        }
      }
      case 'GotTooltipMessage': {
        const result = Tooltip.update(model.tooltip, message.message)
        return {
          model: { ...model, tooltip: result.model },
          commands: Command.mapMessages(result.commands, next =>
            PreviewMessage.GotTooltipMessage({ message: next }),
          ),
        }
      }
      case 'ChangedQuery':
        return { model: { ...model, query: message.value } }
      case 'ChangedAmount':
        return { model: { ...model, amount: message.value } }
      case 'ChangedMessage':
        return { model: { ...model, message: message.value } }
      case 'ChangedTask':
        return { model: { ...model, task: message.value } }
      case 'ToggledVoice':
        return { model: { ...model, voiceEnabled: !model.voiceEnabled } }
    }
  },
  view: (index, model, h) =>
    fixtureView(
      buttonGroupFixtures[index] ?? buttonGroupFixtures[0]!,
      model,
      h,
    ),
})
