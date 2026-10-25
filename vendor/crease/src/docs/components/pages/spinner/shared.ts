import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { staticComponentApplication } from '@/docs/components/pages/authored-page'

export const spinnerFixtures = [
  { title: 'Basic', kind: 'item' },
  { title: 'Customization', kind: 'custom' },
  { title: 'Size', kind: 'size' },
  { title: 'Button', kind: 'button' },
  { title: 'Badge', kind: 'badge' },
  { title: 'Input Group', kind: 'inputGroup' },
  { title: 'Empty', kind: 'empty' },
  { title: 'RTL', kind: 'item', rtl: true },
] as const

export type SpinnerFixture = (typeof spinnerFixtures)[number]

const SX_STYLES = `
const styles = stylex.create({
  wrap: { maxWidth: '24rem', width: '100%' },
  wrapMd: { maxWidth: '28rem', width: '100%' },
  column: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  row: { alignItems: 'center', display: 'flex', gap: '1.5rem' },
  rowSm: { alignItems: 'center', display: 'flex', gap: '1rem' },
  centerCol: { alignItems: 'center', display: 'flex', flexDirection: 'column', gap: '1rem' },
  accent: { color: 'var(--primary)' },
  amount: { fontSize: '0.875rem', lineHeight: '1.25rem', fontVariantNumeric: 'tabular-nums' },
  itemEnd: { marginInlineStart: 'auto' },
})
`

const itemBody = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
  rtl: boolean,
): string => {
  const isSx = renderer !== 'tailwind'
  const t = rtl
    ? { title: 'جاري معالجة الدفع...', amount: '١٠٠.٠٠ دولار' }
    : { title: 'Processing payment...', amount: '$100.00' }
  const wrapCls = isSx
    ? "h.Class(stylex.props(styles.wrap).className ?? '')"
    : "h.Class('w-full max-w-xs')"
  const dir = rtl ? "h.Dir('rtl'), " : ''
  const endContent = isSx
    ? `Item.itemContent({ layoutStyle: layoutStyle({ marginInlineStart: "auto" }), children: [
    h.span([h.Class(stylex.props(styles.amount).className ?? '')], ['${t.amount}']),
  ] }, h)`
    : `Item.itemContent({ class: 'flex-none justify-end', children: [
    h.span([h.Class('text-sm tabular-nums')], ['${t.amount}']),
  ] }, h)`
  return `h.div([${dir}${wrapCls}], [
  Item.item({ variant: 'muted', children: [
    Item.itemMedia({ children: [Spinner.spinner({ isDecorative: true }, h)] }, h),
    Item.itemContent({ children: [
      Item.itemTitle({ children: ['${t.title}'] }, h),
    ] }, h),
    ${endContent},
  ] }, h),
])`
}

const customBody = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isSx = renderer !== 'tailwind'
  return `h.div([h.Class(${
    isSx ? "stylex.props(styles.accent).className ?? ''" : "'text-chart-2'"
  })], [
  Spinner.spinner({ label: 'Loading', size: 'lg' }, h),
])`
}

const sizeBody = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string =>
  `h.div([h.Class(${
    renderer !== 'tailwind'
      ? "stylex.props(styles.row).className ?? ''"
      : "'flex items-center gap-6'"
  })], [
  Spinner.spinner({ isDecorative: true, size: 'sm' }, h),
  Spinner.spinner({ isDecorative: true, size: 'md' }, h),
  Spinner.spinner({ isDecorative: true, size: 'lg' }, h),
  Spinner.spinner({ isDecorative: true, size: 'xl' }, h),
])`

const buttonBody = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string =>
  `h.div([h.Class(${
    renderer !== 'tailwind'
      ? "stylex.props(styles.centerCol).className ?? ''"
      : "'flex flex-col items-center gap-4'"
  })], [
  Button.button({ size: 'sm', isDisabled: true, children: [
    Spinner.spinner({ isDecorative: true, dataIcon: 'inline-start' }, h),
    'Loading...',
  ] }, h),
  Button.button({ variant: 'outline', size: 'sm', isDisabled: true, children: [
    Spinner.spinner({ isDecorative: true, dataIcon: 'inline-start' }, h),
    'Please wait',
  ] }, h),
  Button.button({ variant: 'secondary', size: 'sm', isDisabled: true, children: [
    Spinner.spinner({ isDecorative: true, dataIcon: 'inline-start' }, h),
    'Processing',
  ] }, h),
])`

