import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { foldkitApplication } from '@/docs/components/pages/authored-page'

export interface TabsCardSpec {
  readonly title: string
  readonly description: string
  readonly text: string
}

export interface TabsTabSpec {
  readonly value: string
  readonly label: string
  readonly content: string
  readonly isDisabled?: boolean
  readonly icon?: string
  readonly isLabelHidden?: boolean
  readonly card?: TabsCardSpec
}

export type TabsKind =
  | 'demo'
  | 'line'
  | 'vertical'
  | 'disabled'
  | 'icons'
  | 'icon-only'
  | 'rtl'
  | 'manual'

export interface TabsFixture {
  readonly title: string
  readonly description?: string
  readonly heroOnly?: boolean
  readonly kind: TabsKind
  readonly ariaLabel: string
  readonly tabs: ReadonlyArray<TabsTabSpec>
  readonly variant?: 'line'
  readonly orientation?: 'vertical'
  readonly manual?: boolean
  readonly rtl?: boolean
}

export const overviewTabs: ReadonlyArray<TabsTabSpec> = [
  {
    value: 'overview',
    label: 'Overview',
    content: '',
    card: {
      title: 'Overview',
      description:
        'View your key metrics and recent project activity. Track progress across all your active projects.',
      text: 'You have 12 active projects and 3 pending tasks.',
    },
  },
  {
    value: 'analytics',
    label: 'Analytics',
    content: '',
    card: {
      title: 'Analytics',
      description:
        'Track performance and user engagement metrics. Monitor trends and identify growth opportunities.',
      text: 'Page views are up 25% compared to last month.',
    },
  },
  {
    value: 'reports',
    label: 'Reports',
    content: '',
    card: {
      title: 'Reports',
      description:
        'Generate and download your detailed reports. Export data in multiple formats for analysis.',
      text: 'You have 5 reports ready and available to export.',
    },
  },
  {
    value: 'settings',
    label: 'Settings',
    content: '',
    card: {
      title: 'Settings',
      description:
        'Manage your account preferences and options. Customize your experience to fit your needs.',
      text: 'Configure notifications, security, and themes.',
    },
  },
]

export const rtlTabs: ReadonlyArray<TabsTabSpec> = [
  {
    value: 'overview',
    label: 'نظرة عامة',
    content: '',
    card: {
      title: 'نظرة عامة',
      description:
        'عرض مقاييسك الرئيسية وأنشطة المشروع الأخيرة. تتبع التقدم عبر جميع مشاريعك النشطة.',
      text: 'لديك ١٢ مشروعًا نشطًا و٣ مهام معلقة.',
    },
  },
  {
    value: 'analytics',
    label: 'التحليلات',
    content: '',
    card: {
      title: 'التحليلات',
      description:
        'تتبع مقاييس الأداء ومشاركة المستخدمين. راقب الاتجاهات وحدد فرص النمو.',
      text: 'زادت مشاهدات الصفحة بنسبة ٢٥٪ مقارنة بالشهر الماضي.',
    },
  },
  {
    value: 'reports',
    label: 'التقارير',
    content: '',
    card: {
      title: 'التقارير',
      description:
        'إنشاء وتنزيل تقاريرك التفصيلية. تصدير البيانات بتنسيقات متعددة للتحليل.',
      text: 'لديك ٥ تقارير جاهزة ومتاحة للتصدير.',
    },
  },
  {
    value: 'settings',
    label: 'الإعدادات',
    content: '',
    card: {
      title: 'الإعدادات',
      description:
        'إدارة تفضيلات حسابك وخياراته. تخصيص تجربتك لتناسب احتياجاتك.',
      text: 'تكوين الإشعارات والأمان والسمات.',
    },
  },
]

