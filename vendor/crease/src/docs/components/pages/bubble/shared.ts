import type { DocsExample } from '@/docs/components/page-definition'
import { pleatExamples } from '@/docs/components/pleat-source'
import {
  foldkitApplication,
  staticComponentApplication,
} from '@/docs/components/pages/authored-page'

export type BubbleVariantSpec =
  | 'default'
  | 'secondary'
  | 'muted'
  | 'tinted'
  | 'outline'
  | 'ghost'
  | 'destructive'

export type BubbleReactionsSpec =
  | Readonly<{
      kind: 'emoji'
      side?: 'top'
      align?: 'start' | 'end'
      items: ReadonlyArray<string>
      ariaLabel?: string
    }>
  | Readonly<{ kind: 'action'; label: string; clickedLabel: string }>
  | Readonly<{ kind: 'tooltip'; icon: string; content: string }>
  | Readonly<{
      kind: 'popover'
      icon: string
      title: string
      description: string
    }>

export type BubbleSpec = Readonly<{
  variant?: BubbleVariantSpec
  align?: 'start' | 'end'
  /** Body text; multiple entries render as a whitespace-pre-line body. */
  text: ReadonlyArray<string>
  /** Render the content element as a button that dispatches ClickedOption (upstream asChild). */
  onClick?: boolean
  /** Long body collapsed behind a Show more/less toggle. */
  collapsible?: boolean
  reactions?: BubbleReactionsSpec
}>

export type BubbleCluster = Readonly<{
  /** Wrap the bubbles in Bubble.bubbleGroup (upstream BubbleGroup). */
  grouped?: boolean
  bubbles: ReadonlyArray<BubbleSpec>
}>

export type BubbleFixture = Readonly<{
  kind:
    | 'demo'
    | 'variants'
    | 'alignment'
    | 'group'
    | 'linkButton'
    | 'reactions'
    | 'collapsible'
    | 'tooltip'
    | 'popover'
  title: string
  description: string
  /** Rendered only as the page hero, not as a named example section. */
  heroOnly?: boolean
  /** Upstream column gap: `gap-4`, `gap-8`, or `gap-12`. */
  gap: '4' | '8' | '12'
  clusters: ReadonlyArray<BubbleCluster>
}>

const B = (spec: BubbleSpec): BubbleSpec => spec

export const COLLAPSIBLE_TEXT = [
  'The accessibility review found two focus states that were visually too subtle in dark mode.',
  'I checked the dialog, menu, and drawer paths because each one renders focusable controls inside a layered surface.',
  'The dialog and drawer are fine. The menu needs the hover and focus tokens split so keyboard focus stays visible when the pointer is not involved.',
  'I also recommend keeping the change in the style file instead of the primitive so the other themes can choose their own focus treatment later.',
]

const GHOST_TEXT = [
  'Ghost bubbles work for assistant text, markdown, and other content that should not be framed.',
  'This is perfect for assistant messages that should not have a frame and can take the full width of the container. You can also render code in it.',
  'Ghost bubbles are full width and can take the full width of the container.',
]

export const bubbleFixtures: Readonly<
  [BubbleFixture, ...Array<BubbleFixture>]
