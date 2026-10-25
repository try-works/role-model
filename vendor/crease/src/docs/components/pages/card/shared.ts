import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import {
  foldkitApplication,
  staticComponentApplication,
} from '@/docs/components/pages/authored-page'

export type CardFixture = Readonly<{
  title: string
  description: string
  kind: 'login' | 'small' | 'spacing' | 'edge' | 'image' | 'rtl'
}>

export const cardFixtures: Readonly<[CardFixture, ...Array<CardFixture>]> = [
  {
    title: 'Basic',
    description:
      'A card with a header action, labeled inputs, and stacked footer buttons.',
    kind: 'login',
  },
  {
    title: 'Size',
    description:
      'Use the `size="sm"` prop to set the size of the card to small. The small size variant uses smaller spacing.',
    kind: 'small',
  },
  {
    title: 'Spacing',
    description:
      'Use the `--card-spacing` CSS variable to control the spacing between sections and the inset of card parts.',
    kind: 'spacing',
  },
  {
    title: 'Edge to Edge',
    description:
      'Use negative margins with `-mx-(--card-spacing)` to make content go edge to edge while keeping it aligned with the card inset. When the edge-to-edge content sits above a footer, use `-mb-(--card-spacing)` on `CardContent` to remove the section gap.',
    kind: 'edge',
  },
  {
    title: 'Image',
    description:
      'Add an image before the card header to create a card with an image.',
    kind: 'image',
  },
  {
    title: 'RTL',
    description:
      'The card layout mirrors automatically for right-to-left languages when `dir="rtl"` is set.',
    kind: 'rtl',
  },
]

const IMAGE_URL = 'https://avatar.vercel.sh/creaseui'

export const cardRtlCopy = {
  title: 'تسجيل الدخول إلى حسابك',
  description: 'أدخل بريدك الإلكتروني أدناه لتسجيل الدخول إلى حسابك',
  signUp: 'إنشاء حساب',
  email: 'البريد الإلكتروني',
  password: 'كلمة المرور',
  forgot: 'نسيت كلمة المرور؟',
  login: 'تسجيل الدخول',
  google: 'تسجيل الدخول باستخدام Google',
} as const

const ui = (renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat'): string =>
  renderer !== 'tailwind' ? 'stylex' : 'ui'

const cls = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
  tailwindValue: string,
  ...styleKeys: ReadonlyArray<string>
): string =>
  renderer === 'tailwind'
    ? `h.Class('${tailwindValue}')`
    : `h.Class(stylex.props(${styleKeys.map(k => `styles.${k}`).join(', ')}).className ?? '')`

const prop = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
  tailwindValue: string,
  styleKey: string,
): string =>
  renderer === 'tailwind'
    ? `class: '${tailwindValue}'`
    : `layoutStyle: styles.${styleKey}`

const STYLEX_STYLES = {
  frame: `{ maxWidth: '24rem', width: '100%' }`,
  smallCard: `{ marginInline: 'auto', maxWidth: '20rem', width: '100%' }`,
  loginWrap: `{ display: 'grid', gap: '1rem', justifyItems: 'center', maxWidth: '24rem', width: '100%', marginInline: 'auto' }`,
  fieldGrid: `{ display: 'grid', gap: '0.5rem' }`,
  fieldRow: `{ display: 'flex', alignItems: 'center' }`,
  link: `{ color: 'inherit', fontSize: '0.875rem', lineHeight: '1.25rem', marginLeft: 'auto', textDecorationLine: { default: 'none', ':hover': 'underline' }, textUnderlineOffset: '4px' }`,
  footerCol: `{ flexDirection: 'column', gap: '0.5rem', display: 'flex', width: '100%' }`,
  wFull: `{ width: '100%' }`,
  list: `{ display: 'grid', gap: '0.5rem', paddingBlock: '0.5rem', fontSize: '0.875rem', lineHeight: '1.25rem', listStyle: 'none', paddingInlineStart: 0 }`,
  li: `{ display: 'flex', gap: '0.5rem' }`,
  liIcon: `{ marginTop: '0.125rem', flexShrink: 0, color: 'var(--muted-foreground)' }`,
  liMarker: `{ width: '1rem', height: '1rem' }`,
  edgeCard: `{ marginInline: 'auto', maxWidth: '24rem', width: '100%' }`,
  edgeContent: `{ marginBlockEnd: 'calc(var(--card-spacing, 1.5rem) * -1)' }`,
  edgeScroll: `{ marginInline: 'calc(var(--card-spacing, 1.5rem) * -1)', maxHeight: '12rem', overflowY: 'scroll', borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: 'var(--border)', backgroundColor: 'color-mix(in oklab, var(--muted) 50%, transparent)', paddingInline: 'var(--card-spacing, 1.5rem)', paddingBlock: '1rem', fontSize: '0.875rem', lineHeight: 1.625, display: 'flex', flexDirection: 'column', gap: '1rem' }`,
  edgeFooterInner: `{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', width: '100%' }`,
  imageWrap: `{ position: 'relative' }`,
  overlay: `{ position: 'absolute', inset: 0, zIndex: 30, aspectRatio: '16 / 9', backgroundColor: 'color-mix(in oklab, var(--color-black, #000) 35%, transparent)' }`,
  cover: `{ position: 'relative', zIndex: 20, aspectRatio: '16 / 9', width: '100%', objectFit: 'cover', filter: 'grayscale(100%) brightness(0.6)' }`,
} as const
type StylexStyleKey = keyof typeof STYLEX_STYLES

