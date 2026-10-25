import type { Html, HtmlBuilder } from 'foldkit/html'

import { button } from '@/ui/button'
import { card, cardContent } from '@/ui/card'
import {
  empty,
  emptyContent,
  emptyDescription,
  emptyHeader,
  emptyMedia,
  emptyTitle,
} from '@/ui/empty'
import { spinner } from '@/ui/spinner'

export const view = <Msg>(h: HtmlBuilder<Msg>): Html =>
  card(
    {
      children: [
        cardContent(
          {
            class: 'p-0',
            children: [
              empty(
                {
                  class: 'p-4',
                  children: [
                    emptyHeader(
                      {
                        children: [
                          emptyMedia(
                            {
                              variant: 'icon',
                              children: [spinner({ isDecorative: true }, h)],
                            },
                            h,
                          ),
                          emptyTitle(
                            { children: ['Syncing your accounts'] },
                            h,
                          ),
                          emptyDescription(
                            {
                              children: [
                                "We're pulling in your latest transactions. This usually takes a few seconds.",
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
                        children: [
                          button(
                            { variant: 'outline', children: ['Cancel'] },
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
        ),
      ],
    },
    h,
  )

// Card summary: stateful? no. Submodels wired: none. PORT NOTEs: none.
