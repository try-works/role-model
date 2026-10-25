import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'
import type { AccordionType } from '@/lib/accordion-state'

export type AccordionFixtureItem = Readonly<{
  value: string
  trigger: string
  content: string
  isDisabled?: boolean
}>

export type AccordionFixture = Readonly<{
  kind: 'basic' | 'multiple' | 'disabled' | 'borders' | 'card' | 'rtl'
  title: string
  description: string
  type: AccordionType
  initialValue: ReadonlyArray<string>
  items: ReadonlyArray<AccordionFixtureItem>
}>

export const accordionCardCopy = {
  title: 'Subscription & Billing',
  description:
    'Common questions about your account, plans, payments and cancellations.',
} as const

export const accordionFixtures: Readonly<
  [AccordionFixture, ...Array<AccordionFixture>]
> = [
  {
    kind: 'basic',
    title: 'Basic',
    description:
      'A basic accordion that shows one item at a time. The first item is open by default.',
    type: 'single',
    initialValue: ['item-1'],
    items: [
      {
        value: 'item-1',
        trigger: 'How do I reset my password?',
        content:
          "Click on 'Forgot Password' on the login page, enter your email address, and we'll send you a link to reset your password. The link will expire in 24 hours.",
      },
      {
        value: 'item-2',
        trigger: 'Can I change my subscription plan?',
        content:
          'Yes, you can upgrade or downgrade your plan at any time from your account settings. Changes will be reflected in your next billing cycle.',
      },
      {
        value: 'item-3',
        trigger: 'What payment methods do you accept?',
        content:
          'We accept all major credit cards, PayPal, and bank transfers. All payments are processed securely through our payment partners.',
      },
    ],
  },
  {
    kind: 'multiple',
    title: 'Multiple',
    description:
      "Use `type: 'multiple'` to allow multiple items to be open at the same time.",
    type: 'multiple',
    initialValue: ['notifications'],
    items: [
      {
        value: 'notifications',
        trigger: 'Notification Settings',
        content:
          'Manage how you receive notifications. You can enable email alerts for updates or push notifications for mobile devices.',
      },
      {
        value: 'privacy',
        trigger: 'Privacy & Security',
        content:
          'Control your privacy settings and security preferences. Enable two-factor authentication, manage connected devices, review active sessions, and configure data sharing preferences. You can also download your data or delete your account.',
      },
      {
        value: 'billing',
        trigger: 'Billing & Subscription',
        content:
          'View your current plan, payment history, and upcoming invoices. Update your payment method, change your subscription tier, or cancel your subscription.',
      },
    ],
  },
  {
    kind: 'disabled',
    title: 'Disabled',
    description:
      'Use the `isDisabled` prop on an item to disable individual items.',
    type: 'single',
    initialValue: [],
    items: [
      {
        value: 'item-1',
        trigger: 'Can I access my account history?',
        content:
          'Yes, you can view your complete account history including all transactions, plan changes, and support tickets in the Account History section of your dashboard.',
      },
      {
        value: 'item-2',
        trigger: 'Premium feature information',
        content:
          'This section contains information about premium features. Upgrade your plan to access this content.',
        isDisabled: true,
      },
      {
        value: 'item-3',
        trigger: 'How do I update my email address?',
        content:
          "You can update your email address in your account settings. You'll receive a verification email at your new address to confirm the change.",
      },
    ],
  },
  {
    kind: 'borders',
    title: 'Borders',
    description:
      'Add `border` to the accordion and `border-b last:border-b-0` to the items to add borders to the items.',
    type: 'single',
    initialValue: ['billing'],
    items: [
      {
        value: 'billing',
        trigger: 'How does billing work?',
        content:
          'We offer monthly and annual subscription plans. Billing is charged at the beginning of each cycle, and you can cancel anytime. All plans include automatic backups, 24/7 support, and unlimited team members.',
      },
      {
        value: 'security',
        trigger: 'Is my data secure?',
        content:
          'Yes. We use end-to-end encryption, SOC 2 Type II compliance, and regular third-party security audits. All data is encrypted at rest and in transit using industry-standard protocols.',
      },
      {
        value: 'integration',
        trigger: 'What integrations do you support?',
        content:
          'We integrate with 500+ popular tools including Slack, Zapier, Salesforce, HubSpot, and more. You can also build custom integrations using our REST API and webhooks.',
      },
    ],
  },
  {
    kind: 'card',
    title: 'Card',
    description: 'Wrap the accordion in a `Card` component.',
    type: 'single',
    initialValue: ['plans'],
    items: [
      {
        value: 'plans',
        trigger: 'What subscription plans do you offer?',
        content:
          'We offer three subscription tiers: Starter ($9/month), Professional ($29/month), and Enterprise ($99/month). Each plan includes increasing storage limits, API access, priority support, and team collaboration features.',
      },
      {
        value: 'billing',
        trigger: 'How does billing work?',
        content:
          "Billing occurs automatically at the start of each billing cycle. We accept all major credit cards, PayPal, and ACH transfers for enterprise customers. You'll receive an invoice via email after each payment.",
      },
      {
        value: 'cancel',
        trigger: 'How do I cancel my subscription?',
        content:
          'You can cancel your subscription anytime from your account settings. There are no cancellation fees or penalties. Your access will continue until the end of your current billing period.',
      },
    ],
  },
  {
    kind: 'rtl',
    title: 'RTL',
    description: 'Rendered inside `dir="rtl"` with localized copy.',
    type: 'single',
    initialValue: ['item-1'],
    items: [
      {
        value: 'item-1',
        trigger: 'كيف يمكنني إعادة تعيين كلمة المرور؟',
        content:
          "انقر على 'نسيت كلمة المرور' في صفحة تسجيل الدخول، أدخل عنوان بريدك الإلكتروني، وسنرسل لك رابطًا لإعادة تعيين كلمة المرور. سينتهي صلاحية الرابط خلال 24 ساعة.",
      },
      {
        value: 'item-2',
        trigger: 'هل يمكنني تغيير خطة الاشتراك الخاصة بي؟',
        content:
          'نعم، يمكنك ترقية أو تخفيض خطتك في أي وقت من إعدادات حسابك. ستظهر التغييرات في دورة الفوترة التالية.',
      },
      {
        value: 'item-3',
        trigger: 'ما هي طرق الدفع التي تقبلونها؟',
        content:
          'نقبل جميع بطاقات الائتمان الرئيسية و PayPal والتحويلات المصرفية. تتم معالجة جميع المدفوعات بأمان من خلال شركاء الدفع لدينا.',
      },
    ],
  },
]

