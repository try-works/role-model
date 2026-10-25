import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import {
  foldkitApplication,
  staticComponentApplication,
} from '@/docs/components/pages/authored-page'

// ---------- node model ----------

type BgButton = Readonly<{
  t: 'button'
  label?: string
  icon?: string
  size?: 'sm' | 'lg' | 'icon' | 'icon-sm' | 'icon-lg'
  variant?: 'outline' | 'secondary'
  ariaLabel?: string
  rtlRotate?: boolean
}>
type BgGroup = Readonly<{
  t: 'group'
  children: ReadonlyArray<BgNode>
  rtlHidden?: boolean
}>
type BgColumn = Readonly<{
  t: 'column'
  children: ReadonlyArray<BgNode>
}>
type BgInput = Readonly<{
  t: 'input'
  field: 'query' | 'amount' | 'message'
  placeholder: string
  isDisabled?: boolean
}>
export type BgNode =
  | BgButton
  | BgGroup
  | BgColumn
  | BgInput
  | Readonly<{ t: 'separator' }>
  | Readonly<{ t: 'inputGroup'; voiceToggle: boolean }>
  | Readonly<{ t: 'select' }>
  | Readonly<{ t: 'dropdown'; menu: 'demo' | 'conversation' }>
  | Readonly<{ t: 'popover' }>

export type ButtonGroupFixture = Readonly<{
  kind:
    | 'demo'
    | 'orientation'
    | 'size'
    | 'nested'
    | 'separator'
    | 'split'
    | 'input'
    | 'inputGroup'
    | 'dropdown'
    | 'select'
    | 'popover'
    | 'rtl'
  title: string
  description: string
  heroOnly?: boolean
  orientation?: 'vertical'
  ariaLabel?: string
  direction?: 'rtl'
  rounded?: boolean
  nodes: ReadonlyArray<BgNode>
}>

// ---------- fixture data (mirrors shadcn-ui/ui v4 radix examples) ----------

const DEMO_MENU_LABELS = [
  'Mark as Read',
  'Archive',
  'Snooze',
  'Add to Calendar',
  'Add to List',
  'Label As...',
  'Trash',
] as const
const DEMO_MENU_AR_LABELS = [
  'وضع علامة كمقروء',
  'أرشفة',
  'تأجيل',
  'إضافة إلى التقويم',
  'إضافة إلى القائمة',
  'تصنيف كـ...',
  'سلة المهملات',
] as const
const CONVERSATION_MENU_LABELS = [
  'Mute Conversation',
  'Mark as Read',
  'Report Conversation',
  'Block User',
  'Share Conversation',
  'Delete Conversation',
] as const

