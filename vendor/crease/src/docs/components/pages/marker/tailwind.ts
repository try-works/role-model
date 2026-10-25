import * as S from 'effect/Schema'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  markerFixtures,
  type MarkerKind,
} from '@/docs/components/pages/marker/shared'
import * as Icon from '@/lib/icon'
import * as Marker from '@/ui/marker'
import * as Toast from '@/ui/toast'
import * as Spinner from '@/ui/spinner'

const MarkerPreviewModel = S.Struct({
  _docsPage: S.Literal('marker'),
  notifications: Toast.Model,
})
type MarkerPreviewModel = S.Schema.Type<typeof MarkerPreviewModel>

const MarkerPreviewMessage = defineMessageUnion({
  ClickedRevert: {},
  GotToastMessage: {
    message: S.Union([Toast.Message, Toast.ActivatedToastAction]),
  },
})
type MarkerPreviewMessage = typeof MarkerPreviewMessage.Type

const markerView = (
  kind: MarkerKind,
  model: MarkerPreviewModel,
  h: HtmlBuilder<MarkerPreviewMessage>,
): Html => {
  const icon = (name: string): Html =>
    Marker.markerIcon({ children: [Icon.icon(name, {}, h)] }, h)
  const content = (text: string, shimmer = false): Html =>
    Marker.markerContent(
      { ...(shimmer ? { shimmer: true } : {}), children: [text] },
      h,
    )
  const spinner = Spinner.spinner({ size: 'sm', isDecorative: true }, h)
  const stack = 'flex w-full max-w-sm flex-col gap-8 py-12'
  switch (kind) {
    case 'demo':
      return h.div(
        [h.Class(stack)],
        [
          Marker.marker(
            {
              children: [
                icon('git-branch'),
                content('Switched to a new branch'),
              ],
            },
            h,
          ),
          Marker.marker(
            {
              purpose: 'status',
              children: [
                Marker.markerIcon({ children: [spinner] }, h),
                content('Thinking...', true),
              ],
            },
            h,
          ),
          Marker.marker(
            {
              variant: 'separator',
              children: [content('Conversation compacted')],
            },
            h,
          ),
          Marker.marker(
            {
              children: [icon('search'), content('Explored 4 files')],
            },
            h,
          ),
        ],
      )
    case 'variants':
      return h.div(
        [h.Class(stack)],
        [
          Marker.marker(
            {
              children: [content('A default marker for inline notes.')],
            },
            h,
          ),
          Marker.marker(
            {
              variant: 'separator',
              children: [content('A separator marker')],
            },
            h,
          ),
          Marker.marker(
            {
              variant: 'border',
              children: [content('A border marker for row boundaries.')],
            },
            h,
          ),
        ],
      )
    case 'status':
      return h.div(
        [h.Class(stack)],
        [
          Marker.marker(
            {
              purpose: 'status',
              children: [
                Marker.markerIcon({ children: [spinner] }, h),
                content('Compacting conversation'),
              ],
            },
            h,
          ),
          Marker.marker(
            {
              variant: 'separator',
              purpose: 'status',
              children: [
                Marker.markerIcon({ children: [spinner] }, h),
                content('Running tests'),
              ],
            },
            h,
          ),
        ],
      )
    case 'shimmer':
      return h.div(
        [h.Class(stack)],
        [
          Marker.marker(
            {
              purpose: 'status',
              children: [content('Thinking...', true)],
            },
            h,
          ),
          Marker.marker(
            {
              variant: 'separator',
              purpose: 'status',
              children: [content('Reading 4 files', true)],
            },
            h,
          ),
        ],
      )
    case 'separator':
      return h.div(
        [h.Class(stack)],
        [
          Marker.marker(
            {
              variant: 'separator',
              children: [content('Today')],
            },
            h,
          ),
          Marker.marker(
            {
              variant: 'separator',
              children: [content('Worked for 42s')],
            },
            h,
          ),
          Marker.marker(
            {
              variant: 'separator',
              children: [content('Conversation compacted')],
            },
            h,
          ),
        ],
      )
    case 'border':
      return h.div(
        [h.Class('flex w-full max-w-sm flex-col gap-3 py-12')],
        [
          Marker.marker(
            {
              variant: 'border',
              children: [
                icon('git-branch'),
                content('Switched to release-candidate'),
              ],
            },
            h,
          ),
          Marker.marker(
            {
              variant: 'border',
              children: [icon('search'), content('Reviewed 8 related files')],
            },
            h,
          ),
          Marker.marker(
            {
              variant: 'border',
              children: [
                icon('file-text'),
                content('Opened implementation notes'),
              ],
            },
            h,
          ),
        ],
      )
    case 'icon':
      return h.div(
        [h.Class('flex w-full max-w-sm flex-col gap-12 py-12')],
        [
          Marker.marker(
            {
              children: [
                icon('git-branch'),
                content('Switched to a new branch'),
              ],
            },
            h,
          ),
          Marker.marker(
            {
              variant: 'separator',
              children: [icon('search'), content('Explored 4 files')],
            },
            h,
          ),
          Marker.marker(
            {
              class: 'flex-col',
              children: [icon('book-open-check'), content('Syncing completed')],
            },
            h,
          ),
        ],
      )
    case 'linksAndButtons':
      return h.div(
        [h.Class(stack)],
        [
          Marker.marker(
            {
              element: 'a',
              href: '#links-and-buttons',
              children: [icon('git-branch'), content('View the pull request')],
            },
            h,
          ),
          Marker.marker(
            {
              element: 'button',
              onClick: () => MarkerPreviewMessage.ClickedRevert(),
              children: [icon('rotate-ccw'), content('Revert this change')],
            },
            h,
          ),
          Toast.toast(
            {
              model: model.notifications,
              toParentMessage: message =>
                MarkerPreviewMessage.GotToastMessage({ message }),
            },
            h,
          ),
        ],
      )
  }
}

export const markerTailwindPreviewProgram = definePreviewProgram<
  MarkerPreviewModel,
  MarkerPreviewMessage
>({
  Model: MarkerPreviewModel,
  Message: MarkerPreviewMessage,
  init: () => ({
    _docsPage: 'marker',
    notifications: Toast.init({ id: 'marker-notifications' }),
  }),
  update: (model, message) => {
    switch (message._tag) {
      case 'ClickedRevert': {
        const result = Toast.show(
          model.notifications,
          Toast.info({ title: 'You clicked the revert button' }),
        )
        return {
          model: { ...model, notifications: result.model },
          commands: Command.mapMessages(result.commands ?? [], next =>
            MarkerPreviewMessage.GotToastMessage({ message: next }),
          ),
        }
      }
      case 'GotToastMessage': {
        const { model: notifications, commands } = Toast.update(
          model.notifications,
          message.message,
        )
        return {
          model: { ...model, notifications },
          commands: Command.mapMessages(commands ?? [], next =>
            MarkerPreviewMessage.GotToastMessage({ message: next }),
          ),
        }
      }
    }
  },
  view: (index, model, h) =>
    markerView((markerFixtures[index] ?? markerFixtures[0]).kind, model, h),
})