const esc = (value: string): string =>
  value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")

const itemsSource = (items: ReadonlyArray<AccordionFixtureItem>): string =>
  `const items: ReadonlyArray<Accordion.AccordionItem> = [
${items
  .map(
    item =>
      `  { value: '${item.value}', trigger: '${esc(item.trigger)}', content: '${esc(item.content)}'${item.isDisabled === true ? ', isDisabled: true' : ''} },`,
  )
  .join('\n')}
]`

const ui = (renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat'): string =>
  renderer !== 'tailwind' ? 'stylex' : 'ui'

const stylexImports = (entries: ReadonlyArray<string>): string =>
  `import * as stylex from '@stylexjs/stylex'
import { layoutStyle } from '@/stylex/contracts'

const styles = stylex.create({
  shell: { alignItems: 'center', display: 'flex', marginInline: 'auto', maxWidth: '36rem', minHeight: '100vh', padding: '2rem', width: '100%' },
${entries.join('\n')}
})`

const viewInputsSource = (
  fixture: AccordionFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  if (fixture.kind === 'borders') {
    return renderer === 'tailwind'
      ? `{ items, class: 'rounded-lg border', itemClass: 'border-b px-4 last:border-b-0' }`
      : `{ items, bordered: true }`
  }
  return '{ items }'
}

const submodelSource = (
  fixture: AccordionFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => `h.submodel({
      slotId: 'docs-accordion',
      model: model.accordion,
      view: Accordion.view,
      viewInputs: ${viewInputsSource(fixture, renderer)},
      toParentMessage: message => GotAccordionMessage({ message }),
    })`

const bodySource = (
  fixture: AccordionFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const sub = submodelSource(fixture, renderer)
  switch (fixture.kind) {
    case 'card':
      return `Card.card({
      ${renderer === 'tailwind' ? `class: 'mx-auto w-full max-w-sm',` : 'layoutStyle: layoutStyle({ maxWidth: "24rem", width: "100%", marginInline: "auto" }),'}
      children: [
        Card.cardHeader({ children: [
          Card.cardTitle({ children: ['${accordionCardCopy.title}'] }, h),
          Card.cardDescription({ children: ['${accordionCardCopy.description}'] }, h),
        ] }, h),
        Card.cardContent({ children: [
          ${sub.split('\n').join('\n          ')},
        ] }, h),
      ],
    }, h)`
    case 'rtl':
      return renderer === 'tailwind'
        ? `h.div([h.Dir('rtl'), h.Class('w-full max-w-md')], [
      ${sub},
    ])`
        : `h.div([h.Dir('rtl'), h.Class(stylex.props(styles.frame).className ?? '')], [
      ${sub},
    ])`
    default:
      return sub
  }
}

const source = (
  index: number,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const fixture = accordionFixtures[index] ?? accordionFixtures[0]
  const isStyleX = renderer !== 'tailwind'
  const styleEntries: Array<string> = []
  if (isStyleX && fixture.kind === 'card') {
    styleEntries.push(
      `  card: { maxWidth: '24rem', width: '100%', marginInline: 'auto' },`,
    )
  }
  if (isStyleX && fixture.kind === 'rtl') {
    styleEntries.push(`  frame: { maxWidth: '28rem', width: '100%' },`)
  }
  const componentImports = [
    ...(fixture.kind === 'card'
      ? [`import * as Card from '@/${ui(renderer)}/card'`]
      : []),
    ...(styleEntries.length > 0 ? [stylexImports(styleEntries)] : []),
  ].join('\n')

  return foldkitApplication({
    title: `Accordion — ${fixture.title}`,
    imports: `import { Match as M, Option, Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
import { modifyFields } from 'foldkit/struct'

import * as Accordion from '@/${ui(renderer)}/accordion'${componentImports === '' ? '' : `\n${componentImports}`}`,
    model: `export const Model = S.Struct({ accordion: Accordion.Model, maybeLastToggledValue: S.Option(S.String) })
export type Model = typeof Model.Type`,
    messages: `import { taggedStruct } from 'foldkit/schema'
export const GotAccordionMessage = taggedStruct('GotAccordionMessage', { message: Accordion.Message });
export const Message = S.Union([GotAccordionMessage])
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({ model: {
    accordion: Accordion.init({
      id: 'docs-accordion', type: '${fixture.type}',
      value: [${fixture.initialValue.map(value => `'${value}'`).join(', ')}],
    }),
    maybeLastToggledValue: Option.none(),
  } })`,
    update: `const foldAccordionOutMessage = (
  outMessage: Accordion.OutMessage,
): Update.Step<Model, Message> =>
  M.value(outMessage).pipe(
    M.withReturnType<Update.Step<Model, Message>>(),
    M.tagsExhaustive({
      ChangedValue: ({ toggledValue }) => model => ({ model: modifyFields(model, { maybeLastToggledValue: () => Option.some(toggledValue) }) }),
    }),
  )

const foldAccordion = Update.foldChild({
  update: Accordion.update,
  read: (model: Model) => Option.some(model.accordion),
  write: (model: Model, accordion: Accordion.Model) =>
    modifyFields(model, { accordion: () => accordion }),
  toParentMessage: message => GotAccordionMessage({ message }),
  foldOutMessage: foldAccordionOutMessage,
})

export const update = (model: Model, message: Message): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotAccordionMessage':
      return foldAccordion(model, message.message)
  }
}`,
    view: `${itemsSource(fixture.items)}

export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Accordion — ${fixture.title}',
  body: h.main([h.Class(${isStyleX ? 'className(styles.shell)' : "'mx-auto flex min-h-screen w-full max-w-xl items-center p-8'"})], [
    ${bodySource(fixture, renderer).split('\n').join('\n    ')},
  ]),
})`,
  })
}

const accordionExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  accordionFixtures.map((fixture, index) => ({
    title: fixture.title,
    description: fixture.description,
    code: source(index, renderer),
  }))

export const accordionExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, accordionExamplesFor(renderer))
