import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'

export type ComboboxFixture = Readonly<{
  title: string
  description?: string
  heroOnly?: boolean
  kind:
    | 'frameworks'
    | 'clear'
    | 'groups'
    | 'custom'
    | 'rtl'
    | 'multiple'
    | 'autoHighlight'
    | 'popup'
  isInvalid?: boolean
  isDisabled?: boolean
}>

export const comboboxFixtures: ReadonlyArray<ComboboxFixture> = [
  { title: 'Demo', heroOnly: true, kind: 'frameworks' },
  { title: 'Basic', kind: 'frameworks' },
  {
    title: 'Multiple',
    kind: 'multiple',
    description:
      'Combobox.createMulti keeps the popup open across picks; the parent toggles each selected value as removable chips.',
  },
  {
    title: 'Clear Button',
    kind: 'clear',
    description:
      'A ghost clear button closes the popup via BlurredInput when open, clearing the input and owned selection without reopening.',
  },
  {
    title: 'Groups',
    kind: 'groups',
    description:
      'itemGroupKey plus groupToHeading render labeled, separated option groups.',
  },
  {
    title: 'Custom Items',
    kind: 'custom',
    description:
      'itemToConfig content composes rich option rows without changing selection semantics.',
  },
  {
    title: 'Invalid',
    kind: 'frameworks',
    isInvalid: true,
    description: 'aria-invalid styling marks the input and wrapper.',
  },
  {
    title: 'Disabled',
    kind: 'frameworks',
    isDisabled: true,
    description:
      'The disabled state keeps the model intact while removing interaction.',
  },
  {
    title: 'Auto Highlight',
    kind: 'autoHighlight',
    description:
      "create({ autoHighlight: true }) pre-activates the first option on every open, like base-ui's autoHighlight.",
  },
  {
    title: 'Popup',
    kind: 'popup',
    description:
      'The input-wrapper suffix renders as a toggle button, matching the trigger-button combobox that opens a searchable popup.',
  },
  {
    title: 'Input Group',
    kind: 'groups',
    description:
      'The grouped timezone list composes inside an input-group layout.',
  },
  {
    title: 'RTL',
    kind: 'rtl',
    description:
      'direction rtl mirrors the input, list, and item layout for Arabic copy.',
  },
]

export const comboboxFrameworks = [
  { value: 'foldkit', label: 'Foldkit' },
  { value: 'sveltekit', label: 'SvelteKit' },
  { value: 'nuxt', label: 'Nuxt.js' },
  { value: 'remix', label: 'Remix' },
  { value: 'astro', label: 'Astro' },
] as const

export const comboboxTimezones = [
  { value: 'new-york', label: '(GMT-5) New York', group: 'Americas' },
  { value: 'los-angeles', label: '(GMT-8) Los Angeles', group: 'Americas' },
  { value: 'chicago', label: '(GMT-6) Chicago', group: 'Americas' },
  { value: 'toronto', label: '(GMT-5) Toronto', group: 'Americas' },
  { value: 'vancouver', label: '(GMT-8) Vancouver', group: 'Americas' },
  { value: 'sao-paulo', label: '(GMT-3) São Paulo', group: 'Americas' },
  { value: 'london', label: '(GMT+0) London', group: 'Europe' },
  { value: 'paris', label: '(GMT+1) Paris', group: 'Europe' },
  { value: 'berlin', label: '(GMT+1) Berlin', group: 'Europe' },
  { value: 'rome', label: '(GMT+1) Rome', group: 'Europe' },
  { value: 'madrid', label: '(GMT+1) Madrid', group: 'Europe' },
  { value: 'amsterdam', label: '(GMT+1) Amsterdam', group: 'Europe' },
  { value: 'tokyo', label: '(GMT+9) Tokyo', group: 'Asia/Pacific' },
  { value: 'shanghai', label: '(GMT+8) Shanghai', group: 'Asia/Pacific' },
  { value: 'singapore', label: '(GMT+8) Singapore', group: 'Asia/Pacific' },
  { value: 'dubai', label: '(GMT+4) Dubai', group: 'Asia/Pacific' },
  { value: 'sydney', label: '(GMT+11) Sydney', group: 'Asia/Pacific' },
  { value: 'seoul', label: '(GMT+9) Seoul', group: 'Asia/Pacific' },
] as const

