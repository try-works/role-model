import { Schema as S } from 'effect'
import { defineMessageUnion } from 'foldkit/message'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  collapsibleFixtures,
  fileTree,
} from '@/docs/components/pages/collapsible/shared'
import * as Icon from '@/lib/icon'
import * as Button from '@/ui/button'
import * as Card from '@/ui/card'
import * as Collapsible from '@/ui/collapsible'
import * as Input from '@/ui/input'

const sides = ['top', 'right', 'bottom', 'left'] as const
type Side = (typeof sides)[number]

const PreviewModel = S.Struct({
  _docsPage: S.Literal('collapsible'),
  isOpen: S.Boolean,
  top: S.String,
  right: S.String,
  bottom: S.String,
  left: S.String,
  open: S.Array(S.String),
})
type PreviewModel = typeof PreviewModel.Type

const PreviewMessages = defineMessageUnion({
  ToggledCollapsiblePreview: { isOpen: S.Boolean },
  ChangedRadius: { side: S.Literals(sides), value: S.String },
  ToggledNode: { id: S.String, isOpen: S.Boolean },
})
type PreviewMessage = typeof PreviewMessages.Type

const basicView = (
  index: number,
  model: PreviewModel,
  h: HtmlBuilder<PreviewMessage>,
) =>
  Card.card(
    {
      class: 'mx-auto w-full max-w-sm',
      children: [
        Card.cardContent(
          {
            children: [
              Collapsible.collapsible(
                {
                  id: `docs-collapsible-${String(index)}`,
                  isOpen: model.isOpen,
                  onToggle: isOpen =>
                    PreviewMessages.ToggledCollapsiblePreview({ isOpen }),
                  trigger: h.span(
                    [h.Class('flex w-full items-center justify-between gap-2')],
                    [
                      'Product details',
                      Icon.icon(
                        'chevron-down',
                        {
                          class: `size-4 transition-transform ${model.isOpen ? 'rotate-180' : ''}`,
                        },
                        h,
                      ),
                    ],
                  ),
                  triggerClass:
                    'w-full rounded-md px-2 py-1.5 text-sm font-medium hover:bg-muted',
                  contentClass: 'pt-0 p-2.5',
                  content: h.div(
                    [h.Class('flex flex-col items-start gap-2 text-sm')],
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

const settingsView = (
  index: number,
  model: PreviewModel,
  h: HtmlBuilder<PreviewMessage>,
) => {
  const radiusInput = (side: Side) =>
    Input.input(
      {
        id: `docs-collapsible-${String(index)}-${side}`,
        label: h.span([h.Class('sr-only')], [`${side} radius`]),
        value: model[side],
        onInput: value => PreviewMessages.ChangedRadius({ side, value }),
        placeholder: '0',
      },
      h,
    )

  return Card.card(
    {
      class: 'mx-auto w-full max-w-xs',
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
                [h.Class('grid grid-cols-2 gap-2')],
                [radiusInput('top'), radiusInput('right')],
              ),
              Collapsible.collapsible(
                {
                  id: `docs-collapsible-${String(index)}-panel`,
                  isOpen: model.isOpen,
                  onToggle: isOpen =>
                    PreviewMessages.ToggledCollapsiblePreview({ isOpen }),
                  trigger: h.span(
                    [h.Class('flex w-full items-center justify-between gap-2')],
                    [
                      'More radii',
                      Icon.icon(
                        'chevron-down',
                        {
                          class: `size-4 transition-transform ${model.isOpen ? 'rotate-180' : ''}`,
                        },
                        h,
                      ),
                    ],
                  ),
                  triggerClass:
                    'w-full rounded-md px-2 py-1.5 text-sm font-medium hover:bg-muted',
                  contentClass: 'pt-2',
                  content: h.div(
                    [h.Class('grid grid-cols-2 gap-2')],
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

const treeView = (
  _index: number,
  model: PreviewModel,
  h: HtmlBuilder<PreviewMessage>,
) => {
  const chevron = (open: boolean) =>
    Icon.icon(open ? 'chevron-down' : 'chevron-right', { class: 'size-3.5' }, h)
  const fileRow = (name: string) =>
    h.span([h.Class('text-muted-foreground')], [name])
  const folderCollapsible = (
    id: string,
    name: string,
    children: ReadonlyArray<Html>,
  ) =>
    Collapsible.collapsible(
      {
        id: `docs-collapsible-tree-${id}`,
        isOpen: model.open.includes(id),
        onToggle: isOpen => PreviewMessages.ToggledNode({ id, isOpen }),
        trigger: h.span(
          [h.Class('flex items-center gap-1')],
          [chevron(model.open.includes(id)), name],
        ),
        triggerClass: 'w-full rounded px-1 py-0.5 text-start hover:bg-muted',
        contentClass: 'ps-4 grid gap-1 pt-1',
        content: h.div([h.Class('grid gap-1')], children),
      },
      h,
    )

  return h.div(
    [h.Class('w-full max-w-xs font-mono text-sm')],
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

const rtlView = (
  index: number,
  model: PreviewModel,
  h: HtmlBuilder<PreviewMessage>,
) =>
  h.div(
    [h.Dir('rtl'), h.Class('flex w-80 flex-col gap-2')],
    [
      h.div(
        [h.Class('flex items-center justify-between gap-4 px-4')],
        [
          h.h4([h.Class('text-sm font-semibold')], ['الطلب #4189']),
          Collapsible.collapsible(
            {
              id: `docs-collapsible-${String(index)}`,
              isOpen: model.isOpen,
              onToggle: isOpen =>
                PreviewMessages.ToggledCollapsiblePreview({ isOpen }),
              ariaLabel: 'Toggle order details',
              trigger: Icon.icon('chevrons-up-down', { class: 'size-4' }, h),
              triggerClass:
                'size-8 rounded-md hover:bg-muted inline-flex items-center justify-center',
              contentClass: 'flex flex-col gap-2',
              content: h.div(
                [h.Class('flex flex-col gap-2')],
                [
                  h.div(
                    [h.Class('rounded-md border px-4 py-2 text-sm')],
                    [
                      h.p([h.Class('font-medium')], ['عنوان الشحن']),
                      h.p(
                        [h.Class('text-muted-foreground')],
                        ['شارع السوق 100، سان فرانسيسكو'],
                      ),
                    ],
                  ),
                  h.div(
                    [h.Class('rounded-md border px-4 py-2 text-sm')],
                    [
                      h.p([h.Class('font-medium')], ['العناصر']),
                      h.p(
                        [h.Class('text-muted-foreground')],
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
        [
          h.Class(
            'flex items-center justify-between rounded-md border px-4 py-2 text-sm',
          ),
        ],
        [
          h.span([h.Class('text-muted-foreground')], ['الحالة']),
          h.span([h.Class('font-medium')], ['تم الشحن']),
        ],
      ),
    ],
  )

const singleView = (
  index: number,
  model: PreviewModel,
  h: HtmlBuilder<PreviewMessage>,
) =>
  Collapsible.collapsible(
    {
      id: `docs-collapsible-${String(index)}`,
      isOpen: model.isOpen,
      onToggle: isOpen => PreviewMessages.ToggledCollapsiblePreview({ isOpen }),
      isDisabled: true,
      trigger: 'Unavailable details',
      triggerClass: 'rounded-md border px-3 py-2 text-sm',
      contentClass: 'pt-3 text-sm text-muted-foreground',
      content: 'Foldkit keeps disclosure state in the application Model.',
    },
    h,
  )

export const collapsibleTailwindPreviewProgram = definePreviewProgram<
  PreviewModel,
  PreviewMessage
>({
  Model: PreviewModel,
  Message: PreviewMessages,
  init: () => ({
    _docsPage: 'collapsible',
    isOpen: false,
    top: '0',
    right: '0',
    bottom: '0',
    left: '0',
    open: ['components'],
  }),
  update: (model, message) => {
    switch (message._tag) {
      case 'ToggledCollapsiblePreview':
        return { model: { ...model, isOpen: message.isOpen } }
      case 'ChangedRadius':
        return { model: { ...model, [message.side]: message.value } }
      case 'ToggledNode':
        return {
          model: {
            ...model,
            open: message.isOpen
              ? [...model.open, message.id]
              : model.open.filter(id => id !== message.id),
          },
        }
    }
  },
  view: (index, model, h) => {
    const kind = collapsibleFixtures[index]?.kind ?? 'single'
    return kind === 'basic'
      ? basicView(index, model, h)
      : kind === 'settings'
        ? settingsView(index, model, h)
        : kind === 'tree'
          ? treeView(index, model, h)
          : kind === 'rtl'
            ? rtlView(index, model, h)
            : singleView(index, model, h)
  },
})
