import { Style } from '@pleat/core'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import * as Icon from '@/lib/icon'
import * as Marker from '@/pleat/marker'
import * as Toast from '@/pleat/toast'
import * as Spinner from '@/pleat/spinner'
import { className } from '@/pleat/style'
import { markerFixtures, type MarkerKind } from './shared'

const styles = {
  stack: Style.make({
    gap: '2rem',
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '24rem',
    paddingBottom: '3rem',
    paddingTop: '3rem',
    width: '100%',
  }),
  stackTight: Style.make({ gap: '0.75rem' }),
  stackWide: Style.make({ gap: '3rem' }),
  icon4: Style.make({ height: '1rem', width: '1rem' }),
}

const sx = (style: Style.Style): string => className(style)

interface MarkerPreviewShape {
  readonly notifications: Toast.Model
}

const send = <Msg>(
  onMessageJson: (messageJson: string) => Msg,
  tag: string,
  fields?: Readonly<Record<string, unknown>>,
): Msg => onMessageJson(JSON.stringify({ _tag: tag, ...(fields ?? {}) }))

const markerSxView = <Msg>(
  kind: MarkerKind,
  model: MarkerPreviewShape,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const icon = (name: string): Html =>
    Marker.markerIcon(
      { children: [Icon.icon(name, { class: sx(styles.icon4) }, h)] },
      h,
    )
  const content = (text: string, shimmer = false): Html =>
    Marker.markerContent(
      { ...(shimmer ? { shimmer: true } : {}), children: [text] },
      h,
    )
  const spinner = Spinner.spinner({ size: 'sm', isDecorative: true }, h)
  switch (kind) {
    case 'demo':
      return h.div(
        [h.Class(sx(styles.stack))],
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
        [h.Class(sx(styles.stack))],
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
        [h.Class(sx(styles.stack))],
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
        [h.Class(sx(styles.stack))],
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
        [h.Class(sx(styles.stack))],
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
        [h.Class(className(styles.stack, styles.stackTight))],
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
        [h.Class(className(styles.stack, styles.stackWide))],
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
              direction: 'column',
              children: [icon('book-open-check'), content('Syncing completed')],
            },
            h,
          ),
        ],
      )
    case 'linksAndButtons':
      return h.div(
        [h.Class(sx(styles.stack))],
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
              onClick: () => send(onMessageJson, 'ClickedRevert'),
              children: [icon('rotate-ccw'), content('Revert this change')],
            },
            h,
          ),
          Toast.toast(
            {
              model: model.notifications,
              toParentMessage: message =>
                send(onMessageJson, 'GotToastMessage', { message }),
            },
            h,
          ),
        ],
      )
  }
}

export const markerPleatPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) =>
  markerSxView(
    (markerFixtures[exampleIndex] ?? markerFixtures[0]).kind,
    model as MarkerPreviewShape,
    onMessageJson,
    h,
  )