export const buttonGroupFixtures: Readonly<Array<ButtonGroupFixture>> = [
  {
    kind: 'demo',
    title: 'Demo',
    heroOnly: true,
    description:
      'Joined groups of actions with a dropdown menu that has groups, a submenu, and a destructive item.',
    nodes: [
      {
        t: 'group',
        rtlHidden: true,
        children: [
          {
            t: 'button',
            icon: 'arrow-left',
            size: 'icon',
            variant: 'outline',
            ariaLabel: 'Go Back',
            rtlRotate: true,
          },
        ],
      },
      {
        t: 'group',
        children: [
          { t: 'button', label: 'Archive', variant: 'outline' },
          { t: 'button', label: 'Report', variant: 'outline' },
        ],
      },
      {
        t: 'group',
        children: [
          { t: 'button', label: 'Snooze', variant: 'outline' },
          { t: 'dropdown', menu: 'demo' },
        ],
      },
    ],
  },
  {
    kind: 'orientation',
    title: 'Orientation',
    description:
      'Set orientation to vertical to stack buttons with shared borders.',
    orientation: 'vertical',
    ariaLabel: 'Media controls',
    nodes: [
      {
        t: 'button',
        icon: 'plus',
        ariaLabel: 'Add',
        size: 'icon',
        variant: 'outline',
      },
      {
        t: 'button',
        icon: 'minus',
        ariaLabel: 'Remove',
        size: 'icon',
        variant: 'outline',
      },
    ],
  },
  {
    kind: 'size',
    title: 'Size',
    description: 'Match the buttons inside the group to a shared size.',
    nodes: [
      {
        t: 'column',
        children: [
          {
            t: 'group',
            children: [
              { t: 'button', label: 'Small', variant: 'outline', size: 'sm' },
              { t: 'button', label: 'Button', variant: 'outline', size: 'sm' },
              { t: 'button', label: 'Group', variant: 'outline', size: 'sm' },
              {
                t: 'button',
                icon: 'plus',
                ariaLabel: 'Add',
                variant: 'outline',
                size: 'icon-sm',
              },
            ],
          },
          {
            t: 'group',
            children: [
              { t: 'button', label: 'Default', variant: 'outline' },
              { t: 'button', label: 'Button', variant: 'outline' },
              { t: 'button', label: 'Group', variant: 'outline' },
              {
                t: 'button',
                icon: 'plus',
                ariaLabel: 'Add',
                variant: 'outline',
                size: 'icon',
              },
            ],
          },
          {
            t: 'group',
            children: [
              { t: 'button', label: 'Large', variant: 'outline', size: 'lg' },
              { t: 'button', label: 'Button', variant: 'outline', size: 'lg' },
              { t: 'button', label: 'Group', variant: 'outline', size: 'lg' },
              {
                t: 'button',
                icon: 'plus',
                ariaLabel: 'Add',
                variant: 'outline',
                size: 'icon-lg',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    kind: 'nested',
    title: 'Nested',
    description:
      'Nest ButtonGroup components to create button groups with spacing.',
    nodes: [
      {
        t: 'group',
        children: [
          {
            t: 'button',
            icon: 'plus',
            ariaLabel: 'Add',
            size: 'icon',
            variant: 'outline',
          },
        ],
      },
      {
        t: 'group',
        children: [{ t: 'inputGroup', voiceToggle: false }],
      },
    ],
  },
  {
    kind: 'separator',
    title: 'Separator',
    description:
      'The ButtonGroupSeparator component visually divides buttons within a group.',
    nodes: [
      { t: 'button', label: 'Copy', variant: 'secondary', size: 'sm' },
      { t: 'separator' },
      { t: 'button', label: 'Paste', variant: 'secondary', size: 'sm' },
    ],
  },
  {
    kind: 'split',
    title: 'Split',
    description:
      'Use ButtonGroupSeparator to create a split button with an action and a dropdown.',
    nodes: [
      { t: 'button', label: 'Button', variant: 'secondary' },
      { t: 'separator' },
      {
        t: 'button',
        icon: 'plus',
        ariaLabel: 'Add',
        variant: 'secondary',
        size: 'icon',
      },
    ],
  },
  {
    kind: 'input',
    title: 'Input',
    description: 'Group an input field with a button.',
    nodes: [
      { t: 'input', field: 'query', placeholder: 'Search...' },
      { t: 'button', icon: 'search', variant: 'outline', ariaLabel: 'Search' },
    ],
  },
  {
    kind: 'inputGroup',
    title: 'Input Group',
    description:
      'Wrap an InputGroup component to build complex search layouts.',
    rounded: true,
    nodes: [
      {
        t: 'group',
        children: [
          {
            t: 'button',
            icon: 'plus',
            ariaLabel: 'Add',
            size: 'icon',
            variant: 'outline',
          },
        ],
      },
      {
        t: 'group',
        children: [{ t: 'inputGroup', voiceToggle: true }],
      },
    ],
  },
  {
    kind: 'dropdown',
    title: 'Dropdown Menu',
    description: 'Create a split button group with a DropdownMenu component.',
    nodes: [
      { t: 'button', label: 'Follow', variant: 'outline' },
      { t: 'dropdown', menu: 'conversation' },
    ],
  },
  {
    kind: 'select',
    title: 'Select',
    description: 'Group a select input with a button.',
    nodes: [
      {
        t: 'group',
        children: [
          { t: 'select' },
          { t: 'input', field: 'amount', placeholder: '10.00' },
        ],
      },
      {
        t: 'group',
        children: [
          {
            t: 'button',
            icon: 'arrow-right',
            variant: 'outline',
            size: 'icon',
            ariaLabel: 'Send',
          },
        ],
      },
    ],
  },
  {
    kind: 'popover',
    title: 'Popover',
    description:
      'Use a popover to show more options or a small form inside the group.',
    nodes: [
      { t: 'button', label: 'Copilot', icon: 'bot', variant: 'outline' },
      { t: 'popover' },
    ],
  },
  {
    kind: 'rtl',
    title: 'RTL',
    description:
      'Direction mirroring applies to the group order, icons, and nested menus.',
    direction: 'rtl',
    nodes: [
      {
        t: 'group',
        rtlHidden: true,
        children: [
          {
            t: 'button',
            icon: 'arrow-left',
            size: 'icon',
            variant: 'outline',
            ariaLabel: 'العودة',
            rtlRotate: true,
          },
        ],
      },
      {
        t: 'group',
        children: [
          { t: 'button', label: 'أرشفة', variant: 'outline' },
          { t: 'button', label: 'تقرير', variant: 'outline' },
        ],
      },
      {
        t: 'group',
        children: [
          { t: 'button', label: 'تأجيل', variant: 'outline' },
          { t: 'dropdown', menu: 'demo' },
        ],
      },
    ],
  },
]

// ---------- capability helpers ----------

const nodeNeeds = (
  nodes: ReadonlyArray<BgNode>,
): Readonly<{
  menu?: 'demo' | 'conversation'
  inputs: Array<InputField>
  groupedInput: boolean
  select: boolean
  popover: boolean
  tooltip: boolean
  voice: boolean
  icons: boolean
}> => {
  const needs: {
    menu?: 'demo' | 'conversation'
    inputs: Array<InputField>
    groupedInput: boolean
    select: boolean
    popover: boolean
    tooltip: boolean
    voice: boolean
    icons: boolean
  } = {
    inputs: [],
    groupedInput: false,
    select: false,
    popover: false,
    tooltip: false,
    voice: false,
    icons: false,
  }
  const visit = (node: BgNode): void => {
    switch (node.t) {
      case 'button':
        if (node.icon !== undefined) needs.icons = true
        return
      case 'group':
      case 'column':
        node.children.forEach(visit)
        return
      case 'separator':
        return
      case 'input':
        needs.inputs.push(node.field)
        needs.groupedInput = true
        return
      case 'inputGroup':
        needs.inputs.push('message')
        needs.groupedInput = true
        needs.tooltip = true
        needs.icons = true
        needs.voice = needs.voice || node.voiceToggle
        return
      case 'select':
        needs.select = true
        return
      case 'dropdown':
        needs.menu = node.menu
        needs.icons = true
        return
      case 'popover':
        needs.popover = true
        needs.inputs.push('task')
        needs.icons = true
        return
    }
  }
  nodes.forEach(visit)
  return needs
}

// ---------- emitted source ----------

const esc = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")

const CURRENCIES = [
  { value: '$', label: 'US Dollar' },
  { value: '€', label: 'Euro' },
  { value: '£', label: 'British Pound' },
]

type InputField = 'query' | 'amount' | 'message' | 'task'
const FIELD_MESSAGE: Record<InputField, string> = {
  query: 'ChangedQuery',
  amount: 'ChangedAmount',
  message: 'ChangedMessage',
  task: 'ChangedTask',
}

const itemToConfigBody = (
  menu: 'demo' | 'conversation',
  fixture: ButtonGroupFixture,
): string => {
  const isRtl = fixture.direction === 'rtl'
  if (menu === 'demo') {
    const labels = isRtl ? DEMO_MENU_AR_LABELS : DEMO_MENU_LABELS
    const [markRead, archive, snooze, addCalendar, addList, labelAs, trash] =
      labels
    const [personal, work, other] = isRtl
      ? (['شخصي', 'عمل', 'آخر'] as const)
      : (['Personal', 'Work', 'Other'] as const)
    return `    const label = ({
      'mark-read': '${esc(markRead ?? '')}',
      archive: '${esc(archive ?? '')}',
      snooze: '${esc(snooze ?? '')}',
      'add-calendar': '${esc(addCalendar ?? '')}',
      'add-list': '${esc(addList ?? '')}',
      'label-as': '${esc(labelAs ?? '')}',
      trash: '${esc(trash ?? '')}',
      personal: '${esc(personal ?? '')}',
      work: '${esc(work ?? '')}',
      other: '${esc(other ?? '')}',
    } as Record<string, string>)[item];
    if (item === 'label-as')
      return {
        label: '${esc(labelAs ?? 'Label As...')}',
        icon: Icon.icon('tag', { class: 'size-4' }, h),
        submenu: {
          items: ['personal', 'work', 'other'],
          itemToConfig: sub => ({
            label: ({
              personal: '${esc(personal ?? '')}',
              work: '${esc(work ?? '')}',
              other: '${esc(other ?? '')}',
            } as Record<string, string>)[sub] ?? sub,
            kind: 'radio' as const,
            isInset: true,
            isChecked: Option.contains(model.label, sub),
          }),
        },
      };
    const icons = ({
      'mark-read': 'mail-check',
      archive: 'archive',
      snooze: 'clock',
      'add-calendar': 'calendar-plus',
      'add-list': 'list-filter',
      trash: 'trash-2',
    } as Record<string, string>)[item];
    return {
      label: label ?? item,
      ...(icons === undefined
        ? {}
        : { icon: Icon.icon(icons, { class: 'size-4' }, h) }),
      ...(item === 'snooze' || item === 'trash'
        ? { separatorBefore: true }
        : {}),
      ...(item === 'trash' ? { variant: 'destructive' as const } : {}),
    }`
  }
  return `    const label = ({
      mute: 'Mute Conversation',
      'mark-read': 'Mark as Read',
      report: 'Report Conversation',
      block: 'Block User',
      share: 'Share Conversation',
      delete: 'Delete Conversation',
    } as Record<string, string>)[item];
    const icons = ({
      mute: 'volume-off',
      'mark-read': 'check',
      report: 'triangle-alert',
      block: 'user-round-x',
      share: 'share',
      delete: 'trash',
    } as Record<string, string>)[item];
    return {
      label: label ?? item,
      ...(icons === undefined
        ? {}
        : { icon: Icon.icon(icons, { class: 'size-4' }, h) }),
      ...(item === 'delete'
        ? { variant: 'destructive' as const, separatorBefore: true }
        : {}),
    }`
}

const itemsSource = (menu: 'demo' | 'conversation'): string =>
  menu === 'demo'
    ? `[
  'mark-read',
  'archive',
  'snooze',
  'add-calendar',
  'add-list',
  'label-as',
  'trash',
]`
    : `['mute', 'mark-read', 'report', 'block', 'share', 'delete']`

const buttonSource = (node: BgButton, isRtl: boolean): string => {
  const iconClass =
    node.rtlRotate === true ? `{ class: 'rtl:rotate-180' }` : '{}'
  const children: Array<string> = []
  if (node.icon !== undefined)
    children.push(`Icon.icon('${node.icon}', ${iconClass}, h)`)
  if (node.label !== undefined) children.push(`'${esc(node.label)}'`)
  return `Button.button({
          ${node.variant === undefined ? '' : `variant: '${node.variant}', `}${node.size === undefined ? '' : `size: '${node.size}', `}${node.ariaLabel === undefined ? '' : `ariaLabel: '${esc(node.ariaLabel)}', `}children: [${children.join(', ')}],
        }, h)`
}

const inputSource = (
  node: BgInput,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string =>
  `Input.input({
          id: '${node.field}',
          value: model.${node.field},
          onInput: value => Message['${FIELD_MESSAGE[node.field]}']({ value }),
          placeholder: '${esc(node.placeholder)}',
          ${
            renderer !== 'tailwind'
              ? 'layoutStyle: layoutStyle({ height: "2.25rem" }),'
              : `class: 'h-9',`
          }
        }, h)`

const inputGroupSource = (
  voiceToggle: boolean,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isSx = renderer !== 'tailwind'
  const addon = voiceToggle
    ? `InputGroup.inputGroupAddon({
            align: 'inline-end',
            children: [
              h.button(
                [
                  h.Type('button'),
                  h.AriaPressed(model.voiceEnabled ? 'true' : 'false'),
                  h.AriaLabel('Voice Mode'),
                  h.DataAttribute('active', String(model.voiceEnabled)),
                  h.OnClick(Message.ToggledVoice()),
                  h.Class(${isSx ? 'className(styles.voiceButton)' : "'inline-flex size-6 items-center justify-center rounded-[calc(var(--radius)-5px)] text-muted-foreground data-[active=true]:bg-orange-100 data-[active=true]:text-orange-700 dark:data-[active=true]:bg-orange-800 dark:data-[active=true]:text-orange-100'"}),
                ],
                [Icon.icon('audio-lines', ${isSx ? '{ class: className(styles.captionIcon) }' : "{ class: 'size-3.5' }"}, h)],
              ),
            ],
          }, h)`
    : `Tooltip.tooltip({
            model: model.tooltip,
            toParentMessage: message =>
              Message['GotTooltipMessage']({ message }),
            trigger: InputGroup.inputGroupAddon({
              align: 'inline-end',
              children: [Icon.icon('audio-lines', ${isSx ? '{ class: className(styles.captionIcon) }' : "{ class: 'size-3.5' }"}, h)],
            }, h),
            ${isSx ? '' : "triggerClass: 'text-muted-foreground',"}
            content: 'Voice Mode',
            ariaLabel: 'Voice Mode',
          }, h)`
  return `InputGroup.inputGroup({
        ${isSx ? 'layoutStyle: layoutStyle({ height: "2.25rem" }),' : `class: 'h-9',`}
        children: [
          InputGroup.inputGroupInput({
            id: 'message',
            value: model.message,
            onInput: value => Message['ChangedMessage']({ value }),
            placeholder: ${
              voiceToggle
                ? `model.voiceEnabled ? 'Record and send audio...' : 'Send a message...'`
                : `'Send a message...'`
            },
            ${voiceToggle ? 'isDisabled: model.voiceEnabled,' : ''}
            ariaLabel: 'Message',
          }, h),
          ${addon},
        ],
      }, h)`
}

const selectSource = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string =>
  `Select.select({
          model: model.select,
          maybeSelectedValue: model.maybeCurrency,
          toParentMessage: message =>
            Message['GotSelectMessage']({ message }),
          items: CURRENCIES,
          itemToValue: item => item.value,
          itemToLabel: item => \`\${item.value} \${item.label}\`,
          ariaLabel: 'Currency',
          ${renderer !== 'tailwind' ? '' : `triggerClass: 'font-mono',`}
        }, h)`

const dropdownSource = (
  node: Readonly<{ t: 'dropdown'; menu: 'demo' | 'conversation' }>,
  fixture: ButtonGroupFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isRtl = fixture.direction === 'rtl'
  const trigger =
    node.menu === 'demo'
      ? `Icon.icon('ellipsis', { ariaLabel: ${isRtl ? "'مزيد من الخيارات'" : "'More Options'"} }, h)`
      : `Icon.icon('chevron-down', { ariaLabel: 'Options' }, h)`
  const triggerStyling =
    renderer !== 'tailwind'
      ? `triggerButtonVariant: 'outline',
          triggerButtonSize: ${node.menu === 'demo' ? "'icon'" : "'default'"},`
      : node.menu === 'demo'
        ? `triggerClass: 'inline-flex size-9 items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground',`
        : `triggerClass: 'inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-3 hover:bg-accent hover:text-accent-foreground',`
  return `DropdownMenu.dropdownMenu({
          model: model.menu,
          toParentMessage: message =>
            Message['GotMenuMessage']({ message }),
          trigger: ${trigger},
          ${triggerStyling}
          items: ITEMS,
          itemToConfig: item => {
${itemToConfigBody(node.menu, fixture)}
          },
          align: 'end',${isRtl ? `\n          direction: 'rtl',` : ''}
        }, h)`
}

const popoverSource = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string =>
  `Popover.popover({
          model: model.popover,
          toParentMessage: message =>
            Message['GotPopoverMessage']({ message }),
          trigger: Icon.icon('chevron-down', { ariaLabel: 'Open Popover' }, h),
          ${renderer !== 'tailwind' ? '' : `triggerClass: 'inline-flex size-9 items-center justify-center rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground',`}
          align: 'end',
          content: h.div([h.Class(${renderer !== 'tailwind' ? 'className(styles.popoverBody)' : `'grid gap-3 text-sm'`})], [
            h.div([h.Class(${renderer !== 'tailwind' ? 'className(styles.popoverHead)' : `'grid gap-1'`})], [
              h.p([h.Class(${renderer !== 'tailwind' ? 'className(styles.popoverTitle)' : `'text-sm font-medium'`})], ['Start a new task with Copilot']),
              h.p([h.Class(${renderer !== 'tailwind' ? 'className(styles.popoverCopy)' : `'text-sm text-muted-foreground'`})], ['Describe your task in natural language.']),
            ]),
            Textarea.textarea({
              id: 'task',
              value: model.task,
              onInput: value => Message['ChangedTask']({ value }),
              placeholder: 'I need to...',
              ${renderer !== 'tailwind' ? `resize: 'none',` : `class: 'resize-none',`}
            }, h),
            h.p([h.Class(${renderer !== 'tailwind' ? 'className(styles.popoverCopy)' : `'text-xs text-muted-foreground'`})], ['Copilot will open a pull request for review.']),
          ]),
        }, h)`

const nodeSource = (
  node: BgNode,
  fixture: ButtonGroupFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
  depth = 2,
): string => {
  const isSx = renderer !== 'tailwind'
  const pad = '  '.repeat(depth)
  switch (node.t) {
    case 'button':
      return `${pad}${buttonSource(node, fixture.direction === 'rtl')}`
    case 'separator':
      return `${pad}ButtonGroup.buttonGroupSeparator({}, h)`
    case 'input':
      return `${pad}${inputSource(node, renderer)}`
    case 'inputGroup':
      return `${pad}${inputGroupSource(node.voiceToggle, renderer)}`
    case 'select':
      return `${pad}${selectSource(renderer)}`
    case 'dropdown':
      return `${pad}${dropdownSource(node, fixture, renderer)}`
    case 'popover':
      return `${pad}${popoverSource(renderer)}`
    case 'column':
      return `${pad}h.div([h.Class(${isSx ? 'className(styles.stack)' : `'flex flex-col items-start gap-8'`})], [
${node.children.map(child => nodeSource(child, fixture, renderer, depth + 1)).join(',\n')},
${pad}])`
    case 'group':
      return `${pad}ButtonGroup.buttonGroup({
${pad}  children: [
${node.children.map(child => nodeSource(child, fixture, renderer, depth + 1)).join(',\n')},
${pad}  ],${node.rtlHidden === true && !isSx ? `\n${pad}  class: 'hidden sm:flex',` : ''}
${pad}}, h)`
  }
}

const viewBodySource = (
  fixture: ButtonGroupFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isSx = renderer !== 'tailwind'
  const groupProps = [
    fixture.orientation === 'vertical' ? `orientation: 'vertical',` : '',
    fixture.ariaLabel === undefined
      ? ''
      : `ariaLabel: '${esc(fixture.ariaLabel)}',`,
    fixture.rounded === true && renderer === 'tailwind'
      ? `class: '[--radius:9999rem]',`
      : '',
  ]
    .filter(Boolean)
    .join('\n    ')
  const dirWrap =
    fixture.direction === 'rtl'
      ? `h.div([h.Dir('rtl')], [\n    GROUP\n  ])`
      : 'GROUP'
  const ungrouped =
    fixture.nodes.length === 1 && fixture.nodes[0]?.t === 'column'
  const group = ungrouped
    ? fixture.nodes
        .map(node => nodeSource(node, fixture, renderer, 2))
        .join(',\n')
    : `ButtonGroup.buttonGroup({
    ${groupProps}
    children: [
${fixture.nodes.map(node => nodeSource(node, fixture, renderer, 3)).join(',\n')},
    ],
  }, h)`
  return dirWrap.replace('GROUP', group)
}

const stylexStylesSource = (fixture: ButtonGroupFixture): string => {
  const needs = nodeNeeds(fixture.nodes)
  const parts: Array<string> = []
  const needsStack = fixture.nodes.some(node => node.t === 'column')
  if (needsStack)
    parts.push(
      `  stack: { alignItems: 'flex-start', display: 'flex', flexDirection: 'column', gap: '2rem' },`,
    )

  if (needs.voice)
    parts.push(
      `  voiceButton: { alignItems: 'center', borderRadius: foundationTokens.radiusSm, color: 'var(--muted-foreground)', display: 'inline-flex', height: '1.5rem', justifyContent: 'center', width: '1.5rem' },`,
      `  captionIcon: { fontSize: '0.875rem', lineHeight: '1.25rem' },`,
    )
  if (!needs.voice && needs.tooltip)
    parts.push(
      `  captionIcon: { fontSize: '0.875rem', lineHeight: '1.25rem' },`,
    )
  if (needs.groupedInput) parts.push(`  groupHeight: { height: '2.25rem' },`)
  if (needs.popover)
    parts.push(
      `  popoverBody: { display: 'grid', fontSize: '0.875rem', lineHeight: '1.25rem', gap: '0.75rem' },`,
      `  popoverHead: { display: 'grid', gap: '0.25rem' },`,
      `  popoverTitle: { fontSize: '0.875rem', lineHeight: '1.25rem', fontWeight: 500 },`,
      `  popoverCopy: { color: 'var(--muted-foreground)', fontSize: '0.875rem', lineHeight: '1.25rem' },`,
    )
  return parts.length === 0
    ? ''
    : `import * as stylex from '@stylexjs/stylex'
import { foundationTokens } from '@/stylex/foundations-tokens.stylex'
import { className } from '@/stylex/style'\nimport { layoutStyle } from '@/stylex/contracts'

const styles = stylex.create({
  shell: { alignItems: 'center', display: 'flex', justifyContent: 'center', minHeight: '100vh', padding: '2rem' },
${parts.join('\n')}
})

`
}

const componentImports = (
  fixture: ButtonGroupFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const needs = nodeNeeds(fixture.nodes)
  const ui = renderer !== 'tailwind' ? 'stylex' : 'ui'
  const lines: Array<string> = []
  const sxStyles = renderer !== 'tailwind' ? stylexStylesSource(fixture) : ''
  if (sxStyles !== '') lines.push(sxStyles.trimEnd())
  lines.push(`import * as Button from '@/${ui}/button'`)
  if (needs.icons) lines.push(`import * as Icon from '@/lib/icon'`)
  if (needs.inputs.length > 0)
    lines.push(`import * as Input from '@/${ui}/input'`)
  if (
    fixture.nodes.some(
      n => n.t === 'group' && n.children.some(c => c.t === 'inputGroup'),
    )
  )
    lines.push(`import * as InputGroup from '@/${ui}/input-group'`)
  if (needs.select) lines.push(`import * as Select from '@/${ui}/select'`)
  if (needs.menu !== undefined)
    lines.push(`import * as DropdownMenu from '@/${ui}/dropdown-menu'`)
  if (needs.popover) lines.push(`import * as Popover from '@/${ui}/popover'`)
  if (needs.popover) lines.push(`import * as Textarea from '@/${ui}/textarea'`)
  if (needs.tooltip) lines.push(`import * as Tooltip from '@/${ui}/tooltip'`)
  return lines.join('\n')
}

const modelFields = (needs: ReturnType<typeof nodeNeeds>): Array<string> => {
  const fields: Array<string> = []
  if (needs.menu !== undefined) fields.push(`  menu: DropdownMenu.Model,`)
  if (needs.menu === 'demo') fields.push(`  label: S.Option(S.String),`)
  needs.inputs.forEach(field => fields.push(`  ${field}: S.String,`))
  if (needs.voice) fields.push(`  voiceEnabled: S.Boolean,`)
  if (needs.select) {
    fields.push(`  select: Select.Model,`)
    fields.push(`  maybeCurrency: S.Option(S.String),`)
  }
  if (needs.popover) fields.push(`  popover: Popover.Model,`)
  if (needs.tooltip) fields.push(`  tooltip: Tooltip.Model,`)
  return fields
}

const messageFields = (needs: ReturnType<typeof nodeNeeds>): Array<string> => {
  const messages: Array<string> = []
  if (needs.menu !== undefined)
    messages.push(`  GotMenuMessage: { message: DropdownMenu.Message },`)
  needs.inputs.forEach(field => {
    const name = FIELD_MESSAGE[field]
    if (messages.every(m => !m.includes(name)))
      messages.push(`  ${name}: { value: S.String },`)
  })
  if (needs.voice) messages.push(`  ToggledVoice: {},`)
  if (needs.select)
    messages.push(`  GotSelectMessage: { message: Select.Message },`)
  if (needs.popover)
    messages.push(`  GotPopoverMessage: { message: Popover.Message },`)
  if (needs.tooltip)
    messages.push(`  GotTooltipMessage: { message: Tooltip.Message },`)
  return messages
}

const initFields = (needs: ReturnType<typeof nodeNeeds>): Array<string> => {
  const fields: Array<string> = []
  if (needs.menu !== undefined)
    fields.push(
      `menu: DropdownMenu.init({ id: 'actions-menu', isAnimated: true })`,
    )
  if (needs.menu === 'demo') fields.push(`label: Option.some('personal')`)
  needs.inputs.forEach(field => fields.push(`${field}: ''`))
  if (needs.voice) fields.push(`voiceEnabled: false`)
  if (needs.select) {
    fields.push(
      `select: Select.init({ id: 'currency-select', isAnimated: true })`,
    )
    fields.push(`maybeCurrency: Option.some('$')`)
  }
  if (needs.popover)
    fields.push(`popover: Popover.init({ id: 'copilot-popover' })`)
  if (needs.tooltip)
    fields.push(`tooltip: Tooltip.init({ id: 'voice-tooltip' })`)
  return fields
}

const updateCases = (needs: ReturnType<typeof nodeNeeds>): Array<string> => {
  const cases: Array<string> = []
  if (needs.menu !== undefined)
    cases.push(`    case 'GotMenuMessage': {
      const result = DropdownMenu.update(model.menu, message.message)
      const maybeSelection = Option.fromNullishOr(result.outMessage)
      return {
        model: {
          ...model,
          menu: result.model,
          ${
            needs.menu === 'demo'
              ? `label: Option.match(maybeSelection, {
            onNone: () => model.label,
            onSome: selection => Option.some(selection.value),
          }),`
              : ''
          }
        },
        commands: Command.mapMessages(
          result.commands ?? [],
          next => Message['GotMenuMessage']({ message: next }),
        ),
      }
    }`)
  needs.inputs.forEach(field => {
    const name = FIELD_MESSAGE[field]
    cases.push(`    case '${name}':
      return { model: { ...model, ${field}: message.value } }`)
  })
  if (needs.voice)
    cases.push(`    case 'ToggledVoice':
      return { model: { ...model, voiceEnabled: !model.voiceEnabled } }`)
  if (needs.select)
    cases.push(`    case 'GotSelectMessage': {
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
        commands: Command.mapMessages(
          result.commands ?? [],
          next => Message['GotSelectMessage']({ message: next }),
        ),
      }
    }`)
  if (needs.popover)
    cases.push(`    case 'GotPopoverMessage': {
      const result = Popover.update(model.popover, message.message)
      return {
        model: { ...model, popover: result.model },
        commands: Command.mapMessages(
          result.commands ?? [],
          next => Message['GotPopoverMessage']({ message: next }),
        ),
      }
    }`)
  if (needs.tooltip)
    cases.push(`    case 'GotTooltipMessage': {
      const result = Tooltip.update(model.tooltip, message.message)
      return {
        model: { ...model, tooltip: result.model },
        commands: Command.mapMessages(
          result.commands,
          next => Message['GotTooltipMessage']({ message: next }),
        ),
      }
    }`)
  return cases
}

const isDynamic = (fixture: ButtonGroupFixture): boolean => {
  const needs = nodeNeeds(fixture.nodes)
  return (
    needs.menu !== undefined ||
    needs.inputs.length > 0 ||
    needs.select ||
    needs.popover ||
    needs.tooltip ||
    needs.voice
  )
}

const dynamicSource = (
  fixture: ButtonGroupFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const needs = nodeNeeds(fixture.nodes)
  const consts: Array<string> = []
  if (needs.menu !== undefined) {
    consts.push(`const ITEMS = ${itemsSource(needs.menu)}`)
    consts.push('')
  }
  if (needs.select) {
    consts.push(`const CURRENCIES = [
  { value: '$', label: 'US Dollar' },
  { value: '€', label: 'Euro' },
  { value: '£', label: 'British Pound' },
]`)
    consts.push('')
  }
  return foldkitApplication({
    title: `Button Group — ${fixture.title}`,
    imports: `import { Option, Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'

import * as ButtonGroup from '@/${renderer !== 'tailwind' ? 'stylex' : 'ui'}/button-group'
${componentImports(fixture, renderer)}`,
    model: `export const Model = S.Struct({
${modelFields(needs).join('\n')}
})
export type Model = typeof Model.Type`,
    messages: `import { defineMessageUnion } from 'foldkit/message'

export const Message = defineMessageUnion({
${messageFields(needs).join('\n')}
});
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: { ${initFields(needs).join(', ')} },
})`,
    update: `export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
${updateCases(needs).join('\n')}
  }
}`,
    view: `${consts.join('\n')}export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Button Group — ${fixture.title}',
  body: h.main([h.Class(${renderer !== 'tailwind' ? 'className(styles.shell)' : "'flex min-h-screen items-center justify-center p-8'"})], [
    ${viewBodySource(fixture, renderer)},
  ]),
})`,
  })
}

const source = (
  fixture: ButtonGroupFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string =>
  isDynamic(fixture)
    ? dynamicSource(fixture, renderer)
    : staticComponentApplication({
        componentName: 'ButtonGroup',
        componentSlug: 'button-group',
        renderer,
        exampleName: fixture.title,
        componentImports: componentImports(fixture, renderer),
        viewBody: viewBodySource(fixture, renderer),
      })

const buttonGroupExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  buttonGroupFixtures.map(fixture => ({
    title: fixture.title,
    description: fixture.description,
    ...(fixture.heroOnly === true ? { heroOnly: true } : {}),
    code: source(fixture, renderer),
  }))

export const buttonGroupExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, buttonGroupExamplesFor(renderer))
