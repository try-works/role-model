import { tourSkin } from '@/site/landing-tour-skin'
import type { Update } from 'foldkit'
import { Match as M, Schema as S } from 'effect'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'
import { modifyFields } from 'foldkit/struct'
import { defineView } from 'foldkit/submodel'

import * as Chart from '@/lib/echarts'
import { heroChart } from '@/site/landing-ui'
import * as Tour from '@/site/landing-tour'
import { SHOWCASE_CARD_COUNT } from '@/lib/project-facts'
import { componentDocsPath, createPath } from '@/route'
import { landingSkin } from '@/site/landing-skin'
import { badge } from '@/site/landing-ui'
import { button, buttonLink } from '@/site/landing-ui'
import {
  card,
  cardContent,
  cardDescription,
  cardFooter,
  cardHeader,
  cardTitle,
} from '@/site/landing-ui'
import { input } from '@/site/landing-ui'
import { kbd } from '@/site/landing-ui'

/* Both site renderers share this landing page and its interactive tour. */

// MODEL

export const Model = S.Struct({
  comparePercent: S.Number,
  tour: Tour.Model,
})
export type Model = typeof Model.Type

// MESSAGE

export const Message = defineMessageUnion({
  DraggedCompare: { value: S.Number },
  ChangedDemoEmail: {},
  GotChartMessage: {
    message: Chart.ChartMessage,
  },
  GotTourMessage: { message: Tour.Message },
})
export type Message = typeof Message.Type

// INIT

export const init = (): Model => ({ comparePercent: 50, tour: Tour.init() })

// UPDATE

type UpdateReturn = Update.Return<Model, Message>

export const update = (model: Model, message: Message): UpdateReturn =>
  M.value(message).pipe(
    M.withReturnType<UpdateReturn>(),
    M.tagsExhaustive({
      DraggedCompare: ({ value }) => ({
        model: modifyFields(model, { comparePercent: () => value }),
      }),
      ChangedDemoEmail: () => ({ model: model }),
      GotChartMessage: () => ({ model: model }),
      GotTourMessage: ({ message }) => {
        const next = Tour.update(model.tour, message)
        return {
          model: { ...model, tour: next.model },
          commands: Command.mapMessages(next.commands ?? [], message =>
            Message.GotTourMessage({ message }),
          ),
        }
      },
    }),
  )

// HERO CHART — standalone ECharts card in the collage

const HERO_CHART_ID = 'landing-hero-chart'
const HERO_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
const HERO_DATA = [186, 305, 237, 173, 209, 274]

Chart.registerChart(HERO_CHART_ID, theme => ({
  grid: Chart.compactGrid({ bottom: 4, top: 8 }),
  xAxis: { ...Chart.categoryAxis(theme, HERO_MONTHS), show: false },
  yAxis: { ...Chart.valueAxis(theme), show: false },
  tooltip: Chart.shadcnTooltip(theme),
  series: [
    {
      name: 'Revenue',
      type: 'line',
      smooth: 0.4,
      showSymbol: false,
      lineStyle: { width: 2, color: theme.chart1 },
      itemStyle: { color: theme.chart1 },
      areaStyle: { color: Chart.areaGradient(theme.chart1) },
      data: [...HERO_DATA],
    },
  ],
}))

// VIEW HELPERS

const toChart = (message: Chart.ChartMessage): Message =>
  Message.GotChartMessage({ message })

const sectionHeading = (
  title: string,
  copy: string,
  h: HtmlBuilder<Message>,
): Html => {
  return h.div(
    [h.Class(landingSkin.sectionHeading)],
    [
      h.h2([h.Class(landingSkin.sectionTitle)], [title]),
      h.p([h.Class(landingSkin.sectionCopy)], [copy]),
    ],
  )
}