const stylexImports = (keys: ReadonlyArray<StylexStyleKey>): string =>
  `import * as stylex from '@stylexjs/stylex'
import { layoutStyle } from '@/stylex/contracts'\nimport type { ComponentLayoutStyle } from '@/stylex/contracts'\n\nconst styles = stylex.create({\n${keys.map(k => `  ${k}: ${STYLEX_STYLES[k]},`).join('\n')}\n})`

const styleKeysFor = (
  kind: CardFixture['kind'],
): ReadonlyArray<StylexStyleKey> => {
  const login: ReadonlyArray<StylexStyleKey> = [
    'frame',
    'fieldGrid',
    'fieldRow',
    'link',
    'footerCol',
    'wFull',
  ]
  switch (kind) {
    case 'spacing':
      return ['loginWrap', ...login]
    case 'small':
      return [
        'smallCard',
        'list',
        'li',
        'liIcon',
        'liMarker',
        'footerCol',
        'wFull',
      ]
    case 'edge':
      return ['edgeCard', 'edgeContent', 'edgeScroll', 'edgeFooterInner']
    case 'image':
      return ['imageWrap', 'overlay', 'cover', 'wFull']
    default:
      return login
  }
}

/** Source for the login card content (Basic, Spacing, RTL fixtures). */
const loginCardSource = (
  opts: Readonly<{
    rtl: boolean
    spacingVar?: 'none' | 'static' | 'dynamic'
    renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat'
  }>,
): string => {
  const copy = opts.rtl
    ? {
        title: cardRtlCopy.title,
        description: cardRtlCopy.description,
        signUp: cardRtlCopy.signUp,
        email: cardRtlCopy.email,
        password: cardRtlCopy.password,
        forgot: cardRtlCopy.forgot,
        login: cardRtlCopy.login,
        google: cardRtlCopy.google,
      }
    : {
        title: 'Login to your account',
        description: 'Enter your email below to login to your account',
        signUp: 'Sign Up',
        email: 'Email',
        password: 'Password',
        forgot: 'Forgot your password?',
        login: 'Login',
        google: 'Login with Google',
      }
  const spacingPart =
    opts.spacingVar === 'static' ? ' [--card-spacing:--spacing(4)]' : ''
  const cardClass =
    opts.renderer === 'tailwind'
      ? opts.spacingVar === 'dynamic'
        ? 'class: `w-full max-w-sm ${spacingClasses[model.spacing]}`,'
        : `class: 'w-full max-w-sm${spacingPart}',`
      : `layoutStyle: layoutStyle({ maxWidth: "24rem", width: "100%" }),`
  const inputBlock = (
    id: string,
    label: string,
    opts2: Readonly<{ type: string; placeholder?: string; row?: 'split' }>,
  ): string => `h.div([${cls(opts.renderer, 'grid gap-2', 'fieldGrid')}], [
          ${
            opts2.row === 'split'
              ? `h.div([${cls(opts.renderer, 'flex items-center', 'fieldRow')}], [
            Label.label({ for: '${id}', children: ['${label}'] }, h),
            h.a([h.Href('#'), ${cls(opts.renderer, 'ml-auto inline-block text-sm underline-offset-4 hover:underline', 'link')}], ['${copy.forgot}']),
          ]),`
              : `Label.label({ for: '${id}', children: ['${label}'] }, h),`
          }
          Input.input({ id: '${id}', type: '${opts2.type}', value: model.${id === 'card-email' ? 'email' : 'password'}, onInput: value => Changed${id === 'card-email' ? 'Email' : 'Password'}({ value }),${opts2.placeholder === undefined ? '' : ` placeholder: '${opts2.placeholder}',`} }, h),
        ])`

  return `Card.card({
  ${cardClass}
  children: [
    Card.cardHeader({ children: [
      Card.cardTitle({ children: ['${copy.title}'] }, h),
      Card.cardDescription({ children: ['${copy.description}'] }, h),
      Card.cardAction({ children: [
        Button.button({ variant: 'link', children: ['${copy.signUp}'] }, h),
      ] }, h),
    ] }, h),
    Card.cardContent({ children: [
      ${inputBlock('card-email', copy.email, { type: 'email', placeholder: 'm@example.com' })},
      ${inputBlock('card-password', copy.password, { type: 'password', row: 'split' })},
    ] }, h),
    ${
      opts.renderer === 'tailwind'
        ? `Card.cardFooter({ class: 'flex-col gap-2', children: [
      Button.button({ class: 'w-full', children: ['${copy.login}'] }, h),
      Button.button({ variant: 'outline', class: 'w-full', children: ['${copy.google}'] }, h),
    ] }, h)`
        : `Card.cardFooter({ children: [
      h.div([h.Class(stylex.props(styles.footerCol).className ?? '')], [
        Button.button({ layoutStyle: layoutStyle({ width: "100%" }), children: ['${copy.login}'] }, h),
        Button.button({ variant: 'outline', layoutStyle: layoutStyle({ width: "100%" }), children: ['${copy.google}'] }, h),
      ]),
    ] }, h)`
    }
  ],
}, h)`
}

