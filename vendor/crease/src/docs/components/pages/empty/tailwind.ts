import type { Html, HtmlBuilder } from 'foldkit/html'

import { textPreviewProgram } from '@/docs/components/pages/authored-page'
import {
  type EmptyFixture,
  emptyFixtures,
  emptyRtlCopy,
} from '@/docs/components/pages/empty/shared'
import * as Avatar from '@/ui/avatar'
import * as Button from '@/ui/button'
import * as Empty from '@/ui/empty'
import * as Icon from '@/lib/icon'
import * as InputGroup from '@/ui/input-group'
import * as Kbd from '@/ui/kbd'

const emptyMedia = <M>(
  variant: 'icon' | 'default',
  children: ReadonlyArray<Html | string>,
  h: HtmlBuilder<M>,
): Html => Empty.emptyMedia({ variant, children }, h)

const headerBlock = <M>(
  title: string,
  description: string,
  media: Html,
  h: HtmlBuilder<M>,
): Html =>
  Empty.emptyHeader(
    {
      children: [
        media,
        Empty.emptyTitle({ children: [title] }, h),
        Empty.emptyDescription({ children: [description] }, h),
      ],
    },
    h,
  )

const avatarNode = <M>(
  src: string,
  alt: string,
  fallback: string,
  sizeClass: string | undefined,
  h: HtmlBuilder<M>,
): Html =>
  Avatar.avatar(
    {
      ...(sizeClass === undefined ? {} : { class: sizeClass }),
      children: [
        Avatar.avatarImage({ src, alt, model: { status: 'loaded' } }, h),
        Avatar.avatarFallback({ children: [fallback] }, h),
      ],
    },
    h,
  )

const linkRow = <M>(label: string, h: HtmlBuilder<M>): Html =>
  h.a(
    [
      h.Href('#'),
      h.Class(
        'inline-flex items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:underline',
      ),
    ],
    [label, Icon.icon('arrow-up-right', {}, h)],
  )

