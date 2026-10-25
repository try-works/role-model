import { reset } from '@/stylex/reset'
import type { Html, HtmlBuilder } from 'foldkit/html'
import * as stylex from '@stylexjs/stylex'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import type { ComponentLayoutStyle } from '@/stylex/contracts'
import {
  type EmptyFixture,
  emptyFixtures,
  emptyRtlCopy,
} from '@/docs/components/pages/empty/shared'
import * as Avatar from '@/stylex/avatar'
import * as Button from '@/stylex/button'
import * as Empty from '@/stylex/empty'
import * as Icon from '@/lib/icon'
import * as InputGroup from '@/stylex/input-group'
import * as Kbd from '@/stylex/kbd'
import { className } from '@/stylex/style'

const styles = stylex.create({
  empty: { maxWidth: '36rem', width: '100%' },
  dashedBox: {
    borderColor: 'var(--border)',
    borderStyle: 'dashed',
    borderWidth: '1px',
  },
  backgroundBox: {
    backgroundColor: 'color-mix(in oklab, var(--muted) 30%, transparent)',
    height: '100%',
  },
  avatarSize: { height: '3rem', width: '3rem' },
  avatarImgAspect: { borderRadius: 0, aspectRatio: '1 / 1', objectFit: 'fill' },
  avatarSizeOverlap: {
    marginInlineEnd: '-0.5rem',
    height: '3rem',
    width: '3rem',
  },
  actionRow: {
    gap: '0.5rem',
    justifyContent: 'center',
  },
  linkRow: {
    gap: '0.25rem',
    alignItems: 'center',
    color: 'var(--muted-foreground)',
    display: 'inline-flex',
    fontSize: '0.875rem',
    lineHeight: '1.25rem',
    textDecorationLine: { default: 'none', ':hover': 'underline' },
    textUnderlineOffset: '4px',
  },
  mediaIconSvg: { flexShrink: 0, height: '1.5rem', width: '1.5rem' },
  buttonIcon: { flexShrink: 0, height: '1rem', width: '1rem' },
  addonIcon: { height: '1rem', width: '1rem' },
  inputWidth: { width: '75%' },
  helpLink: { textDecoration: 'underline' },
})

const headerBlock = <Msg>(
  title: string,
  description: string,
  media: Html,
  h: HtmlBuilder<Msg>,
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

const avatarNode = <Msg>(
  src: string,
  alt: string,
  fallback: string,
  inGroup: boolean,
  nonLast: boolean,
  h: HtmlBuilder<Msg>,
): Html =>
  Avatar.avatar(
    {
      grayscale: true,
      ...(inGroup ? { ring: true } : {}),
      layoutStyle: nonLast ? styles.avatarSizeOverlap : styles.avatarSize,
      children: [
        Avatar.avatarImage(
          {
            src,
            alt,
            model: { status: 'loaded' },
            layoutStyle: styles.avatarImgAspect as ComponentLayoutStyle,
          },
          h,
        ),
        Avatar.avatarFallback({ children: [fallback] }, h),
      ],
    },
    h,
  )

const linkRow = <Msg>(label: string, h: HtmlBuilder<Msg>): Html =>
  h.a(
    [h.Href('#'), h.Class(className(reset.link, styles.linkRow))],
    [label, Icon.icon('arrow-up-right', {}, h)],
  )

const emptyView = <Msg>(
  fixture: EmptyFixture,
  value: string,
  onInput: (value: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const empty = (children: ReadonlyArray<Html>): Html =>
    Empty.empty({ layoutStyle: styles.empty, children }, h)
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
          Empty.emptyMedia(
            {
              variant: 'icon',
              children: [
                Icon.icon(
                  'folder-code',
                  { class: className(styles.mediaIconSvg) },
                  h,
                ),
              ],
            },
            h,
          ),
          h,
        ),
        Empty.emptyContent(
          {
            children: [
              h.div(
                [h.Class(className(styles.actionRow))],
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
        [h.Class(className(styles.dashedBox))],
        [
          empty([
            headerBlock(
              'Cloud Storage Empty',
              'Upload files to your cloud storage to access them anywhere.',
              Empty.emptyMedia(
                {
                  variant: 'icon',
                  children: [
                    Icon.icon(
                      'cloud',
                      { class: className(styles.mediaIconSvg) },
                      h,
                    ),
                  ],
                },
                h,
              ),
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
        [h.Class(className(styles.backgroundBox))],
        [
          empty([
            headerBlock(
              'No Notifications',
              "You're all caught up. New notifications will appear here.",
              Empty.emptyMedia(
                {
                  variant: 'icon',
                  children: [
                    Icon.icon(
                      'bell',
                      { class: className(styles.mediaIconSvg) },
                      h,
                    ),
                  ],
                },
                h,
              ),
              h,
            ),
            Empty.emptyContent(
              {
                children: [
                  action(
                    'outline',
                    'Refresh',
                    Icon.icon(
                      'refresh-ccw',
                      { class: className(styles.buttonIcon) },
                      h,
                    ),
                  ),
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
          Empty.emptyMedia(
            {
              variant: 'default',
              children: [
                avatarNode(
                  '/logo-mark.svg',
                  '@creaseui',
                  'LR',
                  false,
                  false,
                  h,
                ),
              ],
            },
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
          Empty.emptyMedia(
            {
              variant: 'default',
              children: [
                Avatar.avatarGroup(
                  {
                    grayscale: true,
                    children: (
                      [
                        ['/logo-mark.svg', '@creaseui', 'CU'],
                        [
                          'https://github.com/maxleiter.png',
                          '@maxleiter',
                          'LR',
                        ],
                        [
                          'https://github.com/evilrabbit.png',
                          '@evilrabbit',
                          'ER',
                        ],
                      ] as const
                    ).map(([src, alt, fb], i, arr) =>
                      avatarNode(src, alt, fb, true, i < arr.length - 1, h),
                    ),
                  },
                  h,
                ),
              ],
            },
            h,
          ),
          h,
        ),
        Empty.emptyContent(
          {
            children: [
              action(
                'default',
                'Invite Members',
                Icon.icon('plus', { class: className(styles.buttonIcon) }, h),
              ),
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
                  layoutStyle: styles.inputWidth,
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
                      {
                        children: [
                          Icon.icon(
                            'search',
                            { class: className(styles.addonIcon) },
                            h,
                          ),
                        ],
                      },
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
                          [
                            h.Href('#'),
                            h.Class(className(reset.link, styles.helpLink)),
                          ],
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
              Empty.emptyMedia(
                {
                  variant: 'icon',
                  children: [
                    Icon.icon(
                      'folder-code',
                      { class: className(styles.mediaIconSvg) },
                      h,
                    ),
                  ],
                },
                h,
              ),
              h,
            ),
            Empty.emptyContent(
              {
                children: [
                  h.div(
                    [h.Class(className(styles.actionRow))],
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

export const emptyStyleXPreview: ExamplePreviewProvider = <Msg>(
  index: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html | undefined => {
  const fixture = emptyFixtures[index]
  if (fixture === undefined) return undefined
  const { value } = model as { value: string }
  return emptyView(
    fixture,
    value,
    v =>
      onMessageJson(
        JSON.stringify({ _tag: 'ChangedTextDocsPreview', value: v }),
      ),
    h,
  )
}