const smallCardSource = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => `Card.card({
  size: 'sm',
  ${renderer === 'tailwind' ? `class: 'mx-auto w-full max-w-xs',` : `layoutStyle: layoutStyle({ marginInline: "auto", maxWidth: "20rem", width: "100%" }),`}
  children: [
    Card.cardHeader({ children: [
      Card.cardTitle({ children: ['Scheduled reports'] }, h),
      Card.cardDescription({ children: ['Weekly snapshots. No more manual exports.'] }, h),
    ] }, h),
    Card.cardContent({ children: [
      h.ul([${cls(renderer, 'grid gap-2 py-2 text-sm', 'list')}], [
        h.li([${cls(renderer, 'flex gap-2', 'li')}], [
          Icon.icon('chevron-right', { class: ${renderer === 'tailwind' ? `'mt-0.5 size-4 shrink-0 text-muted-foreground'` : `stylex.props(styles.liIcon, styles.liMarker).className ?? ''`} }, h),
          h.span([], ['Choose a schedule (daily, or weekly).']),
        ]),
        h.li([${cls(renderer, 'flex gap-2', 'li')}], [
          Icon.icon('chevron-right', { class: ${renderer === 'tailwind' ? `'mt-0.5 size-4 shrink-0 text-muted-foreground'` : `stylex.props(styles.liIcon, styles.liMarker).className ?? ''`} }, h),
          h.span([], ['Send to channels or specific teammates.']),
        ]),
        h.li([${cls(renderer, 'flex gap-2', 'li')}], [
          Icon.icon('chevron-right', { class: ${renderer === 'tailwind' ? `'mt-0.5 size-4 shrink-0 text-muted-foreground'` : `stylex.props(styles.liIcon, styles.liMarker).className ?? ''`} }, h),
          h.span([], ['Include charts, tables, and key metrics.']),
        ]),
      ]),
    ] }, h),
    ${
      renderer === 'tailwind'
        ? `Card.cardFooter({ class: 'flex-col gap-2', children: [
      Button.button({ size: 'sm', class: 'w-full', children: ['Set up scheduled reports'] }, h),
      Button.button({ variant: 'outline', size: 'sm', class: 'w-full', children: ["See what's new"] }, h),
    ] }, h)`
        : `Card.cardFooter({ children: [
      h.div([h.Class(stylex.props(styles.footerCol).className ?? '')], [
        Button.button({ size: 'sm', layoutStyle: layoutStyle({ width: "100%" }), children: ['Set up scheduled reports'] }, h),
        Button.button({ variant: 'outline', size: 'sm', layoutStyle: layoutStyle({ width: "100%" }), children: ["See what's new"] }, h),
      ]),
    ] }, h)`
    }
  ],
}, h)`

