import type { Html, HtmlBuilder } from 'foldkit/html'

import { CHART_SECTIONS, type ChartSection, chartsPath } from '@/route'

import { cn } from '@/lib/utils'

/* Shared chrome for the /charts/<section> pages, mirroring ui.shadcn.com/charts:
   hero heading + lead, pill subnav across the sections, then the section's grid
   of chart cards. Links are plain anchors — foldkit's onUrlRequest intercepts
   internal navigation. */

const SECTION_LABELS: Readonly<Record<ChartSection, string>> = {
  area: 'Area Charts',
  bar: 'Bar Charts',
  line: 'Line Charts',
  pie: 'Pie Charts',
  radar: 'Radar Charts',
  radial: 'Radial Charts',
  tooltip: 'Tooltip',
}

export const chartsPageShell = <Msg>(
  activeSection: ChartSection,
  cards: ReadonlyArray<Html>,
  h: HtmlBuilder<Msg>,
): Html => {
  return h.div(
    [
      h.Class(
        'mx-auto flex w-full max-w-[1400px] flex-col gap-8 px-4 py-8 md:px-8',
      ),
    ],
    [
      h.div(
        [h.Class('flex flex-col items-start gap-4')],
        [
          h.h1(
            [
              h.Class(
                'leading-tighter max-w-3xl text-3xl font-semibold tracking-tight text-balance text-primary lg:leading-[1.1] lg:font-semibold xl:text-5xl xl:tracking-tighter',
              ),
            ],
            ['Beautiful Charts & Graphs'],
          ),
          h.p(
            [
              h.Class(
                'max-w-4xl text-base text-balance text-foreground sm:text-lg',
              ),
            ],
            [
              'A collection of ready-to-use chart components built with Apache ECharts and foldkit, styled with CreaseUI. From basic charts to rich data displays.',
            ],
          ),
        ],
      ),
      h.div(
        [h.Class('flex flex-wrap items-center gap-1 border-b pb-2')],
        CHART_SECTIONS.map(section =>
          h.a(
            [
              h.Href(chartsPath(section)),
              h.Class(
                cn(
                  'flex h-7 shrink-0 items-center justify-center rounded-full px-4 text-center text-base font-medium whitespace-nowrap transition-colors',
                  section === activeSection
                    ? 'bg-muted text-primary'
                    : 'text-muted-foreground hover:text-primary',
                ),
              ),
            ],
            [SECTION_LABELS[section]],
          ),
        ),
      ),
      h.div(
        [
          h.Class(
            'grid flex-1 scroll-mt-20 items-start gap-10 md:grid-cols-2 md:gap-6 lg:grid-cols-3 xl:gap-10',
          ),
        ],
        [...cards],
      ),
    ],
  )
}