export const comboboxCountries = [
  {
    code: 'ar',
    value: 'argentina',
    label: 'Argentina',
    continent: 'South America',
  },
  { code: 'au', value: 'australia', label: 'Australia', continent: 'Oceania' },
  { code: 'br', value: 'brazil', label: 'Brazil', continent: 'South America' },
  { code: 'ca', value: 'canada', label: 'Canada', continent: 'North America' },
  { code: 'cn', value: 'china', label: 'China', continent: 'Asia' },
  {
    code: 'co',
    value: 'colombia',
    label: 'Colombia',
    continent: 'South America',
  },
  { code: 'eg', value: 'egypt', label: 'Egypt', continent: 'Africa' },
  { code: 'fr', value: 'france', label: 'France', continent: 'Europe' },
  { code: 'de', value: 'germany', label: 'Germany', continent: 'Europe' },
  { code: 'it', value: 'italy', label: 'Italy', continent: 'Europe' },
  { code: 'jp', value: 'japan', label: 'Japan', continent: 'Asia' },
  { code: 'ke', value: 'kenya', label: 'Kenya', continent: 'Africa' },
  { code: 'mx', value: 'mexico', label: 'Mexico', continent: 'North America' },
  {
    code: 'nz',
    value: 'new-zealand',
    label: 'New Zealand',
    continent: 'Oceania',
  },
  { code: 'ng', value: 'nigeria', label: 'Nigeria', continent: 'Africa' },
  {
    code: 'za',
    value: 'south-africa',
    label: 'South Africa',
    continent: 'Africa',
  },
  { code: 'kr', value: 'south-korea', label: 'South Korea', continent: 'Asia' },
  { code: 'es', value: 'spain', label: 'Spain', continent: 'Europe' },
  { code: 'se', value: 'sweden', label: 'Sweden', continent: 'Europe' },
  {
    code: 'ch',
    value: 'switzerland',
    label: 'Switzerland',
    continent: 'Europe',
  },
  {
    code: 'gb',
    value: 'united-kingdom',
    label: 'United Kingdom',
    continent: 'Europe',
  },
  {
    code: 'us',
    value: 'united-states',
    label: 'United States',
    continent: 'North America',
  },
] as const

export const comboboxRtlCategories = [
  { value: 'technology', label: 'التكنولوجيا' },
  { value: 'design', label: 'التصميم' },
  { value: 'business', label: 'الأعمال' },
  { value: 'marketing', label: 'التسويق' },
  { value: 'education', label: 'التعليم' },
  { value: 'health', label: 'الصحة' },
] as const

const itemsCode = (kind: ComboboxFixture['kind']): string => {
  if (kind === 'groups') {
    return `const timezones = [
  { value: 'new-york', label: '(GMT-5) New York', group: 'Americas' },
  { value: 'los-angeles', label: '(GMT-8) Los Angeles', group: 'Americas' },
  { value: 'london', label: '(GMT+0) London', group: 'Europe' },
  { value: 'paris', label: '(GMT+1) Paris', group: 'Europe' },
  { value: 'tokyo', label: '(GMT+9) Tokyo', group: 'Asia/Pacific' },
  { value: 'dubai', label: '(GMT+4) Dubai', group: 'Asia/Pacific' },
]`
  }
  if (kind === 'popup') {
    return `const countries = [
  { code: '', value: '', label: 'Select country', continent: '' },
  { code: 'ar', value: 'argentina', label: 'Argentina', continent: 'South America' },
  { code: 'au', value: 'australia', label: 'Australia', continent: 'Oceania' },
  { code: 'br', value: 'brazil', label: 'Brazil', continent: 'South America' },
  { code: 'ca', value: 'canada', label: 'Canada', continent: 'North America' },
  { code: 'cn', value: 'china', label: 'China', continent: 'Asia' },
  { code: 'co', value: 'colombia', label: 'Colombia', continent: 'South America' },
  { code: 'eg', value: 'egypt', label: 'Egypt', continent: 'Africa' },
  { code: 'fr', value: 'france', label: 'France', continent: 'Europe' },
  { code: 'de', value: 'germany', label: 'Germany', continent: 'Europe' },
  { code: 'it', value: 'italy', label: 'Italy', continent: 'Europe' },
  { code: 'jp', value: 'japan', label: 'Japan', continent: 'Asia' },
  { code: 'ke', value: 'kenya', label: 'Kenya', continent: 'Africa' },
  { code: 'mx', value: 'mexico', label: 'Mexico', continent: 'North America' },
  { code: 'nz', value: 'new-zealand', label: 'New Zealand', continent: 'Oceania' },
  { code: 'ng', value: 'nigeria', label: 'Nigeria', continent: 'Africa' },
  { code: 'za', value: 'south-africa', label: 'South Africa', continent: 'Africa' },
  { code: 'kr', value: 'south-korea', label: 'South Korea', continent: 'Asia' },
  { code: 'gb', value: 'united-kingdom', label: 'United Kingdom', continent: 'Europe' },
  { code: 'us', value: 'united-states', label: 'United States', continent: 'North America' },
]`
  }
  if (kind === 'custom') {
    return `const countries = [
  { code: 'ar', value: 'argentina', label: 'Argentina', continent: 'South America' },
  { code: 'au', value: 'australia', label: 'Australia', continent: 'Oceania' },
  { code: 'ca', value: 'canada', label: 'Canada', continent: 'North America' },
  { code: 'de', value: 'germany', label: 'Germany', continent: 'Europe' },
  { code: 'jp', value: 'japan', label: 'Japan', continent: 'Asia' },
  { code: 'us', value: 'united-states', label: 'United States', continent: 'North America' },
]`
  }
  if (kind === 'rtl') {
    return `const categories = [
  { value: 'technology', label: 'التكنولوجيا' },
  { value: 'design', label: 'التصميم' },
  { value: 'business', label: 'الأعمال' },
  { value: 'marketing', label: 'التسويق' },
]`
  }
  return `const frameworks = [
  { value: 'foldkit', label: 'Foldkit' },
  { value: 'sveltekit', label: 'SvelteKit' },
  { value: 'nuxt', label: 'Nuxt.js' },
  { value: 'remix', label: 'Remix' },
  { value: 'astro', label: 'Astro' },
]`
}