const edgeCardSource = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => `Card.card({
  ${renderer === 'tailwind' ? `class: 'mx-auto w-full max-w-sm',` : `layoutStyle: layoutStyle({ marginInline: "auto", maxWidth: "24rem", width: "100%" }),`}
  children: [
    Card.cardHeader({ children: [
      Card.cardTitle({ children: ['Terms of Service'] }, h),
      Card.cardDescription({ children: ['Review the terms before accepting the agreement.'] }, h),
    ] }, h),
    Card.cardContent({ ${prop(renderer, '-mb-(--card-spacing)', 'edgeContent')}, children: [
      h.div([${cls(renderer, '-mx-(--card-spacing) max-h-48 space-y-4 overflow-y-scroll border-t bg-muted/50 px-(--card-spacing) py-4 text-sm leading-relaxed', 'edgeScroll')}], [
        h.p([], ['These terms govern your use of the workspace, including access to shared documents, project files, and collaboration tools.']),
        h.p([], ['You are responsible for the content you upload and for ensuring that your team has the appropriate permissions to view or edit it.']),
        h.p([], ['We may update features or limits as the service evolves. When those changes materially affect your workflow, we will notify your workspace administrators.']),
        h.p([], ["By continuing, you agree to keep your account credentials secure and to follow your organization's acceptable use policies."]),
      ]),
    ] }, h),
    ${
      renderer === 'tailwind'
        ? `Card.cardFooter({ class: 'justify-end gap-2', children: [
      Button.button({ variant: 'outline', children: ['Decline'] }, h),
      Button.button({ children: ['Accept'] }, h),
    ] }, h)`
        : `Card.cardFooter({ children: [
      h.div([h.Class(stylex.props(styles.edgeFooterInner).className ?? '')], [
        Button.button({ variant: 'outline', children: ['Decline'] }, h),
        Button.button({ children: ['Accept'] }, h),
      ]),
    ] }, h)`
    },
  ],
}, h)`

const imageCardSource = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const cardExpr = `Card.card({
  ${
    renderer === 'tailwind'
      ? `class: 'relative mx-auto w-full max-w-sm pt-0',`
      : `density: 'flush',
  layoutStyle: layoutStyle({ marginInline: 'auto', maxWidth: '24rem', width: '100%' }),`
  }
  children: [${
    renderer === 'tailwind'
      ? ''
      : `
    h.div([h.Class(stylex.props(styles.imageWrap).className ?? '')], [`
  }
    h.div([${cls(renderer, 'absolute inset-0 z-30 aspect-video bg-black/35', 'overlay')}]),
    h.img([
      h.Src('${IMAGE_URL}'),
      h.Alt('Event cover'),
      ${cls(renderer, 'relative z-20 aspect-video w-full object-cover brightness-60 grayscale dark:brightness-40', 'cover')},
    ]),${
      renderer === 'tailwind'
        ? ''
        : `
    ]),`
    }
    Card.cardHeader({ children: [
      Card.cardAction({ children: [
        Badge.badge({ variant: 'secondary', children: ['Featured'] }, h),
      ] }, h),
      Card.cardTitle({ children: ['Design systems meetup'] }, h),
      Card.cardDescription({ children: ['A practical talk on component APIs, accessibility, and shipping faster.'] }, h),
    ] }, h),
    Card.cardFooter({ children: [
      Button.button({ ${prop(renderer, 'w-full', 'wFull')}, children: ['View Event'] }, h),
    ] }, h),
  ],
}, h)`
  return cardExpr
}