const badgeBody = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string =>
  `h.div([h.Class(${
    renderer !== 'tailwind'
      ? "stylex.props(styles.rowSm).className ?? ''"
      : "'flex items-center gap-4'"
  })], [
  Badge.badge({ children: [
    Spinner.spinner({ isDecorative: true, dataIcon: 'inline-start' }, h),
    'Syncing',
  ] }, h),
  Badge.badge({ variant: 'secondary', children: [
    Spinner.spinner({ isDecorative: true, dataIcon: 'inline-start' }, h),
    'Updating',
  ] }, h),
  Badge.badge({ variant: 'outline', children: [
    Spinner.spinner({ isDecorative: true, dataIcon: 'inline-start' }, h),
    'Processing',
  ] }, h),
])`

const inputGroupBody = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string =>
  `h.div([h.Class(${
    renderer !== 'tailwind'
      ? "stylex.props(styles.column, styles.wrapMd).className ?? ''"
      : "'flex w-full max-w-md flex-col gap-4'"
  })], [
  InputGroup.inputGroup({ children: [
    InputGroup.inputGroupInput({
      id: 'spinner-message',
      value: '',
      onInput: () => NoOp({}),
      placeholder: 'Send a message...',
      isDisabled: true,
    }, h),
    InputGroup.inputGroupAddon({ align: 'inline-end', children: [
      Spinner.spinner({ isDecorative: true }, h),
    ] }, h),
  ] }, h),
  InputGroup.inputGroup({ children: [
    InputGroup.inputGroupTextarea({
      id: 'spinner-message-area',
      value: '',
      onInput: () => NoOp({}),
      placeholder: 'Send a message...',
      isDisabled: true,
    }, h),
    InputGroup.inputGroupAddon({ align: 'block-end', children: [
      Spinner.spinner({ isDecorative: true }, h),
      'Validating...',
      InputGroup.inputGroupButton({ variant: 'default', size: 'icon-sm', ${
        renderer !== 'tailwind'
          ? 'layoutStyle: layoutStyle({ marginInlineStart: "auto" })'
          : "class: 'ml-auto'"
      }, children: [
        Icon.arrowUp({}, h),
        h.span([h.Class('sr-only')], ['Send']),
      ] }, h),
    ] }, h),
  ] }, h),
])`

const emptyBody = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string =>
  `Empty.empty({ children: [
  Empty.emptyHeader({ children: [
    Empty.emptyMedia({ variant: 'icon', children: [
      Spinner.spinner({ isDecorative: true }, h),
    ] }, h),
    Empty.emptyTitle({ children: ['Processing your request'] }, h),
    Empty.emptyDescription({ children: [
      'Please wait while we process your request. Do not refresh the page.',
    ] }, h),
  ] }, h),
  Empty.emptyContent({ children: [
    Button.button({ variant: 'outline', size: 'sm', children: ['Cancel'] }, h),
  ] }, h),
] }, h)`

const EXTRA_IMPORTS = {
  item: "import * as Item from '@/ui/item'",
  custom: '',
  size: '',
  button: "import * as Button from '@/ui/button'",
  badge: "import * as Badge from '@/ui/badge'",
  inputGroup:
    "import * as Icon from '@/lib/icon'\nimport * as InputGroup from '@/ui/input-group'",
  empty:
    "import * as Button from '@/ui/button'\nimport * as Empty from '@/ui/empty'",
} as const

const body = (
  fixture: SpinnerFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  switch (fixture.kind) {
    case 'item':
      return itemBody(renderer, 'rtl' in fixture && fixture.rtl === true)
    case 'custom':
      return customBody(renderer)
    case 'size':
      return sizeBody(renderer)
    case 'button':
      return buttonBody(renderer)
    case 'badge':
      return badgeBody(renderer)
    case 'inputGroup':
      return inputGroupBody(renderer)
    case 'empty':
      return emptyBody(renderer)
  }
}

const spinnerExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  spinnerFixtures.map(fixture => ({
    title: fixture.title,
    code: staticComponentApplication({
      componentName: 'Spinner',
      componentSlug: 'spinner',
      renderer,
      exampleName: fixture.title,
      componentImports:
        (EXTRA_IMPORTS[fixture.kind].length > 0
          ? `${EXTRA_IMPORTS[fixture.kind].replaceAll('@/ui/', `@/${renderer !== 'tailwind' ? 'stylex' : 'ui'}/`)}\n`
          : '') +
        (renderer !== 'tailwind'
          ? `import * as stylex from '@stylexjs/stylex'
import { layoutStyle } from '@/stylex/contracts'\n${SX_STYLES}`
          : ''),
      viewBody: `${body(fixture, renderer)},`,
    }),
  }))

export const spinnerExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, spinnerExamplesFor(renderer))
