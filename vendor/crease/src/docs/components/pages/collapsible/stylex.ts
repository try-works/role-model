import { reset } from '@/stylex/reset'
import type { Html, HtmlBuilder } from 'foldkit/html'

import * as stylex from '@stylexjs/stylex'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  collapsibleFixtures,
  fileTree,
} from '@/docs/components/pages/collapsible/shared'
import * as Icon from '@/lib/icon'
import * as Button from '@/stylex/button'
import * as Card from '@/stylex/card'
import * as Collapsible from '@/stylex/collapsible'
import * as Input from '@/stylex/input'
import { className } from '@/stylex/style'

/* ComponentLayoutStyle only carries positioning props; visual styling lives on
   the trigger/content Html children. */
const styles = stylex.create({
  cardSm: { marginInline: 'auto', maxWidth: '24rem', width: '100%' },
  cardXs: { marginInline: 'auto', maxWidth: '20rem', width: '100%' },
  triggerRow: {
    gap: '0.5rem',
    alignItems: 'center',
    display: 'flex',
    fontSize: '0.875rem',
    fontWeight: 500,
    justifyContent: 'space-between',
    lineHeight: '1.25rem',
    width: '100%',
  },
  triggerBtn: {
    borderRadius: '0.5rem',
    paddingBlock: '0.375rem',
    paddingInline: '0.5rem',
    backgroundColor: { default: 'transparent', ':hover': 'var(--muted)' },
    fontWeight: 500,
    width: '100%',
  },
  triggerTree: {
    borderRadius: '0.25rem',
    paddingBlock: '0.125rem',
    paddingInline: '0.25rem',
    backgroundColor: { default: 'transparent', ':hover': 'var(--muted)' },
    textAlign: 'start',
    width: '100%',
  },
  triggerRtl: {
    borderRadius: '0.5rem',
    alignItems: 'center',
    backgroundColor: { default: 'transparent', ':hover': 'var(--muted)' },
    display: 'inline-flex',
    justifyContent: 'center',
    height: '2rem',
    width: '2rem',
  },
  triggerSingle: {
    borderColor: 'var(--border)',
    borderRadius: '0.5rem',
    borderStyle: 'solid',
    borderWidth: '1px',
    display: 'block',
    paddingBlock: '0.5rem',
    paddingInline: '0.75rem',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    textAlign: 'start',
    width: '100%',
  },
  contentPad: { padding: '0.625rem' },
  contentTop: { paddingTop: '0.5rem' },
  panelGrid: {
    gap: '0.25rem',
    display: 'grid',
    paddingInlineStart: '1rem',
    paddingTop: '0.25rem',
  },
  panelStack: { gap: '0.5rem', display: 'flex', flexDirection: 'column' },
  contentSingle: {
    color: 'var(--muted-foreground)',
    display: 'block',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    paddingTop: '0.75rem',
  },
  contentStack: {
    gap: '0.5rem',
    alignItems: 'flex-start',
    display: 'flex',
    flexDirection: 'column',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
  icon: { height: '1rem', width: '1rem' },
  iconSm: { height: '0.875rem', width: '0.875rem' },
  iconSpin: { transform: 'rotate(180deg)', height: '1rem', width: '1rem' },
  grid2: {
    gap: '0.5rem',
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  },
  tree: {
    fontFamily:
      'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace)',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    maxWidth: '20rem',
    width: '100%',
  },
  treeRow: {
    gap: '0.25rem',
    alignItems: 'center',
    display: 'flex',
    width: '100%',
  },
  treeContent: { gap: '0.25rem', display: 'grid' },
  muted: { color: 'var(--muted-foreground)' },
  srOnly: {
    margin: '-1px',
    padding: 0,
    borderWidth: 0,
    overflow: 'hidden',
    clip: 'rect(0, 0, 0, 0)',
    clipPath: 'inset(50%)',
    position: 'absolute',
    whiteSpace: 'nowrap',
    height: '1px',
    width: '1px',
  },
  rtlWrap: {
    gap: '0.5rem',
    display: 'flex',
    flexDirection: 'column',
    width: '20rem',
  },
  orderRow: {
    gap: '1rem',
    paddingInline: '1rem',
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
  },
  orderTitle: { fontSize: '0.875rem', fontWeight: 600, lineHeight: '1.25rem' },
  bordered: {
    borderColor: 'var(--border)',
    borderRadius: '0.5rem',
    borderStyle: 'solid',
    borderWidth: '1px',
    paddingBlock: '0.5rem',
    paddingInline: '1rem',
    alignItems: 'center',
    display: 'flex',
    fontSize: '0.875rem',
    justifyContent: 'space-between',
    lineHeight: '1.25rem',
  },
  box: {
    borderColor: 'var(--border)',
    borderRadius: '0.5rem',
    borderStyle: 'solid',
    borderWidth: '1px',
    paddingBlock: '0.5rem',
    paddingInline: '1rem',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
  },
  boxStack: { gap: '0.5rem', display: 'flex', flexDirection: 'column' },
  medium: { fontWeight: 500 },
})

const sides = ['top', 'right', 'bottom', 'left'] as const
type Side = (typeof sides)[number]

type Preview = Readonly<{
  isOpen: boolean
  top: string
  right: string
  bottom: string
  left: string
  open: ReadonlyArray<string>
}>

export const collapsibleStyleXPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html | undefined => {
  const preview = model as Preview
  const fixture = collapsibleFixtures[exampleIndex]
  if (fixture === undefined) return undefined
  const toggle = (isOpen: boolean): Msg =>
    onMessageJson(JSON.stringify({ _tag: 'ToggledCollapsiblePreview', isOpen }))
  const chevron = (open: boolean) =>
    Icon.icon(
      'chevron-down',
      { class: className(open ? styles.iconSpin : styles.icon) },
      h,
    )

  if (fixture.kind === 'basic') {
    return Card.card(
      {
        layoutStyle: styles.cardSm,
        children: [
          Card.cardContent(
            {
              children: [
                Collapsible.collapsible(
                  {
                    id: `docs-collapsible-${String(exampleIndex)}`,
                    isOpen: preview.isOpen,
                    onToggle: toggle,
                    trigger: h.span(
                      [
                        h.Class(
                          className(styles.triggerRow, styles.triggerBtn),
                        ),
                      ],
                      ['Product details', chevron(preview.isOpen)],
                    ),
                    content: h.div(
                      [
                        h.Class(
                          className(styles.contentStack, styles.contentPad),
                        ),
                      ],
                      [
                        'This panel can be expanded or collapsed to reveal additional content.',
                        Button.button(
                          { children: ['Learn More'], size: 'xs' },
                          h,
                        ),
                      ],
                    ),
                  },
                  h,
                ),
              ],
            },
            h,
          ),
        ],
      },
      h,
    )
  }

  if (fixture.kind === 'settings') {
    const radiusInput = (side: Side) =>
      Input.input(
        {
          id: `docs-collapsible-${String(exampleIndex)}-${side}`,
          label: h.span(
            [h.Class(className(styles.srOnly))],
            [`${side} radius`],
          ),
          value: preview[side],
          onInput: value =>
            onMessageJson(
              JSON.stringify({ _tag: 'ChangedRadius', side, value }),
            ),
          placeholder: '0',
        },
        h,
      )

    return Card.card(
      {
        layoutStyle: styles.cardXs,
        children: [
          Card.cardHeader(
            {
              children: [
                Card.cardTitle({ children: ['Radius'] }, h),
                Card.cardDescription(
                  { children: ['Set the corner radius of the element.'] },
                  h,
                ),
              ],
            },
            h,
          ),
          Card.cardContent(
            {
              children: [
                h.div(
                  [h.Class(className(styles.grid2))],
                  [radiusInput('top'), radiusInput('right')],
                ),
                Collapsible.collapsible(
                  {
                    id: `docs-collapsible-${String(exampleIndex)}-panel`,
                    isOpen: preview.isOpen,
                    onToggle: toggle,
                    trigger: h.span(
                      [
                        h.Class(
                          className(styles.triggerRow, styles.triggerBtn),
                        ),
                      ],
                      ['More radii', chevron(preview.isOpen)],
                    ),
                    content: h.div(
                      [h.Class(className(styles.grid2, styles.contentTop))],
                      [radiusInput('bottom'), radiusInput('left')],
                    ),
                  },
                  h,
                ),
              ],
            },
            h,
          ),
        ],
      },
      h,
    )
  }

  if (fixture.kind === 'tree') {
    const folderCollapsible = (
      id: string,
      name: string,
      children: ReadonlyArray<Html>,
    ): Html =>
      Collapsible.collapsible(
        {
          id: `docs-collapsible-tree-${id}`,
          isOpen: preview.open.includes(id),
          onToggle: isOpen =>
            onMessageJson(JSON.stringify({ _tag: 'ToggledNode', id, isOpen })),
          trigger: h.span(
            [h.Class(className(styles.treeRow, styles.triggerTree))],
            [
              Icon.icon(
                preview.open.includes(id) ? 'chevron-down' : 'chevron-right',
                { class: className(styles.iconSm) },
                h,
              ),
              name,
            ],
          ),
          content: h.div(
            [h.Class(className(styles.treeContent, styles.panelGrid))],
            children,
          ),
        },
        h,
      )
    const fileRow = (name: string): Html =>
      h.span([h.Class(className(styles.muted))], [name])

    return h.div(
      [h.Class(className(styles.tree))],
      fileTree.map(folder =>
        folderCollapsible(
          folder.name,
          folder.name,
          folder.items.map(item =>
            typeof item === 'object' && 'items' in item
              ? folderCollapsible(
                  `${folder.name}/${item.name}`,
                  item.name,
                  item.items.map(child => fileRow(child.name)),
                )
              : fileRow(typeof item === 'string' ? item : item.name),
          ),
        ),
      ),
    )
  }

  if (fixture.kind === 'rtl') {
    return h.div(
      [h.Dir('rtl'), h.Class(className(styles.rtlWrap))],
      [
        h.div(
          [h.Class(className(styles.orderRow))],
          [
            h.h4(
              [h.Class(className(reset.text, styles.orderTitle))],
              ['الطلب #4189'],
            ),
            Collapsible.collapsible(
              {
                id: `docs-collapsible-${String(exampleIndex)}`,
                isOpen: preview.isOpen,
                onToggle: toggle,
                ariaLabel: 'Toggle order details',
                trigger: h.span(
                  [h.Class(className(styles.triggerRtl))],
                  [
                    Icon.icon(
                      'chevrons-up-down',
                      { class: className(styles.icon) },
                      h,
                    ),
                  ],
                ),
                content: h.div(
                  [h.Class(className(styles.boxStack, styles.panelStack))],
                  [
                    h.div(
                      [h.Class(className(styles.box))],
                      [
                        h.p(
                          [h.Class(className(reset.text, styles.medium))],
                          ['عنوان الشحن'],
                        ),
                        h.p(
                          [h.Class(className(reset.text, styles.muted))],
                          ['شارع السوق 100، سان فرانسيسكو'],
                        ),
                      ],
                    ),
                    h.div(
                      [h.Class(className(styles.box))],
                      [
                        h.p(
                          [h.Class(className(reset.text, styles.medium))],
                          ['العناصر'],
                        ),
                        h.p(
                          [h.Class(className(reset.text, styles.muted))],
                          ['سماعات الاستوديو ×2'],
                        ),
                      ],
                    ),
                  ],
                ),
              },
              h,
            ),
          ],
        ),
        h.div(
          [h.Class(className(styles.bordered))],
          [
            h.span([h.Class(className(styles.muted))], ['الحالة']),
            h.span([h.Class(className(styles.medium))], ['تم الشحن']),
          ],
        ),
      ],
    )
  }

  return Collapsible.collapsible(
    {
      id: `docs-collapsible-${String(exampleIndex)}`,
      isOpen: preview.isOpen,
      onToggle: toggle,
      isDisabled: true,
      trigger: h.span(
        [h.Class(className(styles.triggerSingle))],
        ['Unavailable details'],
      ),
      content: h.span(
        [h.Class(className(styles.contentSingle))],
        ['Foldkit keeps disclosure state in the application Model.'],
      ),
    },
    h,
  )
}