const fixtureImports = (
  fixture: CardFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const base = [
    `import * as Button from '@/${ui(renderer)}/button'`,
    `import * as Input from '@/${ui(renderer)}/input'`,
    `import * as Label from '@/${ui(renderer)}/label'`,
  ]
  const stylesImport =
    renderer !== 'tailwind'
      ? `\n${stylexImports(styleKeysFor(fixture.kind))}`
      : ''
  switch (fixture.kind) {
    case 'small':
      return (
        [
          `import * as Icon from '@/lib/icon'`,
          `import * as Button from '@/${ui(renderer)}/button'`,
        ].join('\n') + stylesImport
      )
    case 'edge':
      return `import * as Button from '@/${ui(renderer)}/button'` + stylesImport
    case 'image':
      return (
        [
          `import * as Badge from '@/${ui(renderer)}/badge'`,
          `import * as Button from '@/${ui(renderer)}/button'`,
        ].join('\n') + stylesImport
      )
    default:
      return base.join('\n') + stylesImport
  }
}

const loginModel = `export const Model = S.Struct({ email: S.String, password: S.String })
export type Model = typeof Model.Type`
const loginMessages = `import { taggedStruct } from 'foldkit/schema'
export const ChangedEmail = taggedStruct('ChangedEmail', { value: S.String })
export const ChangedPassword = taggedStruct('ChangedPassword', { value: S.String })
export const Message = S.Union([ChangedEmail, ChangedPassword])
export type Message = typeof Message.Type`
const loginInit = `export const init = (): Update.Return<Model, Message> => ({ model: { email: '', password: '' } })`
const loginUpdate = `export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'ChangedEmail':
      return { model: { ...model, email: message.value } }
    case 'ChangedPassword':
      return { model: { ...model, password: message.value } }
  }
}`

const viewWrapper = (
  body: string,
  styled: boolean,
): string => `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Card — Login',
  body: h.main(
    [h.Class(${styled ? 'className(styles.shell)' : "'flex min-h-screen items-center justify-center p-8'"})],
    [
      ${body.split('\n').join('\n      ')}
    ],
  ),
})`