> = [
  {
    kind: 'demo',
    title: 'Demo',
    description: 'A conversation thread with groups and emoji reactions.',
    heroOnly: true,
    gap: '8',
    clusters: [
      { bubbles: [B({ align: 'end', text: ["Hey there! what's up?"] })] },
      {
        grouped: true,
        bubbles: [
          B({ variant: 'muted', text: ['Hey! Want to see chat bubbles?'] }),
          B({
            variant: 'muted',
            text: [
              'I can group messages, switch sides, and keep the whole thread easy to scan.',
            ],
            reactions: {
              kind: 'emoji',
              items: ['👍'],
              ariaLabel: 'Reaction: thumbs up',
            },
          }),
        ],
      },
      {
        bubbles: [
          B({ align: 'end', text: ['Sure. Hit me with your best demo.'] }),
        ],
      },
      {
        bubbles: [
          B({
            variant: 'muted',
            text: [
              'Yes. You are reading a demo that is demoing itself. Very meta. Very on-brand.',
            ],
            reactions: {
              kind: 'emoji',
              items: ['👍', '🔥', '👀', '+2'],
              ariaLabel: 'Reactions: thumbs up, fire, eyes, and 2 more',
            },
          }),
        ],
      },
    ],
  },
  {
    kind: 'variants',
    title: 'Variants',
    description:
      'Every bubble variant: primary, secondary, muted, tinted, outline, destructive, and ghost.',
    gap: '12',
    clusters: [
      { bubbles: [B({ text: ['This is the default primary bubble.'] })] },
      {
        bubbles: [
          B({
            variant: 'secondary',
            align: 'end',
            text: ['This is the secondary variant.'],
          }),
        ],
      },
      {
        bubbles: [
          B({
            variant: 'muted',
            text: [
              'This one is muted. It uses a lower emphasis color for the chat bubble.',
            ],
            reactions: {
              kind: 'emoji',
              items: ['👍'],
              ariaLabel: 'Reaction: thumbs up',
            },
          }),
        ],
      },
      {
        bubbles: [
          B({
            variant: 'tinted',
            align: 'end',
            text: [
              'This one is tinted. The tint is a softer color derived from the primary color.',
            ],
          }),
        ],
      },
      {
        bubbles: [
          B({
            variant: 'outline',
            text: ['We can also use an outlined variant.'],
          }),
        ],
      },
      {
        bubbles: [
          B({
            variant: 'destructive',
            align: 'end',
            text: ['Or a destructive variant with a reaction.'],
            reactions: {
              kind: 'emoji',
              items: ['🔥'],
              ariaLabel: 'Reaction: fire',
            },
          }),
        ],
      },
      { bubbles: [B({ variant: 'ghost', text: GHOST_TEXT })] },
    ],
  },
  {
    kind: 'alignment',
    title: 'Alignment',
    description: 'align="end" pins user messages to the trailing edge.',
    gap: '8',
    clusters: [
      {
        bubbles: [
          B({
            variant: 'muted',
            text: [
              'This bubble is aligned to the start. This is the default alignment.',
            ],
          }),
        ],
      },
      {
        bubbles: [
          B({
            align: 'end',
            text: [
              'This bubble is aligned to the end. Use this for user messages.',
            ],
          }),
        ],
      },
    ],
  },
  {
    kind: 'group',
    title: 'Bubble Group',
    description: 'BubbleGroup tightens consecutive same-side messages.',
    gap: '8',
    clusters: [
      {
        bubbles: [
          B({ variant: 'muted', text: ["Can you tell me what's the issue?"] }),
        ],
      },
      {
        grouped: true,
        bubbles: [
          B({ align: 'end', text: ['You tell me!'] }),
          B({ align: 'end', text: ['It worked yesterday. You broke it!'] }),
          B({
            align: 'end',
            text: ['Find the bug and fix it.'],
            reactions: {
              kind: 'emoji',
              align: 'start',
              items: ['👀'],
              ariaLabel: 'Reactions: eyes',
            },
          }),
        ],
      },
      {
        bubbles: [
          B({
            variant: 'muted',
            text: [
              "Want me to diff yesterday's you against today's you? It's a bit embarrassing.",
            ],
          }),
        ],
      },
    ],
  },
  {
    kind: 'linkButton',
    title: 'Links and Buttons',
    description:
      'BubbleContent can render as an interactive element for suggested replies.',
    gap: '8',
    clusters: [
      {
        bubbles: [B({ variant: 'muted', text: ['How can I help you today?'] })],
      },
      {
        grouped: true,
        bubbles: [
          B({
            variant: 'tinted',
            align: 'end',
            onClick: true,
            text: ['I forgot my password'],
          }),
          B({
            variant: 'tinted',
            align: 'end',
            onClick: true,
            text: ['I need help with my subscription'],
          }),
          B({
            variant: 'tinted',
            align: 'end',
            onClick: true,
            text: ['Something else. Talk to a human.'],
          }),
        ],
      },
    ],
  },
  {
    kind: 'reactions',
    title: 'Reactions',
    description:
      'BubbleReactions pins emoji chips or action buttons to a bubble.',
    gap: '12',
    clusters: [
      {
        bubbles: [
          B({
            variant: 'muted',
            align: 'end',
            text: ["I don't need tests, I know my code works."],
            reactions: {
              kind: 'emoji',
              align: 'start',
              items: ['👍', '😮'],
              ariaLabel: 'Reactions: thumbs up, surprised',
            },
          }),
        ],
      },
      {
        bubbles: [
          B({
            variant: 'muted',
            text: [
              "Bold. Fine I'll add some tests. I'll let you know when they're done.",
            ],
            reactions: {
              kind: 'emoji',
              items: ['👀', '🚀', '+2'],
              ariaLabel: 'Reactions: eyes, rocket, and 2 more',
            },
          }),
        ],
      },
      {
        bubbles: [
          B({
            align: 'end',
            text: [
              'Tests passed on the first try. All 142 of them. Looking good!',
            ],
            reactions: {
              kind: 'emoji',
              side: 'top',
              align: 'start',
              items: ['🎉', '👏'],
              ariaLabel: 'Reactions: party popper, clapping hands',
            },
          }),
        ],
      },
      {
        bubbles: [
          B({
            variant: 'destructive',
            text: ['Are you sure I can run this command?'],
            reactions: {
              kind: 'action',
              label: 'Yes, run it',
              clickedLabel: '✓ Ran it',
            },
          }),
        ],
      },
    ],
  },
  {
    kind: 'collapsible',
    title: 'Show More / Collapsible',
    description: 'A long message collapses behind a Show more toggle.',
    gap: '8',
    clusters: [
      {
        bubbles: [B({ variant: 'muted', text: ['How can I help you today?'] })],
      },
      {
        bubbles: [
          B({
            variant: 'muted',
            align: 'end',
            collapsible: true,
            text: COLLAPSIBLE_TEXT,
          }),
        ],
      },
    ],
  },
  {
    kind: 'tooltip',
    title: 'Tooltip',
    description:
      'A reactions row can host a tooltip button like a read receipt.',
    gap: '4',
    clusters: [
      {
        bubbles: [
          B({
            variant: 'secondary',
            text: ['Did you remove the stale route?'],
          }),
        ],
      },
      {
        bubbles: [
          B({
            align: 'end',
            text: ['Yes, removed it from the registry.'],
            reactions: {
              kind: 'tooltip',
              icon: 'check',
              content: 'Read on Jan 5, 2026 at 4:32 PM',
            },
          }),
        ],
      },
    ],
  },
  {
    kind: 'popover',
    title: 'Popover',
    description: 'A reactions row can host a popover for error details.',
    gap: '4',
    clusters: [
      { bubbles: [B({ align: 'end', text: ['Run the build script.'] })] },
      {
        bubbles: [
          B({
            variant: 'destructive',
            text: ['Failed to run the command.'],
            reactions: {
              kind: 'popover',
              icon: 'info',
              title: 'Command failed with exit code 1',
              description:
                'ENOENT: no such file or directory, open pnpm-lock.yaml',
            },
          }),
        ],
      },
    ],
  },
]

