import { Schema as S } from 'effect'
import { defineMessageUnion } from 'foldkit/message'
import type { Html, HtmlBuilder } from 'foldkit/html'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import type { ActionBarFixture } from '@/docs/components/pages/action-bar/shared'
import { actionBarFixtures } from '@/docs/components/pages/action-bar/shared'
import * as ActionBar from '@/ui/action-bar'
import * as Icon from '@/lib/icon'
import * as Button from '@/ui/button'

const Side = S.Union([S.Literal('top'), S.Literal('bottom')])
const Align = S.Union([
  S.Literal('start'),
  S.Literal('center'),
  S.Literal('end'),
])

const ActionBarPreviewMessage = defineMessageUnion({
  ToggledSelection: {},
  OpenedAt: { side: Side, align: Align },
  ClosedActionBar: {},
  IgnoredMountMessage: {},
})
type ActionBarPreviewMessage = typeof ActionBarPreviewMessage.Type
const ActionBarPreviewModel = S.Struct({
  _docsPage: S.Literal('action-bar'),
  selected: S.Number,
  side: Side,
  align: Align,
})
type ActionBarPreviewModel = typeof ActionBarPreviewModel.Type

const positions = [
  { label: 'Top Left', side: 'top', align: 'start' },
  { label: 'Top Center', side: 'top', align: 'center' },
  { label: 'Top Right', side: 'top', align: 'end' },
  { label: 'Bottom Left', side: 'bottom', align: 'start' },
  { label: 'Bottom Center', side: 'bottom', align: 'center' },
  { label: 'Bottom Right', side: 'bottom', align: 'end' },
] as const

const barChildren = (
  model: ActionBarPreviewModel,
  h: HtmlBuilder<ActionBarPreviewMessage>,
): Array<Html> => [
  ActionBar.actionBarSelection(
    { children: [`${String(model.selected)} selected`] },
    h,
  ),
  ActionBar.actionBarSeparator({}, h),
  ActionBar.actionBarItem(
    {
      onSelect: ActionBarPreviewMessage.ClosedActionBar({}),
      children: ['Mark completed'],
    },
    h,
  ),
  ActionBar.actionBarItem(
    {
      onSelect: ActionBarPreviewMessage.ClosedActionBar({}),
      children: ['Assign'],
    },
    h,
  ),
  ActionBar.actionBarItem(
    {
      onSelect: ActionBarPreviewMessage.ClosedActionBar({}),
      children: ['Archive'],
    },
    h,
  ),
  ActionBar.actionBarItem(
    {
      onSelect: ActionBarPreviewMessage.ClosedActionBar({}),
      variant: 'destructive',
      children: ['Delete'],
    },
    h,
  ),
  ActionBar.actionBarClose(
    {
      onClose: ActionBarPreviewMessage.ClosedActionBar({}),
      ariaLabel: 'Clear selection',
      children: [Icon.icon('x', { class: 'size-4' }, h)],
    },
    h,
  ),
]

const previewBar = (
  model: ActionBarPreviewModel,
  h: HtmlBuilder<ActionBarPreviewMessage>,
): Html =>
  ActionBar.actionBar(
    {
      open: model.selected > 0,
      side: model.side,
      align: model.align,
      alignOffset: model.align === 'center' ? 0 : 16,
      toParentMessage: mountMessage =>
        mountMessage._tag === 'RequestedClose'
          ? ActionBarPreviewMessage.ClosedActionBar({})
          : ActionBarPreviewMessage.IgnoredMountMessage({}),
      children: barChildren(model, h),
    },
    h,
  )

const previewTrigger = (
  fixture: ActionBarFixture,
  model: ActionBarPreviewModel,
  h: HtmlBuilder<ActionBarPreviewMessage>,
): Html =>
  fixture.variant === 'positions'
    ? h.div(
        [h.Class('flex flex-wrap justify-center gap-2')],
        positions.map(position =>
          Button.button(
            {
              variant: 'outline',
              onClick: ActionBarPreviewMessage.OpenedAt({
                side: position.side,
                align: position.align,
              }),
              children: [position.label],
            },
            h,
          ),
        ),
      )
    : Button.button(
        {
          variant: 'outline',
          onClick: ActionBarPreviewMessage.ToggledSelection({}),
          children: [
            model.selected === 0 ? 'Select 3 tasks' : 'Clear selection',
          ],
        },
        h,
      )

export const actionBarTailwindPreviewProgram = definePreviewProgram<
  ActionBarPreviewModel,
  ActionBarPreviewMessage
>({
  Model: ActionBarPreviewModel,
  Message: ActionBarPreviewMessage,
  init: () => ({
    _docsPage: 'action-bar',
    selected: 0,
    side: 'bottom',
    align: 'center',
  }),
  update: (model, message) => {
    switch (message._tag) {
      case 'ToggledSelection':
        return { model: { ...model, selected: model.selected === 0 ? 3 : 0 } }
      case 'OpenedAt':
        return {
          model: {
            ...model,
            selected: 3,
            side: message.side,
            align: message.align,
          },
        }
      case 'ClosedActionBar':
        return { model: { ...model, selected: 0 } }
      case 'IgnoredMountMessage':
        return { model }
    }
  },
  view: (index, model, h) => {
    const fixture = actionBarFixtures[index] ?? actionBarFixtures[0]
    return h.div([], [previewTrigger(fixture, model, h), previewBar(model, h)])
  },
})
