import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import {
  foldkitApplication,
  statelessComponentApplication,
} from '@/docs/components/pages/authored-page'

type ButtonVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'ghost'
  | 'link'
type ButtonSize =
  | 'xs'
  | 'sm'
  | 'lg'
  | 'icon'
  | 'icon-xs'
  | 'icon-sm'
  | 'icon-lg'

export type ButtonItemSpec = Readonly<{
  label?: string
  variant?: ButtonVariant
  size?: ButtonSize
  /** Lucide icon rendered inside the button content. */
  icon?: string
  iconPosition?: 'start' | 'end'
  /** Extra classes on the icon (e.g. `rtl:rotate-180`). */
  iconClass?: string
  ariaLabel?: string
  isDisabled?: boolean
  spinner?: 'start' | 'end'
  /** rounded-full demo — class on tailwind, `rounded` prop on stylex. */
  rounded?: boolean
}>

export type ButtonFixture = Readonly<{
  title: string
  description: string
  kind: 'items' | 'sizes' | 'link' | 'buttonGroup'
  direction?: 'rtl'
  items: ReadonlyArray<ButtonItemSpec>
}>

/** Per-size columns for the upstream `button-size` example. */
export const buttonSizeTiers: ReadonlyArray<
  Readonly<{
    name: string
    size?: ButtonSize
    iconSize: ButtonSize
  }>
> = [
  { name: 'Extra Small', size: 'xs', iconSize: 'icon-xs' },
  { name: 'Small', size: 'sm', iconSize: 'icon-sm' },
  { name: 'Default', iconSize: 'icon' },
  { name: 'Large', size: 'lg', iconSize: 'icon-lg' },
]

/** Menu item ids for the Button Group dropdown (mirrors upstream `button-group-demo`). */
export const buttonGroupMenuItems = [
  'mark-read',
  'archive',
  'snooze',
  'add-calendar',
  'add-list',
  'label-as',
  'trash',
] as const
export const buttonGroupLabelItems = ['personal', 'work', 'other'] as const
export type ButtonGroupMenuItem =
  | (typeof buttonGroupMenuItems)[number]
  | (typeof buttonGroupLabelItems)[number]

export const buttonGroupItemLabel = (
  item: (typeof buttonGroupMenuItems)[number],
): string =>
  ({
    'mark-read': 'Mark as Read',
    archive: 'Archive',
    snooze: 'Snooze',
    'add-calendar': 'Add to Calendar',
    'add-list': 'Add to List',
    'label-as': 'Label As…',
    trash: 'Trash',
  })[item]

export const buttonGroupItemIcon = (
  item: (typeof buttonGroupMenuItems)[number],
): string =>
  ({
    'mark-read': 'mail-check',
    archive: 'archive',
    snooze: 'clock',
    'add-calendar': 'calendar-plus',
    'add-list': 'list-filter',
    'label-as': 'tag',
    trash: 'trash-2',
  })[item]

export const buttonFixtures: Readonly<
  [ButtonFixture, ...Array<ButtonFixture>]