const esc = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")

const needsCollapsible = (fixture: BubbleFixture): boolean =>
  fixture.clusters.some(cluster =>
    cluster.bubbles.some(bubble => bubble.collapsible === true),
  )
const needsTooltip = (fixture: BubbleFixture): boolean =>
  fixture.clusters.some(cluster =>
    cluster.bubbles.some(bubble => bubble.reactions?.kind === 'tooltip'),
  )
const needsPopover = (fixture: BubbleFixture): boolean =>
  fixture.clusters.some(cluster =>
    cluster.bubbles.some(bubble => bubble.reactions?.kind === 'popover'),
  )
const usesIcon = (fixture: BubbleFixture): boolean =>
  needsCollapsible(fixture) ||
  fixture.clusters.some(cluster =>
    cluster.bubbles.some(
      bubble =>
        bubble.reactions?.kind === 'tooltip' ||
        bubble.reactions?.kind === 'popover',
    ),
  )

const textExprSource = (
  text: ReadonlyArray<string>,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string =>
  text.length === 1
    ? `'${esc(text[0] ?? '')}'`
    : `h.div([h.Class(${renderer !== 'tailwind' ? 'className(styles.preLine)' : `'whitespace-pre-line'`})], ['${text.map(esc).join('\\n\\n')}'])`

const collapsibleBodySource = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const chevronClass =
    renderer !== 'tailwind'
      ? `{ class: className(styles.chevron, model.open && styles.chevronExpanded) }`
      : `{ class: 'size-4' }`
  const triggerClass =
    renderer !== 'tailwind'
      ? 'className(styles.triggerLink)'
      : `'inline-flex items-center gap-1 p-0 text-muted-foreground underline-offset-4 hover:underline'`
  return `h.div([], [model.open ? reportText : \`\${reportText.slice(0, 180)}...\`]),
            h.button(
              [
                h.Type('button'),
                h.AriaExpanded(model.open),
                h.OnClick(Message['ToggledCollapsible']({ isOpen: !model.open })),
                h.Class(${triggerClass}),
              ],
              [
                model.open ? 'Show less' : 'Show more',
                Icon.icon('chevron-down', ${chevronClass}, h),
              ],
            ),`
}

