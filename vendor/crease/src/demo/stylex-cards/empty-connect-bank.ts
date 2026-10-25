import type { Html, HtmlBuilder } from 'foldkit/html'

import * as Icon from '@/demo/icon-preview'
import { button } from '@/stylex/button'
import { card, cardContent } from '@/stylex/card'
import {
  empty,
  emptyContent,
  emptyDescription,
  emptyHeader,
  emptyMedia,
  emptyTitle,
} from '@/stylex/empty'

export const view = <Msg>(h: HtmlBuilder<Msg>): Html =>
  card(
    {
      children: [
        cardContent(
          {
            children: [
              empty(
                {
                  children: [
                    emptyMedia(
                      {
                        variant: 'icon',
                        children: [Icon.icon('credit-card', {}, h)],
                      },
                      h,
                    ),
                    emptyHeader(
                      {
                        children: [
                          emptyTitle({ children: ['Connect Bank'] }, h),
                          emptyDescription(
                            {
                              children: [
                                'Link your payout method to receive monthly royalty distributions automatically.',
                              ],
                            },
                            h,
                          ),
                        ],
                      },
                      h,
                    ),
                    emptyContent(
                      {
                        children: [button({ children: ['Set Up Payouts'] }, h)],
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
    },
    h,
  )

// Card summary: stateful? no. Submodels wired: none. PORT NOTEs: none.
