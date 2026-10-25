import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import type { ComponentLayoutStyle } from '@/stylex/contracts'
import {
  spinnerFixtures,
  type SpinnerFixture,
} from '@/docs/components/pages/spinner/shared'
import * as Icon from '@/lib/icon'
import * as Badge from '@/stylex/badge'
import * as Button from '@/stylex/button'
import * as Empty from '@/stylex/empty'
import * as InputGroup from '@/stylex/input-group'
import * as Item from '@/stylex/item'
import * as Spinner from '@/stylex/spinner'
import { className } from '@/stylex/style'

const styles = stylex.create({
  wrap: { maxWidth: '20rem', width: '100%' },
  wrapMd: { maxWidth: '28rem', width: '100%' },
  column: { gap: '1rem', display: 'flex', flexDirection: 'column' },
  row: { gap: '1.5rem', alignItems: 'center', display: 'flex' },
  rowSm: { gap: '1rem', alignItems: 'center', display: 'flex' },
  centerCol: {
    gap: '1rem',
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
  },
  accent: { color: 'var(--chart-2)' },
  amount: {
    fontSize: '0.875rem',
    fontVariantNumeric: 'tabular-nums',
    lineHeight: '1.25rem',
  },
  itemEnd: {
    flexBasis: 'auto',
    flexGrow: 0,
    flexShrink: 0,
    justifyContent: 'flex-end',
  },
  push: { marginInlineStart: 'auto' },
  spinnerIcon: { flexShrink: 0 },
  iconMd: { height: '1rem', width: '1rem' },
  srOnly: {
    margin: '-1px',
    overflow: 'hidden',
    clipPath: 'inset(50%)',
    position: 'absolute',
    whiteSpace: 'nowrap',
    height: '1px',
    width: '1px',
  },
})

const itemView = <Msg>(rtl: boolean, h: HtmlBuilder<Msg>): Html =>
  h.div(
    [...(rtl ? [h.Dir('rtl')] : []), h.Class(className(styles.wrap))],
    [
      Item.item(
        {
          variant: 'muted',
          children: [
            Item.itemMedia(
              {
                children: [Spinner.spinner({ isDecorative: true }, h)],
              },
              h,
            ),
            Item.itemContent(
              {
                children: [
                  Item.itemTitle(
                    {
                      children: [
                        rtl ? 'جاري معالجة الدفع...' : 'Processing payment...',
                      ],
                    },
                    h,
                  ),
                ],
              },
              h,
            ),
            Item.itemContent(
              {
                layoutStyle: styles.itemEnd as ComponentLayoutStyle,
                children: [
                  h.span(
                    [h.Class(className(styles.amount))],
                    [rtl ? '١٠٠.٠٠ دولار' : '$100.00'],
                  ),
                ],
              },
              h,
            ),
          ],
        },
        h,
      ),
    ],
  )