const contentSource = (
  bubble: BubbleSpec,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const variantProp =
    renderer !== 'tailwind'
      ? ` variant: '${bubble.variant ?? 'default'}' as const,`
      : ''
  const onClick =
    bubble.onClick === true
      ? `\n          onClick: Message['ClickedOption']({ label: '${esc(bubble.text[0] ?? '')}' }),`
      : ''
  return `Bubble.bubbleContent({${variantProp}${onClick}
          children: [
            ${bubble.collapsible === true ? collapsibleBodySource(renderer) : textExprSource(bubble.text, renderer)}
          ],
        }, h)`
}

const reactionsSource = (
  reactions: BubbleReactionsSpec,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  switch (reactions.kind) {
    case 'emoji': {
      const side = reactions.side === 'top' ? `\n          side: 'top',` : ''
      const align =
        reactions.align !== undefined && reactions.align !== 'end'
          ? `\n          align: '${reactions.align}',`
          : ''
      const aria =
        reactions.ariaLabel === undefined
          ? ''
          : `\n          ariaLabel: '${esc(reactions.ariaLabel)}',`
      const items = reactions.items
        .map(item => `h.span([], ['${esc(item)}'])`)
        .join(', ')
      return `Bubble.bubbleReactions({${side}${align}${aria}
          children: [${items}],
        }, h)`
    }
    case 'action':
      return `Bubble.bubbleReactions({
          children: [
            Button.button({
              variant: 'ghost',
              size: 'xs',
              onClick: Message['ClickedRunIt'](),
              children: [model.ranIt ? '${esc(reactions.clickedLabel)}' : '${esc(reactions.label)}'],
            }, h),
          ],
        }, h)`
    case 'tooltip': {
      const iconClass =
        renderer !== 'tailwind' ? `{ class: className(styles.icon) }` : '{}'
      const triggerProps =
        renderer !== 'tailwind'
          ? `triggerLayoutStyle: styles.iconTrigger,`
          : `triggerClass: 'flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground',`
      return `Bubble.bubbleReactions({${renderer !== 'tailwind' ? '' : ` class: 'p-0',`}
          children: [
            Tooltip.tooltip({
              model: model.tooltip,
              toParentMessage: message =>
                Message['GotTooltipMessage']({ message }),
              trigger: Icon.icon('${reactions.icon}', ${iconClass}, h),
              ${triggerProps}
              content: '${esc(reactions.content)}',
              ariaLabel: 'Read receipt',
            }, h),
          ],
        }, h)`
    }
    case 'popover': {
      const iconClass =
        renderer !== 'tailwind'
          ? `{ class: className(styles.icon), ariaLabel: 'Show error details' }`
          : `{ class: 'size-3.5', ariaLabel: 'Show error details' }`
      const triggerProps =
        renderer !== 'tailwind'
          ? `triggerLayoutStyle: styles.iconTrigger,`
          : `triggerClass: 'inline-flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground aria-expanded:text-destructive',`
      const titleClass =
        renderer !== 'tailwind'
          ? 'className(styles.popoverTitle)'
          : `'text-sm font-medium'`
      const descClass =
        renderer !== 'tailwind'
          ? 'className(styles.popoverCopy)'
          : `'text-sm text-muted-foreground'`
      const contentClass =
        renderer !== 'tailwind'
          ? 'className(styles.popoverContent)'
          : `'grid gap-1'`
      return `Bubble.bubbleReactions({
          children: [
            Popover.popover({
              model: model.popover,
              toParentMessage: message =>
                Message['GotPopoverMessage']({ message }),
              trigger: Icon.icon('${reactions.icon}', ${iconClass}, h),
              ${triggerProps}
              content: h.div([h.Class(${contentClass})], [
                h.p([h.Class(${titleClass})], ['${esc(reactions.title)}']),
                h.p([h.Class(${descClass})], ['${esc(reactions.description)}']),
              ]),
            }, h),
          ],
        }, h)`
    }
  }
}