const itemsExpr = (kind: ComboboxFixture['kind']): string =>
  kind === 'groups'
    ? 'timezones'
    : kind === 'custom' || kind === 'popup'
      ? 'countries'
      : kind === 'rtl'
        ? 'categories'
        : 'frameworks'

const comboboxCall = (fixture: ComboboxFixture, isStyleX: boolean): string => {
  const items = itemsExpr(fixture.kind)
  const extra: string[] = []
  if (fixture.kind === 'groups') {
    extra.push(
      `itemGroupKey: item => item.group,\n        groupToHeading: group => group,`,
    )
  }
  if (fixture.kind === 'custom') {
    extra.push(
      `itemToConfig: item => ({
          content: h.span([h.Class('flex flex-col')], [
            h.span([], [item.label]),
            h.span([h.Class('text-muted-foreground text-xs')], [item.continent]),
          ]),
          searchText: \`\${item.label} \${item.continent}\`,
        }),`,
    )
  }
  if (fixture.isInvalid === true) extra.push('isInvalid: true,')
  if (fixture.isDisabled === true) extra.push('isDisabled: true,')
  if (fixture.kind === 'rtl') {
    extra.push(`direction: 'rtl',`)
  }
  if (fixture.kind === 'popup') {
    extra.push(
      isStyleX
        ? `trigger: {
          content: Icon.chevronsUpDown({ class: className(styles.chevron) }, h),
          ariaLabel: 'Toggle options',
          layoutStyle: layoutStyle({
    height: "1.5rem",
    width: "1.5rem",
    flexShrink: 0,
    alignSelf: "center",
    marginInlineEnd: "0.25rem",
  }),
        },`
        : `trigger: {
          content: Icon.chevronsUpDown({ class: 'size-4 opacity-50' }, h),
          ariaLabel: 'Toggle options',
          class: 'size-6 shrink-0 self-center rounded-sm opacity-70',
        },`,
    )
  }
  const placeholder =
    fixture.kind === 'groups'
      ? 'Select a timezone'
      : fixture.kind === 'custom' || fixture.kind === 'popup'
        ? 'Select country'
        : fixture.kind === 'rtl'
          ? 'أضف فئات'
          : 'Select a framework'
  const aria =
    fixture.kind === 'groups'
      ? 'Timezone'
      : fixture.kind === 'custom' || fixture.kind === 'popup'
        ? 'Country'
        : fixture.kind === 'rtl'
          ? 'الفئات'
          : 'Framework'
  return `${fixture.kind === 'autoHighlight' ? 'ExampleCombobox' : 'Combobox'}.combobox({
        model: model.combobox,
        maybeSelectedValue: model.maybeValue,
        restingInputValue: Option.match(model.maybeValue, { onNone: () => '', onSome: value => ${items}.find(item => item.value === value)?.label ?? value }),
        toParentMessage: message => GotComboboxMessage({ message }),
        items: ${items},
        itemToValue: item => item.value,
        itemToLabel: item => item.label,
        placeholder: '${placeholder}',
        ariaLabel: '${aria}',
        ${extra.join('\n        ')}
      }, h)`
}