> = [
  {
    title: 'Basic',
    description: 'The default button alongside an outline icon button.',
    kind: 'items',
    items: [
      { label: 'Button', variant: 'outline' },
      {
        variant: 'outline',
        size: 'icon',
        icon: 'arrow-up',
        ariaLabel: 'Submit',
      },
    ],
  },
  {
    title: 'Size',
    description: 'Four size tiers, each shown with a text and an icon button.',
    kind: 'sizes',
    items: [],
  },
  {
    title: 'Default',
    description: 'The primary button for the main action.',
    kind: 'items',
    items: [{ label: 'Button' }],
  },
  {
    title: 'Outline',
    description: 'A bordered button for secondary actions.',
    kind: 'items',
    items: [{ label: 'Outline', variant: 'outline' }],
  },
  {
    title: 'Secondary',
    description: 'A muted button for less prominent actions.',
    kind: 'items',
    items: [{ label: 'Secondary', variant: 'secondary' }],
  },
  {
    title: 'Ghost',
    description: 'A chromeless button that only appears on hover.',
    kind: 'items',
    items: [{ label: 'Ghost', variant: 'ghost' }],
  },
  {
    title: 'Destructive',
    description: 'A button for actions that remove or destroy data.',
    kind: 'items',
    items: [{ label: 'Destructive', variant: 'destructive' }],
  },
  {
    title: 'Link',
    description: 'A button styled as an inline text link.',
    kind: 'items',
    items: [{ label: 'Link', variant: 'link' }],
  },
  {
    title: 'Icon',
    description:
      'An icon-only button — keep an aria-label for the action name.',
    kind: 'items',
    items: [
      {
        variant: 'outline',
        size: 'icon',
        icon: 'circle-fading-arrow-up',
        ariaLabel: 'Submit',
      },
    ],
  },
  {
    title: 'With Icon',
    description: 'Leading and trailing icons inside button content.',
    kind: 'items',
    items: [
      {
        label: 'New Branch',
        variant: 'outline',
        icon: 'git-branch',
        iconPosition: 'start',
      },
      {
        label: 'Fork',
        variant: 'outline',
        icon: 'git-fork',
        iconPosition: 'end',
      },
    ],
  },
  {
    title: 'Rounded',
    description: 'Fully rounded pill buttons.',
    kind: 'items',
    items: [
      { label: 'Get Started', rounded: true },
      {
        variant: 'outline',
        size: 'icon',
        icon: 'arrow-up',
        rounded: true,
        ariaLabel: 'Go up',
      },
    ],
  },
  {
    title: 'Spinner',
    description: 'Disabled buttons with a decorative loading spinner.',
    kind: 'items',
    items: [
      {
        label: 'Generating',
        variant: 'outline',
        isDisabled: true,
        spinner: 'start',
      },
      {
        label: 'Downloading',
        variant: 'secondary',
        isDisabled: true,
        spinner: 'start',
      },
    ],
  },
  {
    title: 'Button Group',
    description: 'Related actions grouped visually, including a dropdown menu.',
    kind: 'buttonGroup',
    items: [],
  },
  {
    title: 'As Child',
    description: 'Render the button styles on a link element.',
    kind: 'link',
    items: [],
  },
  {
    title: 'RTL',
    description: 'Buttons laid out right-to-left with mirrored icons.',
    kind: 'items',
    direction: 'rtl',
    items: [
      { label: 'زر', variant: 'outline' },
      { label: 'حذف', variant: 'destructive' },
      {
        label: 'إرسال',
        variant: 'outline',
        icon: 'arrow-right',
        iconPosition: 'end',
        iconClass: 'rtl:rotate-180',
      },
      { variant: 'outline', size: 'icon', icon: 'plus', ariaLabel: 'Add' },
      {
        label: 'جاري التحميل',
        variant: 'secondary',
        isDisabled: true,
        spinner: 'start',
      },
    ],
  },
]

const iconSource = (
  item: ButtonItemSpec,
  position: 'start' | 'end',
): string => {
  const opts: Array<string> = [`dataIcon: 'inline-${position}'`]
  if (item.iconClass !== undefined) opts.push(`class: '${item.iconClass}'`)
  return `Icon.icon('${item.icon ?? ''}', { ${opts.join(', ')} }, h)`
}

const spinnerSource = (position: 'start' | 'end'): string =>
  `Spinner.spinner({ isDecorative: true, dataIcon: 'inline-${position}' }, h)`

const itemChildrenSource = (item: ButtonItemSpec): string => {
  const children: Array<string> = []
  if (item.spinner === 'start') children.push(spinnerSource('start'))
  if (item.icon !== undefined && (item.iconPosition ?? 'start') === 'start')
    children.push(iconSource(item, 'start'))
  if (item.label !== undefined) children.push(`'${item.label}'`)
  if (item.icon !== undefined && item.iconPosition === 'end')
    children.push(iconSource(item, 'end'))
  if (item.spinner === 'end') children.push(spinnerSource('end'))
  return children.join(', ')
}

const needsIconImport = (item: ButtonItemSpec): boolean =>
  item.icon !== undefined
const needsSpinnerImport = (item: ButtonItemSpec): boolean =>
  item.spinner !== undefined

const itemSource = (
  item: ButtonItemSpec,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const props: Array<string> = []
  if (item.variant !== undefined) props.push(`variant: '${item.variant}'`)
  if (item.size !== undefined) props.push(`size: '${item.size}'`)
  if (item.rounded === true)
    props.push(
      renderer === 'tailwind' ? `class: 'rounded-full'` : 'rounded: true',
    )
  if (item.isDisabled === true) props.push('isDisabled: true')
  if (item.ariaLabel !== undefined) props.push(`ariaLabel: '${item.ariaLabel}'`)
  const inset =
    item.icon !== undefined ? (item.iconPosition ?? 'start') : item.spinner
  if (
    renderer !== 'tailwind' &&
    inset !== undefined &&
    item.size !== 'icon' &&
    item.size !== 'icon-xs' &&
    item.size !== 'icon-sm' &&
    item.size !== 'icon-lg'
  )
    props.push(`iconInset: '${inset}'`)
  props.push(`children: [${itemChildrenSource(item)}]`)
  return `Button.button({ ${props.join(', ')} }, h)`
}