export const tabsFixtures: Readonly<[TabsFixture, ...Array<TabsFixture>]> = [
  {
    title: 'Basic',
    heroOnly: true,
    kind: 'demo',
    ariaLabel: 'Project overview',
    tabs: overviewTabs,
  },
  {
    title: 'Line',
    description:
      'The line variant renders an underline selection for section-level navigation.',
    kind: 'line',
    ariaLabel: 'Project sections',
    variant: 'line',
    tabs: [
      { value: 'overview', label: 'Overview', content: '' },
      { value: 'analytics', label: 'Analytics', content: '' },
      { value: 'reports', label: 'Reports', content: '' },
    ],
  },
  {
    title: 'Vertical',
    description:
      'Vertical orientation stacks the tab list for settings-style layouts.',
    kind: 'vertical',
    ariaLabel: 'Account settings',
    orientation: 'vertical',
    tabs: [
      { value: 'account', label: 'Account', content: '' },
      { value: 'password', label: 'Password', content: '' },
      { value: 'notifications', label: 'Notifications', content: '' },
    ],
  },
  {
    title: 'Disabled',
    description:
      'Disabled tabs are skipped by click and roving keyboard focus.',
    kind: 'disabled',
    ariaLabel: 'Home sections',
    tabs: [
      { value: 'home', label: 'Home', content: '' },
      { value: 'settings', label: 'Disabled', content: '', isDisabled: true },
    ],
  },
  {
    title: 'Icons',
    description: 'Trigger labels compose icons with text.',
    kind: 'icons',
    ariaLabel: 'Preview and code',
    tabs: [
      { value: 'preview', label: 'Preview', content: '', icon: 'app-window' },
      { value: 'code', label: 'Code', content: '', icon: 'code' },
    ],
  },
  {
    title: 'Icon Only',
    description:
      'Compact triggers render only an icon while the hidden label stays the accessible name.',
    kind: 'icon-only',
    ariaLabel: 'View mode',
    tabs: [
      {
        value: 'grid',
        label: 'Grid',
        content: '',
        icon: 'layout-grid',
        isLabelHidden: true,
      },
      {
        value: 'list',
        label: 'List',
        content: '',
        icon: 'list',
        isLabelHidden: true,
      },
      {
        value: 'table',
        label: 'Table',
        content: '',
        icon: 'table',
        isLabelHidden: true,
      },
    ],
  },
  {
    title: 'RTL',
    description:
      'Horizontal tab order and arrow direction mirror in right-to-left contexts.',
    kind: 'rtl',
    ariaLabel: 'نظرة عامة على المشروع',
    rtl: true,
    tabs: rtlTabs,
  },
  {
    title: 'Manual with disabled tab',
    description:
      'Manual activation moves focus without changing the parent-owned value until Enter or Space; disabled tabs are skipped.',
    kind: 'manual',
    ariaLabel: 'Settings',
    manual: true,
    tabs: [
      {
        value: 'account',
        label: 'Account',
        content: 'Manage your profile details.',
      },
      {
        value: 'security',
        label: 'Security',
        content: 'Review passwords and sessions.',
        isDisabled: true,
      },
      {
        value: 'billing',
        label: 'Billing',
        content: 'Update invoices and payment methods.',
      },
    ],
  },
]

