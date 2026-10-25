import type { Html, HtmlBuilder } from 'foldkit/html'

import {
  scrollAreaFixtures,
  scrollAreaItems,
  scrollAreaTags,
} from '@/docs/components/pages/scroll-area/shared'
import * as ScrollArea from '@/ui/scroll-area'
import * as Separator from '@/ui/separator'

export type ScrollAreaStaticPreview = <Msg>(
  model: Readonly<Record<string, never>>,
  h: HtmlBuilder<Msg>,
) => Html

const tagsView = <Msg>(
  heading: string,
  rtl: boolean,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [h.Class('h-72 w-48 rounded-md border overflow-hidden')],
    [
      ScrollArea.scrollArea(
        {
          orientation: 'vertical',
          ...(rtl ? { direction: 'rtl' as const } : {}),
          ariaLabel: 'Version tags',
          class: 'size-full',
          children: [
            h.div(
              [h.Class('p-4')],
              [
                h.h4(
                  [h.Class('mb-4 text-sm font-medium leading-none')],
                  [heading],
                ),
                ...scrollAreaTags.map(tag =>
                  h.div(
                    [],
                    [
                      h.div([h.Class('text-sm')], [tag]),
                      Separator.separator({ class: 'my-2' }, h),
                    ],
                  ),
                ),
              ],
            ),
          ],
        },
        h,
      ),
    ],
  )

export const scrollAreaTailwindPreviews: ReadonlyArray<ScrollAreaStaticPreview> =
  scrollAreaFixtures.map(
    fixture =>
      <Msg>(_model: Readonly<Record<string, never>>, h: HtmlBuilder<Msg>) =>
        fixture.kind === 'tags'
          ? tagsView(fixture.heading, fixture.rtl, h)
          : h.div(
              [h.Class('w-80 rounded-md border p-4 overflow-hidden')],
              [
                ScrollArea.scrollArea(
                  {
                    orientation: 'horizontal',
                    ariaLabel: 'Component versions',
                    class: 'w-full',
                    children: [
                      h.div(
                        [h.Class('flex w-max gap-3')],
                        scrollAreaItems.map(item =>
                          h.span(
                            [h.Class('rounded-md bg-muted px-3 py-2 text-sm')],
                            [item],
                          ),
                        ),
                      ),
                    ],
                  },
                  h,
                ),
              ],
            ),
  )