const itemsViewSource = (
  fixture: ButtonFixture & { kind: 'items' },
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const classes =
    renderer === 'tailwind'
      ? `h.Class('flex flex-wrap items-center gap-2')`
      : `h.Class(stylex.props(styles.row).className ?? '')`
  const items = fixture.items
    .map(item => `      ${itemSource(item, renderer)}`)
    .join(',\n')
  if (fixture.items.length === 1 && fixture.direction === undefined)
    return itemSource(fixture.items[0] as ButtonItemSpec, renderer)
  return `h.div([${fixture.direction === 'rtl' ? `h.Dir('rtl'), ` : ''}${classes}], [
${items},
    ])`
}

const sizesViewSource = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const tiers = buttonSizeTiers
    .map(tier => {
      const text = itemSource(
        {
          label: tier.name,
          variant: 'outline',
          ...(tier.size === undefined ? {} : { size: tier.size }),
        },
        renderer,
      )
      const icon = itemSource(
        {
          variant: 'outline',
          size: tier.iconSize,
          icon: 'arrow-up-right',
          ariaLabel: tier.name,
        },
        renderer,
      )
      const groupClass =
        renderer === 'tailwind'
          ? `h.Class('flex items-start gap-2')`
          : `h.Class(stylex.props(styles.group).className ?? '')`
      return `      h.div([${groupClass}], [\n        ${text},\n        ${icon},\n      ])`
    })
    .join(',\n')
  const wrapClass =
    renderer === 'tailwind'
      ? `h.Class('flex flex-col items-start gap-8 sm:flex-row')`
      : `h.Class(stylex.props(styles.tiers).className ?? '')`
  return `h.div([${wrapClass}], [
${tiers},
    ])`
}

const buttonGroupViewSource = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const iconBtn = (icon: string, label: string): string =>
    `Button.button({ variant: 'outline', size: 'icon', ariaLabel: '${label}', children: [Icon.icon('${icon}', {}, h)] }, h)`
  const menuConfig =
    renderer === 'tailwind'
      ? `trigger: Icon.icon('ellipsis', {}, h),
      triggerClass: buttonVariants({ variant: 'outline', size: 'icon' }),`
      : `trigger: Icon.icon('ellipsis', {}, h),
      triggerButtonVariant: 'outline',
      triggerButtonSize: 'icon',`
  return `ButtonGroup.buttonGroup({ children: [
      ButtonGroup.buttonGroup({${renderer === 'tailwind' ? ` class: 'hidden sm:flex',` : ''} children: [
        ${iconBtn('arrow-left', 'Go Back')},
      ] }, h),
      ButtonGroup.buttonGroup({ children: [
        Button.button({ variant: 'outline', children: ['Archive'] }, h),
        Button.button({ variant: 'outline', children: ['Report'] }, h),
      ] }, h),
      ButtonGroup.buttonGroup({ children: [
        Button.button({ variant: 'outline', children: ['Snooze'] }, h),
        DropdownMenu.dropdownMenu({
          model: model.menu,
          toParentMessage: message => GotMenuMessage.GotMenuMessage({ message }),
          triggerAriaLabel: 'More options',
          ariaLabel: 'More options',
          ${menuConfig}
          items: menuItems,
          itemToConfig: itemToMenuConfig(model.labelAs, h),
        }, h),
      ] }, h),
    ] }, h)`
}

const buttonGroupModelSource = `export const Model = S.Struct({
  menu: DropdownMenu.Model,
  labelAs: S.Option(S.String),
})
export type Model = typeof Model.Type

export const menuItems = [
  'mark-read',
  'archive',
  'snooze',
  'add-calendar',
  'add-list',
  'label-as',
  'trash',
] as const
export const labelItems = ['personal', 'work', 'other'] as const
export type MenuItem =
  | (typeof menuItems)[number]
  | (typeof labelItems)[number]`

const buttonGroupImports = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const mod = renderer !== 'tailwind' ? '@/stylex' : '@/ui'
  return [
    `import * as Button from '${mod}/button'`,
    `import * as ButtonGroup from '${mod}/button-group'`,
    `import * as DropdownMenu from '${mod}/dropdown-menu'`,
    `import * as Icon from '@/lib/icon'`,
    renderer === 'tailwind'
      ? `import { buttonVariants } from '${mod}/button'`
      : undefined,
  ]
    .filter((line): line is string => line !== undefined)
    .join('\n')
}