const heroCollage = (h: HtmlBuilder<Message>): Html => {
  return h.div(
    [h.Class(landingSkin.collage)],
    [
      card(
        {
          children: [
            cardHeader(
              {
                children: [
                  cardTitle({ children: ['Revenue'] }, h),
                  cardDescription(
                    { children: ['+18.2% from last quarter'] },
                    h,
                  ),
                ],
              },
              h,
            ),
            cardContent(
              {
                children: [
                  heroChart(
                    {
                      hostId: HERO_CHART_ID,
                      ariaLabel: 'Revenue trend for the last 6 months',
                      toMessage: toChart,
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
      h.div(
        [h.Class(landingSkin.collageRow)],
        [
          card(
            {
              children: [
                cardHeader(
                  {
                    children: [
                      cardTitle({ children: ['Create account'] }, h),
                      cardDescription(
                        {
                          children: ['Same card. Different framework.'],
                        },
                        h,
                      ),
                    ],
                  },
                  h,
                ),
                cardContent(
                  {
                    children: [
                      input(
                        {
                          id: 'landing-demo-email',
                          value: '',
                          onInput: () => Message.ChangedDemoEmail(),
                          label: 'Email',
                          placeholder: 'm@example.com',
                        },
                        h,
                      ),
                    ],
                  },
                  h,
                ),
                cardFooter(
                  {
                    children: [
                      h.div(
                        [h.Class(landingSkin.actions)],
                        [
                          button(
                            { variant: 'outline', children: ['Cancel'] },
                            h,
                          ),
                          button({ children: ['Continue'] }, h),
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
          h.div(
            [h.Class(landingSkin.badges)],
            [
              badge({ children: ['New'] }, h),
              badge({ variant: 'secondary', children: ['Beta'] }, h),
              badge({ variant: 'outline', children: ['MIT'] }, h),
              badge(
                {
                  variant: 'destructive',
                  children: [
                    h.span([h.Class(tourSkin.deprecatedInk)], ['Deprecated']),
                  ],
                },
                h,
              ),
              h.div(
                [h.Class(landingSkin.keyHints)],
                [kbd({ children: ['⌘'] }, h), kbd({ children: ['B'] }, h)],
              ),
            ],
          ),
        ],
      ),
    ],
  )
}

const hero = (h: HtmlBuilder<Message>): Html => {
  return h.section(
    [h.Class(landingSkin.hero)],
    [
      h.div(
        [h.Class(landingSkin.heroCopy)],
        [
          h.div(
            [h.Class(landingSkin.brandRow)],
            [
              h.img([
                h.Src('/favicon.svg'),
                h.Alt('Crease'),
                h.Class(landingSkin.logo),
              ]),
              h.span(
                [h.Class(landingSkin.brand)],
                ['crease', h.span([h.Class(landingSkin.accent)], ['/']), 'ui'],
              ),
            ],
          ),
          h.h1(
            [h.Class(landingSkin.heroTitle)],
            ['Beautiful components for foldkit.'],
          ),
          h.p(
            [h.Class(landingSkin.heroDescription)],
            [
              'The shadcn/ui design language, rebuilt on foldkit UI. Copy the code, own the code, ship.',
            ],
          ),
          h.div(
            [h.Class(landingSkin.actions)],
            [
              buttonLink({ href: createPath(), children: ['Get Started'] }, h),
              buttonLink(
                {
                  href: componentDocsPath('accordion'),
                  variant: 'outline',
                  children: ['Browse Components'],
                },
                h,
              ),
            ],
          ),
          h.p(
            [h.Class(landingSkin.license)],
            [
              'MIT licensed · Built on foldkit UI · Works with any shadcn theme',
            ],
          ),
        ],
      ),
      heroCollage(h),
    ],
  )
}

const comparisonSlider = (model: Model, h: HtmlBuilder<Message>): Html => {
  const percent = Math.min(100, Math.max(0, model.comparePercent))

  return h.section(
    [h.Class(landingSkin.section)],
    [
      sectionHeading(
        'Spot the difference.',
        `We rebuilt the ui.shadcn.com/create preview board — all ${String(SHOWCASE_CARD_COUNT)} cards — on Foldkit. Drag to compare the two implementations.`,
        h,
      ),
      h.div(
        [h.Class(landingSkin.comparison)],
        [
          h.img([
            h.Src('/comparison/shadcn-board.png'),
            h.Alt('The original shadcn/ui create board'),
            h.Class(landingSkin.image),
          ]),
          h.div(
            [
              h.Class(landingSkin.overlay),
              h.Style({
                'clip-path': `inset(0 ${100 - percent}% 0 0)`,
              }),
            ],
            [
              h.img([
                h.Src('/comparison/foldkit-board.png'),
                h.Alt('The same board rebuilt with crease/ui on foldkit'),
                h.Class(landingSkin.image),
              ]),
            ],
          ),
          h.div(
            [h.Class(landingSkin.divider), h.Style({ left: `${percent}%` })],
            [],
          ),
          h.span([h.Class(landingSkin.leftLabel)], ['crease/ui (foldkit)']),
          h.span([h.Class(landingSkin.rightLabel)], ['shadcn/ui (React)']),
          h.input([
            h.Type('range'),
            h.Min('0'),
            h.Max('100'),
            h.Value(String(percent)),
            h.OnInput(value =>
              Message.DraggedCompare({ value: Number(value) || 0 }),
            ),
            h.AriaLabel('Comparison slider between crease/ui and shadcn/ui'),
            h.Class(landingSkin.range),
          ]),
        ],
      ),
    ],
  )
}

const faq = (h: HtmlBuilder<Message>): Html => {
  const questions = [
    [
      'Do I need React?',
      'Crease UI is built for Foldkit. Its components use Foldkit models, messages, and view functions.',
    ],
    [
      'Can I use my shadcn theme?',
      'Yes. Crease uses the same CSS token contract, including --background, --primary, and --radius.',
    ],
    [
      'Where does accessibility come from?',
      'Foldkit UI provides the headless behavior, keyboard navigation, focus management, and ARIA attributes. Crease adds the styling.',
    ],
    [
      'Is it free to use?',
      'The components and registry source are MIT licensed. Crease UI is an independent project, with credit to shadcn/ui.',
    ],
  ] as const
  return h.section(
    [h.Class(tourSkin.faq)],
    [
      h.div(
        [h.Class(tourSkin.faqIntro)],
        [
          h.h2([h.Class(tourSkin.faqTitle)], ['A few practical things.']),
          h.p(
            [h.Class(tourSkin.faqCopy)],
            ['The details before you get started.'],
          ),
        ],
      ),
      h.div(
        [],
        questions.map(([question, answer]) =>
          h.details(
            [h.Class(tourSkin.faqItem)],
            [
              h.summary(
                [h.Class(tourSkin.faqSummary)],
                [
                  question,
                  h.span(
                    [h.AriaHidden(true), h.Class(tourSkin.faqIcon)],
                    ['+'],
                  ),
                ],
              ),
              h.p([h.Class(tourSkin.faqAnswer)], [answer]),
            ],
          ),
        ),
      ),
    ],
  )
}

const footer = (h: HtmlBuilder<Message>): Html => {
  const buildSha =
    typeof __CREASEUI_BUILD_SHA__ === 'undefined'
      ? 'development'
      : __CREASEUI_BUILD_SHA__
  const isBuildDirty =
    typeof __CREASEUI_BUILD_DIRTY__ === 'undefined'
      ? true
      : __CREASEUI_BUILD_DIRTY__
  const shortRevision = buildSha.slice(0, 7)
  const revisionLabel = `${shortRevision}${isBuildDirty ? '+dirty' : ''}`

  return h.footer(
    [h.Class(landingSkin.footer)],
    [
      h.div(
        [h.Class(landingSkin.footerInner)],
        [
          h.span([], ['crease/ui — the visible layer.']),
          h.div(
            [h.Class(landingSkin.footerLinks)],
            [
              h.a(
                [
                  h.Href('https://foldkit.dev'),
                  h.Class(landingSkin.footerLink),
                ],
                ['foldkit.dev'],
              ),
              h.span([], ['MIT']),
              ...(shortRevision.length > 0
                ? [
                    h.a(
                      [
                        h.Href(
                          `https://github.com/Potti1234/creaseui/commit/${buildSha}`,
                        ),
                        h.Class(landingSkin.revision),
                        h.AriaLabel(`Source revision ${revisionLabel}`),
                      ],
                      [`source ${revisionLabel}`],
                    ),
                  ]
                : []),
              h.span(
                [],
                [
                  'Credits: shadcn/ui · Astryx · Foldkit UI · Apache ECharts · Lucide · Hugeicons · Tabler · Phosphor · Remix Icon',
                ],
              ),
            ],
          ),
        ],
      ),
    ],
  )
}

// VIEW

const tourView = defineView<Tour.Model, Tour.Message, boolean>(
  (model, isDark, h) => Tour.view(model, h, isDark),
)

export const view = (
  model: Model,
  h: HtmlBuilder<Message>,
  isDark = false,
): Html => {
  return h.div(
    [],
    [
      hero(h),
      comparisonSlider(model, h),
      h.submodel({
        slotId: 'landing-tour',
        model: model.tour,
        view: tourView,
        viewInputs: isDark,
        toParentMessage: message => Message.GotTourMessage({ message }),
      }),
      faq(h),
      footer(h),
    ],
  )
}