const comboboxSource = (
  fixture: ComboboxFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  if (fixture.kind === 'multiple') {
    return multipleSource(fixture, renderer)
  }
  const isStyleX = renderer !== 'tailwind'
  const dir = isStyleX ? 'stylex' : 'ui'
  const isClear = fixture.kind === 'clear'
  const isAuto = fixture.kind === 'autoHighlight'
  const isPopup = fixture.kind === 'popup'
  const usesIcon = isClear || isPopup
  const messages = `import { taggedStruct } from 'foldkit/schema'
export const GotComboboxMessage = taggedStruct('GotComboboxMessage', { message: Combobox.Message });${isClear ? "\nexport const ClickedClear = taggedStruct('ClickedClear', {});" : ''}
export const Message = S.Union([GotComboboxMessage${isClear ? ', ClickedClear' : ''}])
export type Message = typeof Message.Type`
  const update = `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotComboboxMessage': {
      const next = ${isAuto ? 'ExampleCombobox' : 'Combobox'}.update(model.combobox, message.message)
      const maybeOut = Option.fromNullishOr(next.outMessage)
      const maybeValue = Option.match(maybeOut, {
        onNone: () => model.maybeValue,
        onSome: out => out._tag === 'Selected' ? Option.some(out.value) : Option.none(),
      })
      return {
        model: { ...model, combobox: next.model, maybeValue },
        commands: Command.mapMessages(next.commands ?? [], child => GotComboboxMessage({ message: child })),
      }
    }${
      isClear
        ? `
    case 'ClickedClear': {
      const next = model.combobox.isOpen
        ? Combobox.update(
            model.combobox,
            Combobox.Message.BlurredInput({ restingInputValue: '', isClearable: true }),
          )
        : { model: { ...model.combobox, inputValue: '' }, commands: [] }
      return {
        model: { ...model, combobox: next.model, maybeValue: Option.none() },
        commands: Command.mapMessages(next.commands ?? [], child => GotComboboxMessage({ message: child })),
      }
    }`
        : ''
    }
  }
}`
  const view = `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: '${fixture.title}',
  body: h.main([], [
    h.div([h.Class('flex items-center gap-2')], [
      ${comboboxCall(fixture, isStyleX)},${
        isClear
          ? `
      h.div([h.Class('relative z-50'), h.OnMouseDown(ClickedClear())], [
        Button.button({
          variant: 'ghost',
          size: 'icon',
          ariaLabel: 'Clear selection',
          onClick: ClickedClear(),
          children: [Icon.icon('x', { class: 'size-4' }, h)],
        }, h),
      ]),`
          : ''
      }
    ]),
  ]),
})`

  return foldkitApplication({
    title: `Combobox — ${fixture.title}`,
    imports: `import { Option, Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'

${
  isStyleX && isPopup
    ? `import * as stylex from '@stylexjs/stylex'
import { className } from '@/stylex/style'\nimport { layoutStyle } from '@/stylex/contracts'
`
    : ''
}import * as Combobox from '@/${dir}/combobox'${
      isClear
        ? `
import * as Button from '@/${dir}/button'`
        : ''
    }${
      usesIcon
        ? `
import * as Icon from '@/lib/icon'`
        : ''
    }${
      isPopup && isStyleX
        ? `

const styles = stylex.create({
  chevron: { height: '1rem', width: '1rem', opacity: 0.5 },
  toggleButton: {
    height: '1.5rem',
    width: '1.5rem',
    flexShrink: 0,
    alignSelf: 'center',
    marginInlineEnd: '0.25rem',
  },
})`
        : ''
    }`,
    model: `${
      isAuto
        ? `const ExampleCombobox = Combobox.create<string>({ autoHighlight: true })
`
        : ''
    }export const Model = S.Struct({
  combobox: Combobox.Model,
  maybeValue: S.Option(S.String),
})
export type Model = typeof Model.Type

${itemsCode(fixture.kind)}`,
    messages,
    init: `export const init = (): Update.Return<Model, Message> => {
  const combobox = Combobox.init({ id: 'docs-combobox', isAnimated: true })
  return {
    model: {
      combobox: ${isClear ? "{ ...combobox, inputValue: 'Foldkit' }" : 'combobox'},
      maybeValue: ${isClear ? "Option.some('foldkit')" : 'Option.none()'},
    },
  }
}`,
    update,
    view,
  })
}

