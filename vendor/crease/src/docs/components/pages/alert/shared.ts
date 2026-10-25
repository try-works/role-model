import type { AlertAnnouncement, AlertSeverity } from '@/lib/alert'
import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import { staticComponentApplication } from '@/docs/components/pages/authored-page'

export type AlertPreviewAlert = Readonly<{
  severity: AlertSeverity
  announcement: AlertAnnouncement
  icon: string
  title: string
  description: string
  actionLabel?: string
}>

export type AlertFixture = Readonly<{
  title: string
  description: string
  direction?: 'rtl'
  colors?: string
  alerts: ReadonlyArray<AlertPreviewAlert>
}>

export const alertFixtures: Readonly<[AlertFixture, ...Array<AlertFixture>]> = [
  {
    title: 'Basic',
    description: 'A basic alert with an icon, title, and description.',
    alerts: [
      {
        severity: 'success',
        announcement: 'static',
        icon: 'circle-check',
        title: 'Account updated successfully',
        description:
          'Your profile information has been saved. Changes will be reflected immediately.',
      },
    ],
  },
  {
    title: 'Destructive',
    description:
      'severity: "error" with assertive announcement policy for urgent failures.',
    alerts: [
      {
        severity: 'error',
        announcement: 'alert',
        icon: 'circle-alert',
        title: 'Payment failed',
        description:
          'Your payment could not be processed. Please check your payment method and try again.',
      },
    ],
  },
  {
    title: 'Action',
    description: 'Add a button or other action element to the alert.',
    alerts: [
      {
        severity: 'info',
        announcement: 'static',
        icon: 'info',
        title: 'Dark mode is now available',
        description: 'Enable it under your profile settings to get started.',
        actionLabel: 'Enable',
      },
    ],
  },
  {
    title: 'Custom Colors',
    description:
      'Customize the alert colors with classes on the Alert component.',
    colors:
      'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-50',
    alerts: [
      {
        severity: 'warning',
        announcement: 'status',
        icon: 'triangle-alert',
        title: 'Your subscription will expire in 3 days.',
        description:
          'Renew now to avoid service interruption or upgrade to a paid plan to continue using the service.',
      },
    ],
  },
  {
    title: 'RTL',
    description:
      'dir="rtl" mirrors icon and content for right-to-left layouts.',
    direction: 'rtl',
    alerts: [
      {
        severity: 'success',
        announcement: 'static',
        icon: 'circle-check',
        title: 'تم الدفع بنجاح',
        description:
          'تمت معالجة دفعتك البالغة 29.99 دولارًا. تم إرسال إيصال إلى عنوان بريدك الإلكتروني.',
      },
      {
        severity: 'info',
        announcement: 'static',
        icon: 'info',
        title: 'ميزة جديدة متاحة',
        description:
          'لقد أضفنا دعم الوضع الداكن. يمكنك تفعيله في إعدادات حسابك.',
      },
    ],
  },
]

const alertSource = (
  item: AlertPreviewAlert,
  colors: string | undefined,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const actionClass =
    renderer !== 'tailwind'
      ? `stylex.props(styles.action).className ?? ''`
      : `'col-start-2 mt-2'`
  const action =
    item.actionLabel === undefined
      ? ''
      : `
    h.div([h.Class(${actionClass})], [
      Button.button({ size: 'sm', children: ['${item.actionLabel}'] }, h),
    ]),`
  const classLine =
    renderer !== 'tailwind'
      ? ''
      : colors === undefined
        ? ''
        : `
    class: '${colors}',`
  return `Alert.alert({
    severity: '${item.severity}',
    announcement: '${item.announcement}',${classLine}
    children: [
      Alert.alertIcon({ children: [Icon.icon('${item.icon}', { class: 'size-4' }, h)] }, h),
      Alert.alertTitle({ children: ['${item.title}'] }, h),
      Alert.alertDescription({ children: ['${item.description}'] }, h),${action}
    ],
  }, h)`
}

const source = (
  index: number,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const fixture = alertFixtures[index] ?? alertFixtures[0]
  const usesAction = fixture.alerts.some(item => item.actionLabel !== undefined)
  const componentImports = [
    `import * as Icon from '@/lib/icon'`,
    ...(usesAction
      ? [
          `import * as Button from '@/${renderer !== 'tailwind' ? 'stylex' : 'ui'}/button'`,
        ]
      : []),
    ...(renderer !== 'tailwind'
      ? [`import * as stylex from '@stylexjs/stylex'`]
      : []),
  ].join('\n')
  const styles =
    renderer !== 'tailwind'
      ? `\nconst styles = stylex.create({ wrap: { display: 'grid', gap: '1rem', maxWidth: '28rem', width: '100%' }, action: { gridColumnStart: 2, marginTop: '0.5rem' } })\n`
      : ''
  const inner = fixture.alerts
    .map(item => alertSource(item, fixture.colors, renderer))
    .join(',\n      ')
  const dirAttr =
    fixture.direction === 'rtl' ? `h.Dir('${fixture.direction}'), ` : ''
  const wrapClass =
    renderer !== 'tailwind'
      ? `h.Class(stylex.props(styles.wrap).className ?? '')`
      : `h.Class('grid w-full max-w-md gap-4')`
  const viewBody = `h.div(
      [${dirAttr}${wrapClass}],
      [
        ${inner},
      ],
    )`
  return staticComponentApplication({
    componentName: 'Alert',
    componentSlug: 'alert',
    renderer,
    exampleName: fixture.title,
    componentImports: `${componentImports}${styles}`,
    viewBody,
  })
}

const alertExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  alertFixtures.map((fixture, index) => ({
    title: fixture.title,
    description: fixture.description,
    code: source(index, renderer),
  }))

export const alertExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, alertExamplesFor(renderer))