const bubbleSource = (
  bubble: BubbleSpec,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const variantProp =
    bubble.variant === undefined || bubble.variant === 'default'
      ? ''
      : `\n        variant: '${bubble.variant}',`
  const alignProp =
    bubble.align === undefined ? '' : `\n        align: '${bubble.align}',`
  const reactions =
    bubble.reactions === undefined
      ? ''
      : `,\n        ${reactionsSource(bubble.reactions, renderer)}`
  return `Bubble.bubble({${variantProp}${alignProp}
        children: [
          ${contentSource(bubble, renderer)}${reactions}
        ],
      }, h)`
}

const clusterSource = (
  cluster: BubbleCluster,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string =>
  cluster.grouped === true
    ? `Bubble.bubbleGroup({
        children: [
          ${cluster.bubbles
            .map(bubble => bubbleSource(bubble, renderer))
            .join(',\n          ')},
        ],
      }, h)`
    : cluster.bubbles
        .map(bubble => `      ${bubbleSource(bubble, renderer)}`)
        .join(',\n')

const viewBodySource = (
  fixture: BubbleFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const children = fixture.clusters
    .map(cluster => `      ${clusterSource(cluster, renderer)}`)
    .join(',\n')
  const feedback =
    fixture.kind === 'linkButton'
      ? `,\n      ...(model.lastClicked === undefined\n        ? []\n        : [\n            h.p(\n              [h.Class('text-sm text-muted-foreground')],\n              [\`You clicked: \${model.lastClicked}\`],\n            ),\n          ])`
      : ''
  const frameClass =
    renderer !== 'tailwind'
      ? 'className(styles.column)'
      : `'flex w-full max-w-sm flex-col gap-${fixture.gap} py-12'`
  return `h.div([h.Class(${frameClass})], [
${children}${feedback}
    ])`
}

const stylexStylesSource = (fixture: BubbleFixture): string => {
  const parts: Array<string> = [
    `\n  column: { display: 'flex', flexDirection: 'column', gap: '${fixture.gap === '4' ? '1rem' : fixture.gap === '8' ? '2rem' : '3rem'}', maxWidth: '24rem', paddingBlock: '3rem', width: '100%' },`,
  ]
  if (fixture.clusters.some(c => c.bubbles.some(b => b.text.length > 1)))
    parts.push(`\n  preLine: { whiteSpace: 'pre-line' },`)
  if (needsCollapsible(fixture)) {
    parts.push(
      `\n  chevron: { height: '1rem', width: '1rem', transform: 'rotate(0deg)', transitionProperty: 'transform', transitionDuration: { default: interactionTokens.motionFast, '@media (prefers-reduced-motion: reduce)': interactionTokens.motionNone }, transitionTimingFunction: interactionTokens.easingStandard },`,
      `\n  chevronExpanded: { transform: 'rotate(180deg)' },`,
      `\n  triggerLink: { alignItems: 'center', color: 'var(--muted-foreground)', display: 'inline-flex', gap: '0.25rem', padding: 0 },`,
    )
  }
  if (needsTooltip(fixture) || needsPopover(fixture)) {
    parts.push(
      `\n  icon: { color: 'var(--muted-foreground)', fontSize: '0.875rem', lineHeight: '1.25rem' },`,
      `\n  iconTrigger: { height: '1.5rem', width: '1.5rem' },`,
    )
  }
  if (needsPopover(fixture)) {
    parts.push(
      `\n  popoverContent: { display: 'grid', gap: '0.25rem' },`,
      `\n  popoverTitle: { fontSize: '0.875rem', lineHeight: '1.25rem', fontWeight: 500 },`,
      `\n  popoverCopy: { color: 'var(--muted-foreground)', fontSize: '0.875rem', lineHeight: '1.25rem' },`,
    )
  }
  return `const styles = stylex.create({${parts.join('')}
})

`
}

const componentImports = (
  fixture: BubbleFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const ui = renderer !== 'tailwind' ? 'stylex' : 'ui'
  const lines: Array<string> = []
  if (renderer !== 'tailwind')
    lines.push(`import * as stylex from '@stylexjs/stylex'
import { className } from '@/stylex/style'${needsCollapsible(fixture) ? "\nimport { interactionTokens } from '@/stylex/interaction-tokens.stylex.const'" : ''}

${stylexStylesSource(fixture)}`)
  if (
    fixture.clusters.some(c =>
      c.bubbles.some(b => b.reactions?.kind === 'action'),
    )
  )
    lines.push(`import * as Button from '@/${ui}/button'`)
  if (usesIcon(fixture)) lines.push(`import * as Icon from '@/lib/icon'`)
  if (needsPopover(fixture))
    lines.push(`import * as Popover from '@/${ui}/popover'`)
  if (needsTooltip(fixture))
    lines.push(`import * as Tooltip from '@/${ui}/tooltip'`)
  return lines.join('\n')
}

const isDynamicFixture = (fixture: BubbleFixture): boolean =>
  fixture.kind === 'linkButton' ||
  fixture.kind === 'reactions' ||
  fixture.kind === 'collapsible' ||
  fixture.kind === 'tooltip' ||
  fixture.kind === 'popover'

const modelFields = (fixture: BubbleFixture): string[] => {
  const fields: Array<string> = []
  if (fixture.kind === 'linkButton')
    fields.push(`  lastClicked: S.UndefinedOr(S.String),`)
  if (fixture.kind === 'reactions') fields.push(`  ranIt: S.Boolean,`)
  if (needsCollapsible(fixture)) fields.push(`  open: S.Boolean,`)
  if (needsTooltip(fixture)) fields.push(`  tooltip: Tooltip.Model,`)
  if (needsPopover(fixture)) fields.push(`  popover: Popover.Model,`)
  return fields
}

const messageFields = (fixture: BubbleFixture): string[] => {
  const messages: Array<string> = []
  if (fixture.kind === 'linkButton')
    messages.push(`  ClickedOption: { label: S.String },`)
  if (fixture.kind === 'reactions') messages.push(`  ClickedRunIt: {},`)
  if (needsCollapsible(fixture))
    messages.push(`  ToggledCollapsible: { isOpen: S.Boolean },`)
  if (needsTooltip(fixture))
    messages.push(`  GotTooltipMessage: { message: Tooltip.Message },`)
  if (needsPopover(fixture))
    messages.push(`  GotPopoverMessage: { message: Popover.Message },`)
  return messages
}

const initFields = (fixture: BubbleFixture): string[] => {
  const fields: Array<string> = []
  if (fixture.kind === 'linkButton') fields.push(`lastClicked: undefined`)
  if (fixture.kind === 'reactions') fields.push(`ranIt: false`)
  if (needsCollapsible(fixture)) fields.push(`open: false`)
  if (needsTooltip(fixture))
    fields.push(`tooltip: Tooltip.init({ id: 'bubble-tooltip' })`)
  if (needsPopover(fixture))
    fields.push(`popover: Popover.init({ id: 'bubble-popover' })`)
  return fields
}

const updateCases = (fixture: BubbleFixture): string[] => {
  const cases: Array<string> = []
  if (fixture.kind === 'linkButton')
    cases.push(`    case 'ClickedOption':
      return { model: { ...model, lastClicked: message.label } }`)
  if (fixture.kind === 'reactions')
    cases.push(`    case 'ClickedRunIt':
      return { model: { ...model, ranIt: true } }`)
  if (needsCollapsible(fixture))
    cases.push(`    case 'ToggledCollapsible':
      return { model: { ...model, open: message.isOpen } }`)
  if (needsTooltip(fixture))
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
  if (needsPopover(fixture))
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
  return cases
}

const dynamicSource = (
  fixture: BubbleFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string => {
  const consts = needsCollapsible(fixture)
    ? `const reportText = '${COLLAPSIBLE_TEXT.map(esc).join('\\n\\n')}'\n\n`
    : ''
  return foldkitApplication({
    title: `Bubble — ${fixture.title}`,
    imports: `import { Schema as S } from 'effect'
import { Command, Runtime, Subscription, Update } from 'foldkit'
import { type Document, type HtmlBuilder } from 'foldkit/html'

import * as Bubble from '@/${renderer !== 'tailwind' ? 'stylex' : 'ui'}/bubble'
${componentImports(fixture, renderer)}`,
    model: `export const Model = S.Struct({
${modelFields(fixture).join('\n')}
})
export type Model = typeof Model.Type`,
    messages: `import { defineMessageUnion } from 'foldkit/message'

export const Message = defineMessageUnion({
${messageFields(fixture).join('\n')}
});
export type Message = typeof Message.Type`,
    init: `export const init = (): Update.Return<Model, Message> => ({
  model: { ${initFields(fixture).join(', ')} },
})`,
    update: `export const update = (
  model: Model,
  message: Message,
): Update.Return<Model, Message> => {
  switch (message._tag) {
${updateCases(fixture).join('\n')}
  }
}`,
    view: `${consts}export const view = (model: Model, h: HtmlBuilder<Message>): Document => ({
  title: 'Bubble — ${fixture.title}',
  body: h.main([h.Class(${renderer !== 'tailwind' ? 'className(styles.shell)' : "'flex min-h-screen items-center justify-center p-8'"})], [
    ${viewBodySource(fixture, renderer)},
  ]),
})`,
  })
}

const source = (
  fixture: BubbleFixture,
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): string =>
  isDynamicFixture(fixture)
    ? dynamicSource(fixture, renderer)
    : staticComponentApplication({
        componentName: 'Bubble',
        componentSlug: 'bubble',
        renderer,
        exampleName: fixture.title,
        componentImports: componentImports(fixture, renderer),
        viewBody: viewBodySource(fixture, renderer),
      })

const bubbleExamplesFor = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  bubbleFixtures.map(fixture => ({
    title: fixture.title,
    description: fixture.description,
    ...(fixture.heroOnly === true ? { heroOnly: true } : {}),
    code: source(fixture, renderer),
  }))

export const bubbleExamples = (
  renderer: 'tailwind' | 'stylex' | 'pleat' | 'pleat',
): ReadonlyArray<DocsExample> =>
  pleatExamples(renderer, bubbleExamplesFor(renderer))