const multipleSource = (
  fixture: ComboboxFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isStyleX = renderer !== 'tailwind'
  const dir = isStyleX ? 'stylex' : 'ui'
  return foldkitApplication({
    title: `Combobox — ${fixture.title}`,
    imports: `import { Option, Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'

${
  isStyleX
    ? `import * as stylex from '@stylexjs/stylex'
import { className } from '@/stylex/style'\nimport { layoutStyle } from '@/stylex/contracts'
`
    : ''
}import * as Combobox from '@/${dir}/combobox'
import * as Icon from '@/lib/icon'

const frameworks = [
  { value: 'foldkit', label: 'Foldkit' },
  { value: 'sveltekit', label: 'SvelteKit' },
  { value: 'nuxt', label: 'Nuxt.js' },
  { value: 'remix', label: 'Remix' },
  { value: 'astro', label: 'Astro' },
]${
      isStyleX
        ? `

const styles = stylex.create({
  chipsBox: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '0.25rem',
    width: '100%',
    maxWidth: '20rem',
  },
  chip: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
    borderRadius: '0.375rem',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--border)',
    backgroundColor: 'var(--accent)',
    paddingInline: '0.375rem',
    paddingBlock: '0.125rem',
    fontSize: '0.75rem', lineHeight: '1rem',
    fontWeight: 500,
  },
  chipButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '0.125rem',
    opacity: 0.6,
  },
  chipIcon: { height: '0.75rem', width: '0.75rem' },
  multiInput: { height: '1.75rem', minWidth: '4rem', flexGrow: 1 },
})`
        : ''
    }`,
    model: `const ExampleMulti = Combobox.createMulti<string>({ autoHighlight: true })
export const Model = S.Struct({
  multi: Combobox.MultiModel,
  selectedValues: S.Array(S.String),
})
export type Model = typeof Model.Type`,
    messages: `import { taggedStruct } from 'foldkit/schema'
export const GotMultiMessage = taggedStruct('GotMultiMessage', { message: Combobox.Message });
export const RemovedChip = taggedStruct('RemovedChip', { value: S.String });
export const Message = S.Union([GotMultiMessage, RemovedChip])
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: {
    multi: Combobox.multiInit({ id: 'docs-multi-combobox', isAnimated: true }),
    selectedValues: ['foldkit'],
  },
})`,
    update: `export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotMultiMessage': {
      const next = ExampleMulti.update(model.multi, message.message)
      const maybeOut = Option.fromNullishOr(next.outMessage)
      const selectedValues = Option.match(maybeOut, {
        onNone: () => model.selectedValues,
        onSome: out =>
          out._tag === 'Selected'
            ? model.selectedValues.includes(out.value)
              ? model.selectedValues.filter(value => value !== out.value)
              : [...model.selectedValues, out.value]
            : model.selectedValues,
      })
      return {
        model: { ...model, multi: next.model, selectedValues },
        commands: Command.mapMessages(next.commands ?? [], child => GotMultiMessage({ message: child })),
      }
    }
    case 'RemovedChip':
      return {
        model: {
          ...model,
          selectedValues: model.selectedValues.filter(value => value !== message.value),
        },
      }
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Multiple',
  body: h.main([], [
    h.div([${isStyleX ? `h.Class(className(styles.chipsBox))` : `h.Class('flex w-full max-w-xs flex-wrap items-center gap-1')`}], [
      ...model.selectedValues.map(value =>
        h.span([${isStyleX ? `h.Class(className(styles.chip))` : `h.Class('flex items-center gap-1 rounded-md border bg-accent px-1.5 py-0.5 text-xs font-medium')`}], [
          frameworks.find(item => item.value === value)?.label ?? value,
          h.button([
            ${isStyleX ? `h.Class(className(styles.chipButton)),` : `h.Class('inline-flex items-center justify-center rounded-sm opacity-60 hover:opacity-100'),`}
            h.AriaLabel(\`Remove \${value}\`),
            h.OnClick(RemovedChip({ value })),
          ], [Icon.x({ class: ${isStyleX ? `className(styles.chipIcon)` : `'size-3'`} }, h)]),
        ])),
      ExampleMulti.comboboxMulti({
        model: model.multi,
        selectedValues: model.selectedValues,
        toParentMessage: message => GotMultiMessage({ message }),
        items: frameworks,
        itemToValue: item => item.value,
        itemToLabel: item => item.label,
        placeholder: model.selectedValues.length === 0 ? 'Select a framework' : '',
        ariaLabel: 'Frameworks',
        ${isStyleX ? `triggerLayoutStyle: styles.multiInput,` : `triggerClass: 'h-7 min-w-16 flex-1 border-none px-1',`}
      }, h),
    ]),
  ]),
})`,
  })
}

const comboboxExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  comboboxFixtures.map(fixture => ({
    title: fixture.title,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    ...(fixture.heroOnly === true ? { heroOnly: true } : {}),
    code: comboboxSource(fixture, renderer),
  }))

export const comboboxExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, comboboxExamplesFor(renderer))