const source = (
  index: number,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const fixture = cardFixtures[index] ?? cardFixtures[0]
  const imports = [
    `import { Schema as S } from 'effect'`,
    `import { Command, Runtime, Subscription, Update } from 'foldkit'`,
    `import { type Document, type HtmlBuilder } from 'foldkit/html'`,
    `import * as Card from '@/${ui(renderer)}/card'`,
    fixtureImports(fixture, renderer),
  ].join('\n')

  switch (fixture.kind) {
    case 'login':
    case 'rtl':
      return foldkitApplication({
        title: `Card — ${fixture.title}`,
        imports,
        model: loginModel,
        messages: loginMessages,
        init: loginInit,
        update: loginUpdate,
        view: viewWrapper(
          `h.div(${fixture.kind === 'rtl' ? (renderer !== 'tailwind' ? `[h.Dir('rtl'), ${cls(renderer, '', 'frame')}]` : `[h.Dir('rtl'), h.Class('w-full max-w-sm')]`) : `[]`}, [
        ${loginCardSource({
          rtl: fixture.kind === 'rtl',
          spacingVar: 'none',
          renderer,
        })
          .split('\n')
          .join('\n        ')},
      ])`,
          renderer !== 'tailwind',
        ),
      })
    case 'spacing': {
      return foldkitApplication({
        title: 'Card — Spacing',
        imports: [
          imports,
          `import * as ToggleGroup from '@/${ui(renderer)}/toggle-group'`,
          `import { Option } from 'effect'`,
        ].join('\n'),
        model: `export const Model = S.Struct({
  email: S.String,
  password: S.String,
  spacing: S.Literals(['4', '5', '6', '8']),
  toggleGroup: ToggleGroup.Model,
})
export type Model = typeof Model.Type

export const spacingOptions = [
  { value: '4', label: '16px' },
  { value: '5', label: '20px' },
  { value: '6', label: '24px' },
  { value: '8', label: '32px' },
] as const
${
  renderer === 'tailwind'
    ? `

// Every option needs its own literal utility class — Tailwind only emits
// rules for classes it can find by scanning source files, so the
// --card-spacing value can't be interpolated into the class at runtime.
const spacingClasses: Record<Model['spacing'], string> = {
  '4': '[--card-spacing:--spacing(4)]',
  '5': '[--card-spacing:--spacing(5)]',
  '6': '[--card-spacing:--spacing(6)]',
  '8': '[--card-spacing:--spacing(8)]',
}`
    : ''
}`,
        messages: `import { taggedStruct } from 'foldkit/schema'
export const ChangedEmail = taggedStruct('ChangedEmail', { value: S.String })
export const ChangedPassword = taggedStruct('ChangedPassword', { value: S.String })
export const GotToggleGroupMessage = taggedStruct('GotToggleGroupMessage', { message: ToggleGroup.Message })
export const Message = S.Union([ChangedEmail, ChangedPassword, GotToggleGroupMessage])
export type Message = typeof Message.Type`,
        init: `export const init = (): Update.Return<Model, Message> => ({
  model: {
    email: '',
    password: '',
    spacing: '4',
    toggleGroup: ToggleGroup.init({ id: 'card-spacing' }),
  },
})`,
        update: `const SpacingToggleGroup = ToggleGroup.create<string>()

export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'ChangedEmail':
      return { model: { ...model, email: message.value } }
    case 'ChangedPassword':
      return { model: { ...model, password: message.value } }
    case 'GotToggleGroupMessage': {
      const result = SpacingToggleGroup.update(model.toggleGroup, message.message)
      const selection = Option.fromNullishOr(result.outMessage)
      return {
        model: {
          ...model,
          toggleGroup: result.model,
          spacing: Option.match(selection, {
            onNone: () => model.spacing,
            onSome: next => next.value as Model['spacing'],
          }),
        },
        commands: Command.mapMessages(
          result.commands ?? [],
          next => GotToggleGroupMessage({ message: next }),
        ),
      }
    }
  }
}`,
        view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Card — Spacing',
  body: h.main(
    [h.Class(${renderer !== 'tailwind' ? 'className(styles.shell)' : "'flex min-h-screen items-center justify-center p-8'"})],
    [
      h.div([${cls(renderer, 'grid w-full max-w-sm gap-4', 'loginWrap')}], [
        SpacingToggleGroup.toggleGroup({
          model: model.toggleGroup,
          toParentMessage: message => GotToggleGroupMessage({ message }),
          ariaLabel: 'Card spacing',
          variant: 'outline',
          size: 'sm',
          value: model.spacing,
          items: spacingOptions.map(option => ({ value: option.value, children: [option.label] })),
        }, h),
        ${
          renderer === 'tailwind'
            ? loginCardSource({ rtl: false, spacingVar: 'dynamic', renderer })
                .split('\n')
                .join('\n        ')
            : loginCardSource({ rtl: false, spacingVar: 'none', renderer })
                .replace(
                  'layoutStyle: layoutStyle({ maxWidth: "24rem", width: "100%" }),',
                  'layoutStyle: layoutStyle({ maxWidth: "24rem", width: "100%" }),\n  spacing: `\${Number(model.spacing) * 4}px`,',
                )
                .split('\n')
                .join('\n        ')
        },
      ]),
    ],
  ),
})`,
      })
    }
    case 'small':
      return staticComponentApplication({
        componentName: 'Card',
        componentSlug: 'card',
        renderer,
        exampleName: fixture.title,
        componentImports: fixtureImports(fixture, renderer),
        viewBody: smallCardSource(renderer),
      })
    case 'edge':
      return staticComponentApplication({
        componentName: 'Card',
        componentSlug: 'card',
        renderer,
        exampleName: fixture.title,
        componentImports: fixtureImports(fixture, renderer),
        viewBody: edgeCardSource(renderer),
      })
    case 'image':
      return staticComponentApplication({
        componentName: 'Card',
        componentSlug: 'card',
        renderer,
        exampleName: fixture.title,
        componentImports: fixtureImports(fixture, renderer),
        viewBody: imageCardSource(renderer),
      })
  }
}

const cardExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  cardFixtures.map((fixture, index) => ({
    title: fixture.title,
    description: fixture.description,
    code: source(index, renderer),
  }))

export const cardExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, cardExamplesFor(renderer))