const buttonGroupApplication = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string =>
  foldkitApplication({
    title: 'Button — Button Group',
    imports: [
      `import { Option, Schema as S } from 'effect'`,
      `import { Command, Runtime, Subscription, Update } from 'foldkit'`,
      `import { type Document, type HtmlBuilder } from 'foldkit/html'`,
      `import { defineMessageUnion } from 'foldkit/message'`,
      buttonGroupImports(renderer),
    ].join('\n'),
    model: buttonGroupModelSource,
    messages: `export const GotMenuMessage = defineMessageUnion({
  GotMenuMessage: { message: DropdownMenu.Message },
})
export type Message = typeof GotMenuMessage.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: {
    menu: DropdownMenu.init({ id: 'button-group-menu' }),
    labelAs: Option.some('personal'),
  },
  commands: [],
})`,
    update: `export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  const result = DropdownMenu.update(model.menu, message.message)
  const selected = Option.fromNullishOr(result.outMessage)
  return {
    model: {
      ...model,
      menu: result.model,
      labelAs: Option.match(selected, {
        onNone: () => model.labelAs,
        onSome: ({ value }) =>
          (labelItems as ReadonlyArray<string>).includes(value)
            ? Option.some(value)
            : model.labelAs,
      }),
    },
    commands: Command.mapMessages(result.commands, next =>
      GotMenuMessage.GotMenuMessage({ message: next }),
    ),
  }
}`,
    view: `const itemToMenuConfig = (
  labelAs: Option.Option<string>,
  h: HtmlBuilder<Message>,
) => (item: MenuItem): DropdownMenu.DropdownMenuItemConfig<MenuItem> => ({
  'mark-read': { label: 'Mark as Read', icon: Icon.icon('mail-check', {}, h) },
  archive: { label: 'Archive', icon: Icon.icon('archive', {}, h) },
  snooze: {
    label: 'Snooze',
    icon: Icon.icon('clock', {}, h),
    separatorBefore: true,
  },
  'add-calendar': { label: 'Add to Calendar', icon: Icon.icon('calendar-plus', {}, h) },
  'add-list': { label: 'Add to List', icon: Icon.icon('list-filter', {}, h) },
  'label-as': {
    label: 'Label As…',
    icon: Icon.icon('tag', {}, h),
    submenu: {
      items: [...labelItems],
      itemToConfig: (label: MenuItem): DropdownMenu.DropdownMenuItemConfig<MenuItem> => ({
        label: label.charAt(0).toUpperCase() + label.slice(1),
        kind: 'radio',
        isChecked: Option.getOrNull(labelAs) === label,
      }),
    },
  },
  trash: {
    label: 'Trash',
    icon: Icon.icon('trash-2', {}, h),
    variant: 'destructive' as const,
    separatorBefore: true,
  },
  personal: { label: 'Personal', kind: 'radio' as const },
  work: { label: 'Work', kind: 'radio' as const },
  other: { label: 'Other', kind: 'radio' as const },
})[item]

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Button — Button Group',
  body: h.main(
    [h.Class(${renderer !== 'tailwind' ? 'className(styles.shell)' : "'flex min-h-screen items-center justify-center p-8'"})],
    [
      ${buttonGroupViewSource(renderer)},
    ],
  ),
})`,
  })

const exampleCode = (
  fixture: ButtonFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  switch (fixture.kind) {
    case 'link':
      return statelessComponentApplication({
        componentName: 'Button',
        componentSlug: 'button',
        renderer,
        exampleName: fixture.title,
        viewBody: `Button.buttonLink({ href: '/login', children: ['Login'] }, h)`,
      })
    case 'buttonGroup':
      return buttonGroupApplication(renderer)
    case 'sizes': {
      const imports =
        renderer !== 'tailwind'
          ? `import * as stylex from '@stylexjs/stylex'\nimport * as Icon from '@/lib/icon'\n\nconst styles = stylex.create({\n  tiers: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2rem' },\n  group: { display: 'flex', alignItems: 'flex-start', gap: '0.5rem' },\n})`
          : `import * as Icon from '@/lib/icon'`
      return statelessComponentApplication({
        componentName: 'Button',
        componentSlug: 'button',
        renderer,
        exampleName: fixture.title,
        componentImports: imports,
        viewBody: sizesViewSource(renderer),
      })
    }
    case 'items': {
      const imports = [
        ...(fixture.items.some(needsIconImport)
          ? [`import * as Icon from '@/lib/icon'`]
          : []),
        ...(fixture.items.some(needsSpinnerImport)
          ? [
              `import * as Spinner from '@/${renderer !== 'tailwind' ? 'stylex' : 'ui'}/spinner'`,
            ]
          : []),
        ...(renderer !== 'tailwind' && fixture.items.length > 1
          ? [
              `import * as stylex from '@stylexjs/stylex'`,
              '',
              `const styles = stylex.create({\n  row: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' },\n})`,
            ]
          : []),
      ].join('\n')
      return statelessComponentApplication({
        componentName: 'Button',
        componentSlug: 'button',
        renderer,
        exampleName: fixture.title,
        ...(imports === '' ? {} : { componentImports: imports }),
        viewBody: itemsViewSource({ ...fixture, kind: 'items' }, renderer),
      })
    }
  }
}

const buttonExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  buttonFixtures.map(fixture => ({
    title: fixture.title,
    description: fixture.description,
    code: exampleCode(fixture, renderer),
  }))

export const buttonExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, buttonExamplesFor(renderer))