const esc = (value: string): string => value.replace(/'/g, "\\'")

const cardContent = (
  card: TabsCardSpec,
  isStyleX: boolean,
  indent: string,
): string => {
  const contentText = isStyleX
    ? `h.span([h.Class(stylex.props(styles.cardText).className ?? '')], ['${esc(card.text)}'])`
    : `'${esc(card.text)}'`
  return `Card.card({ children: [
${indent}  Card.cardHeader({ children: [
${indent}    Card.cardTitle({ children: ['${esc(card.title)}'] }, h),
${indent}    Card.cardDescription({ children: ['${esc(card.description)}'] }, h),
${indent}  ] }, h),
${indent}  Card.cardContent({ ${isStyleX ? '' : "class: 'text-sm text-muted-foreground', "}children: [${contentText}] }, h),
${indent}] }, h)`
}

const tabEntry = (
  tab: TabsTabSpec,
  isStyleX: boolean,
  indent: string,
): string => {
  const content =
    tab.card === undefined
      ? `'${esc(tab.content)}'`
      : cardContent(tab.card, isStyleX, `${indent}  `)
  return `${indent}{ value: '${tab.value}', label: '${esc(tab.label)}', content: ${content}${tab.icon === undefined ? '' : `, icon: Icon.icon('${tab.icon}', {}, h)`}${tab.isLabelHidden === true ? ', isLabelHidden: true' : ''}${tab.isDisabled === true ? ', isDisabled: true' : ''} },`
}

const emitSource = (
  fixture: TabsFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const isStyleX = renderer !== 'tailwind'
  const base = isStyleX ? 'stylex' : 'ui'
  const tag = fixture.title.replaceAll(/[^a-zA-Z0-9]/g, '')
  const usesCard = fixture.tabs.some(tab => tab.card !== undefined)
  const usesIcon = fixture.tabs.some(tab => tab.icon !== undefined)
  const values = fixture.tabs.map(tab => `'${tab.value}'`).join(', ')
  const sxBlock =
    isStyleX && usesCard
      ? `\nconst styles = stylex.create({\n  cardText: { fontSize: '0.875rem', lineHeight: '1.25rem', color: 'var(--muted-foreground)' },\n  demoWidth: { width: '25rem' },\n  page: { marginInline: 'auto', maxWidth: '36rem', padding: '2rem' },\n})`
      : ''
  return foldkitApplication({
    title: `Tabs — ${fixture.title}`,
    imports: `import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
${isStyleX ? "import * as stylex from '@stylexjs/stylex'\nimport { layoutStyle } from '@/stylex/contracts'\n" : ''}${usesCard ? `import * as Card from '@/${base}/card'\n` : ''}${usesIcon ? `import * as Icon from '@/lib/icon'\n` : ''}import * as Tabs from '@/${base}/tabs'${sxBlock}`,
    model: `export const TabValue = S.Literals([${values}])
export type TabValue = typeof TabValue.Type
const ExampleTabs = Tabs.create<TabValue>()
export const Model = S.Struct({ tabs: Tabs.Model, selectedTab: TabValue })
export type Model = typeof Model.Type`,
    messages: `export const Message = defineMessageUnion({
  GotTabsMessage${tag}: { message: Tabs.Message },
})
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: {
    tabs: Tabs.init({ id: 'docs-tabs'${fixture.manual === true ? ", activationMode: 'Manual'" : ''} }),
    selectedTab: '${fixture.tabs[0]?.value ?? 'overview'}',
  },
})`,
    update: `export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
    case 'GotTabsMessage${tag}': {
      const next = ExampleTabs.update(model.tabs, message.message)
      const selection = next.outMessage
      return {
        model: {
          ...model,
          tabs: next.model,
          selectedTab: selection === undefined ? model.selectedTab : selection.value,
        },
        commands: Command.mapMessages(next.commands ?? [], next =>
          Message['GotTabsMessage${tag}']({ message: next })),
      }
    }
  }
}`,
    view: `export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Tabs — ${fixture.title}',
  body: h.main([h.Class(${isStyleX ? "stylex.props(styles.page).className ?? ''" : "'mx-auto max-w-xl p-8'"})], [
    ExampleTabs.tabs({
      model: model.tabs,
      selectedValue: model.selectedTab,
      toParentMessage: message => Message['GotTabsMessage${tag}']({ message }),
      ariaLabel: '${esc(fixture.ariaLabel)}',
      tabs: [
${fixture.tabs.map(tab => tabEntry(tab, isStyleX, '        ')).join('\n')}
      ],${fixture.variant === 'line' ? "\n      variant: 'line'," : ''}${fixture.orientation === 'vertical' ? "\n      orientation: 'vertical'," : ''}${fixture.rtl === true ? "\n      direction: 'rtl'," : ''}${fixture.kind === 'demo' ? (isStyleX ? '\n      layoutStyle: layoutStyle({ width: "25rem" }),' : "\n      class: 'w-100',") : ''}
    }, h),
  ]),
})`,
  })
}

const tabsExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  tabsFixtures.map(fixture => ({
    title: fixture.title,
    ...(fixture.description === undefined
      ? {}
      : { description: fixture.description }),
    ...(fixture.heroOnly === true ? { heroOnly: true } : {}),
    code: emitSource(fixture, renderer),
  }))

export const tabsExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, tabsExamplesFor(renderer))
