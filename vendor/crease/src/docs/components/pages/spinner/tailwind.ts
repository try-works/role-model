import { Schema as S } from 'effect'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  spinnerFixtures,
  type SpinnerFixture,
} from '@/docs/components/pages/spinner/shared'
import * as Icon from '@/lib/icon'
import * as Badge from '@/ui/badge'
import * as Button from '@/ui/button'
import * as Empty from '@/ui/empty'
import * as InputGroup from '@/ui/input-group'
import * as Item from '@/ui/item'
import * as Spinner from '@/ui/spinner'

const Got = defineMessageUnion({
  ChangedInput: { id: S.String, value: S.String },
})
type Got = typeof Got.Type
const Model = S.Struct({ _docsPage: S.Literal('spinner') })
type Model = typeof Model.Type

const itemView = (rtl: boolean, h: HtmlBuilder<Got>): Html =>
  h.div(
    [...(rtl ? [h.Dir('rtl')] : []), h.Class('w-full max-w-xs')],
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
                class: 'flex-none justify-end',
                children: [
                  h.span(
                    [h.Class('text-sm tabular-nums')],
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

const fixtureView = (fixture: SpinnerFixture, h: HtmlBuilder<Got>): Html => {
  switch (fixture.kind) {
    case 'item':
      return itemView('rtl' in fixture && fixture.rtl === true, h)
    case 'custom':
      return h.div(
        [h.Class('text-chart-2')],
        [Spinner.spinner({ label: 'Loading', size: 'lg' }, h)],
      )
    case 'size':
      return h.div(
        [h.Class('flex items-center gap-6')],
        [
          Spinner.spinner({ isDecorative: true, size: 'sm' }, h),
          Spinner.spinner({ isDecorative: true, size: 'md' }, h),
          Spinner.spinner({ isDecorative: true, size: 'lg' }, h),
          Spinner.spinner({ isDecorative: true, size: 'xl' }, h),
        ],
      )
    case 'button':
      return h.div(
        [h.Class('flex flex-col items-center gap-4')],
        [
          Button.button(
            {
              size: 'sm',
              isDisabled: true,
              children: [
                Spinner.spinner(
                  { isDecorative: true, dataIcon: 'inline-start' },
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
              children: [
                Spinner.spinner(
                  { isDecorative: true, dataIcon: 'inline-start' },
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
              children: [
                Spinner.spinner(
                  { isDecorative: true, dataIcon: 'inline-start' },
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
        [h.Class('flex items-center gap-4')],
        [
          Badge.badge(
            {
              children: [
                Spinner.spinner(
                  { isDecorative: true, dataIcon: 'inline-start' },
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
              children: [
                Spinner.spinner(
                  { isDecorative: true, dataIcon: 'inline-start' },
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
              children: [
                Spinner.spinner(
                  { isDecorative: true, dataIcon: 'inline-start' },
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
        [h.Class('flex w-full max-w-md flex-col gap-4')],
        [
          InputGroup.inputGroup(
            {
              children: [
                InputGroup.inputGroupInput(
                  {
                    id: 'spinner-message',
                    value: '',
                    onInput: value =>
                      Got.ChangedInput({ id: 'spinner-message', value }),
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
                    onInput: value =>
                      Got.ChangedInput({ id: 'spinner-message-area', value }),
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
                          class: 'ml-auto',
                          children: [
                            Icon.arrowUp({}, h),
                            h.span([h.Class('sr-only')], ['Send']),
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
                      children: [Spinner.spinner({ isDecorative: true }, h)],
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

export const spinnerTailwindPreviewProgram = definePreviewProgram<Model, Got>({
  Model,
  Message: Got,
  init: () => ({ _docsPage: 'spinner' }),
  update: model => ({ model: model }),
  view: (index, _model, h) =>
    fixtureView(spinnerFixtures[index] ?? spinnerFixtures[0], h),
})