const fixtureView = <Msg>(
  fixture: SpinnerFixture,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const onInput = (id: string) => (value: string) =>
    onMessageJson(JSON.stringify({ _tag: 'ChangedInput', id, value }))
  switch (fixture.kind) {
    case 'item':
      return itemView('rtl' in fixture && fixture.rtl === true, h)
    case 'custom':
      return h.div(
        [h.Class(className(styles.accent))],
        [Spinner.spinner({ label: 'Loading', size: 'lg' }, h)],
      )
    case 'size':
      return h.div(
        [h.Class(className(styles.row))],
        [
          Spinner.spinner({ isDecorative: true, size: 'sm' }, h),
          Spinner.spinner({ isDecorative: true, size: 'md' }, h),
          Spinner.spinner({ isDecorative: true, size: 'lg' }, h),
          Spinner.spinner({ isDecorative: true, size: 'xl' }, h),
        ],
      )
    case 'button':
      return h.div(
        [h.Class(className(styles.centerCol))],
        [
          Button.button(
            {
              size: 'sm',
              isDisabled: true,
              iconInset: 'start',
              children: [
                Spinner.spinner(
                  {
                    isDecorative: true,
                    dataIcon: 'inline-start',
                    layoutStyle: styles.spinnerIcon,
                  },
                  h,
                ),
                'Loading...',
              ],
            },
            h,
          ),
          Button.button(
            {
              variant: 'outline',
              size: 'sm',
              isDisabled: true,
              iconInset: 'start',
              children: [
                Spinner.spinner(
                  {
                    isDecorative: true,
                    dataIcon: 'inline-start',
                    layoutStyle: styles.spinnerIcon,
                  },
                  h,
                ),
                'Please wait',
              ],
            },
            h,
          ),
          Button.button(
            {
              variant: 'secondary',
              size: 'sm',
              isDisabled: true,
              iconInset: 'start',
              children: [
                Spinner.spinner(
                  {
                    isDecorative: true,
                    dataIcon: 'inline-start',
                    layoutStyle: styles.spinnerIcon,
                  },
                  h,
                ),
                'Processing',
              ],
            },
            h,
          ),
        ],
      )
    case 'badge':
      return h.div(
        [h.Class(className(styles.rowSm))],
        [
          Badge.badge(
            {
              iconInset: 'start',
              children: [
                Spinner.spinner(
                  { isDecorative: true, dataIcon: 'inline-start', size: 'sm' },
                  h,
                ),
                'Syncing',
              ],
            },
            h,
          ),
          Badge.badge(
            {
              variant: 'secondary',
              iconInset: 'start',
              children: [
                Spinner.spinner(
                  { isDecorative: true, dataIcon: 'inline-start', size: 'sm' },
                  h,
                ),
                'Updating',
              ],
            },
            h,
          ),
          Badge.badge(
            {
              variant: 'outline',
              iconInset: 'start',
              children: [
                Spinner.spinner(
                  { isDecorative: true, dataIcon: 'inline-start', size: 'sm' },
                  h,
                ),
                'Processing',
              ],
            },
            h,
          ),
        ],
      )
    case 'inputGroup':
      return h.div(
        [h.Class(className(styles.column, styles.wrapMd))],
        [
          InputGroup.inputGroup(
            {
              children: [
                InputGroup.inputGroupInput(
                  {
                    id: 'spinner-message',
                    value: '',
                    onInput: onInput('spinner-message'),
                    placeholder: 'Send a message...',
                    isDisabled: true,
                  },
                  h,
                ),
                InputGroup.inputGroupAddon(
                  {
                    align: 'inline-end',
                    children: [Spinner.spinner({ isDecorative: true }, h)],
                  },
                  h,
                ),
              ],
            },
            h,
          ),
          InputGroup.inputGroup(
            {
              children: [
                InputGroup.inputGroupTextarea(
                  {
                    id: 'spinner-message-area',
                    value: '',
                    onInput: onInput('spinner-message-area'),
                    placeholder: 'Send a message...',
                    isDisabled: true,
                  },
                  h,
                ),
                InputGroup.inputGroupAddon(
                  {
                    align: 'block-end',
                    children: [
                      Spinner.spinner({ isDecorative: true }, h),
                      'Validating...',
                      InputGroup.inputGroupButton(
                        {
                          variant: 'default',
                          size: 'icon-sm',
                          layoutStyle: styles.push,
                          children: [
                            Icon.arrowUp(
                              { class: className(styles.iconMd) },
                              h,
                            ),
                            h.span(
                              [h.Class(className(styles.srOnly))],
                              ['Send'],
                            ),
                          ],
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
          ),
        ],
      )
    case 'empty':
      return Empty.empty(
        {
          children: [
            Empty.emptyHeader(
              {
                children: [
                  Empty.emptyMedia(
                    {
                      variant: 'icon',
                      children: [
                        Spinner.spinner(
                          {
                            isDecorative: true,
                            layoutStyle: styles.spinnerIcon,
                          },
                          h,
                        ),
                      ],
                    },
                    h,
                  ),
                  Empty.emptyTitle(
                    { children: ['Processing your request'] },
                    h,
                  ),
                  Empty.emptyDescription(
                    {
                      children: [
                        'Please wait while we process your request. Do not refresh the page.',
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
                  Button.button(
                    { variant: 'outline', size: 'sm', children: ['Cancel'] },
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
}

export const spinnerStyleXPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  _model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html =>
  fixtureView(
    spinnerFixtures[exampleIndex] ?? spinnerFixtures[0],
    onMessageJson,
    h,
  )