const emptyView = <M>(
  fixture: EmptyFixture,
  value: string,
  onInput: (value: string) => M,
  h: HtmlBuilder<M>,
): Html => {
  const empty = (children: ReadonlyArray<Html>): Html =>
    Empty.empty({ class: 'w-full max-w-xl', children }, h)
  const action = (
    variant: 'default' | 'outline',
    label: string,
    icon?: Html,
  ): Html =>
    Button.button(
      {
        variant,
        size: 'sm',
        children: icon === undefined ? [label] : [icon, label],
      },
      h,
    )
  switch (fixture.kind) {
    case 'demo':
      return empty([
        headerBlock(
          'No Projects Yet',
          "You haven't created any projects yet. Get started by creating your first project.",
          emptyMedia('icon', [Icon.icon('folder-code', {}, h)], h),
          h,
        ),
        Empty.emptyContent(
          {
            children: [
              h.div(
                [h.Class('flex-row justify-center gap-2')],
                [
                  action('default', 'Create Project'),
                  action('outline', 'Import Project'),
                ],
              ),
            ],
          },
          h,
        ),
        linkRow('Learn More', h),
      ])
    case 'outline':
      return h.div(
        [h.Class('border border-dashed')],
        [
          empty([
            headerBlock(
              'Cloud Storage Empty',
              'Upload files to your cloud storage to access them anywhere.',
              emptyMedia('icon', [Icon.icon('cloud', {}, h)], h),
              h,
            ),
            Empty.emptyContent(
              { children: [action('outline', 'Upload Files')] },
              h,
            ),
          ]),
        ],
      )
    case 'background':
      return h.div(
        [h.Class('h-full bg-muted/30')],
        [
          empty([
            headerBlock(
              'No Notifications',
              "You're all caught up. New notifications will appear here.",
              emptyMedia('icon', [Icon.icon('bell', {}, h)], h),
              h,
            ),
            Empty.emptyContent(
              {
                children: [
                  action('outline', 'Refresh', Icon.icon('refresh-ccw', {}, h)),
                ],
              },
              h,
            ),
          ]),
        ],
      )
    case 'avatar':
      return empty([
        headerBlock(
          'User Offline',
          'This user is currently offline. You can leave a message to notify them or try again later.',
          emptyMedia(
            'default',
            [
              avatarNode(
                '/logo-mark.svg',
                '@creaseui',
                'LR',
                'size-12 grayscale',
                h,
              ),
            ],
            h,
          ),
          h,
        ),
        Empty.emptyContent(
          { children: [action('default', 'Leave Message')] },
          h,
        ),
      ])
    case 'avatarGroup':
      return empty([
        headerBlock(
          'No Team Members',
          'Invite your team to collaborate on this project.',
          emptyMedia(
            'default',
            [
              Avatar.avatarGroup(
                {
                  class:
                    '*:data-[slot=avatar]:size-12 *:data-[slot=avatar]:grayscale',
                  children: (
                    [
                      ['/logo-mark.svg', '@creaseui', 'CU'],
                      ['https://github.com/maxleiter.png', '@maxleiter', 'LR'],
                      [
                        'https://github.com/evilrabbit.png',
                        '@evilrabbit',
                        'ER',
                      ],
                    ] as const
                  ).map(([src, alt, fb]) =>
                    avatarNode(src, alt, fb, undefined, h),
                  ),
                },
                h,
              ),
            ],
            h,
          ),
          h,
        ),
        Empty.emptyContent(
          {
            children: [
              action('default', 'Invite Members', Icon.icon('plus', {}, h)),
            ],
          },
          h,
        ),
      ])
    case 'inputGroup':
      return empty([
        Empty.emptyHeader(
          {
            children: [
              Empty.emptyTitle({ children: ['404 - Not Found'] }, h),
              Empty.emptyDescription(
                {
                  children: [
                    "The page you're looking for doesn't exist. Try searching for what you need below.",
                  ],
                },
                h,
              ),
            ],
          },
          h,
        ),
        Empty.emptyContent(
          {
            children: [
              InputGroup.inputGroup(
                {
                  class: 'sm:w-3/4',
                  children: [
                    InputGroup.inputGroupInput(
                      {
                        id: 'docs-empty-search',
                        value,
                        onInput,
                        placeholder: 'Try searching for pages...',
                      },
                      h,
                    ),
                    InputGroup.inputGroupAddon(
                      { children: [Icon.icon('search', {}, h)] },
                      h,
                    ),
                    InputGroup.inputGroupAddon(
                      {
                        align: 'inline-end',
                        children: [Kbd.kbd({ children: ['/'] }, h)],
                      },
                      h,
                    ),
                  ],
                },
                h,
              ),
              Empty.emptyDescription(
                {
                  children: [
                    h.span(
                      [],
                      [
                        'Need help? ',
                        h.a(
                          [h.Href('#'), h.Class('underline')],
                          ['Contact support'],
                        ),
                      ],
                    ),
                  ],
                },
                h,
              ),
            ],
          },
          h,
        ),
      ])
    case 'rtl':
      return h.div(
        [h.Dir('rtl')],
        [
          empty([
            headerBlock(
              emptyRtlCopy.title,
              emptyRtlCopy.description,
              emptyMedia('icon', [Icon.icon('folder-code', {}, h)], h),
              h,
            ),
            Empty.emptyContent(
              {
                children: [
                  h.div(
                    [h.Class('flex-row justify-center gap-2')],
                    [
                      action('default', emptyRtlCopy.create),
                      action('outline', emptyRtlCopy.import),
                    ],
                  ),
                ],
              },
              h,
            ),
            linkRow(emptyRtlCopy.learnMore, h),
          ]),
        ],
      )
  }
}

export const emptyTailwindPreviewProgram = textPreviewProgram(
  'empty',
  emptyFixtures.map(() => ''),
  (index, value, onInput, h) => {
    const fixture = emptyFixtures[index] ?? emptyFixtures[0]!
    return emptyView(fixture, value, onInput, h)
  },
)
