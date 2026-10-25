import type { Html, HtmlBuilder } from 'foldkit/html'

import { icon } from '@/ui/composition/icon'

const navLogo = <Msg>(h: HtmlBuilder<Msg>): Html =>
  h.a(
    [h.Href('#'), h.Class('flex items-center gap-2')],
    [
      h.span(
        [
          h.Class(
            'flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground',
          ),
        ],
        [icon({ name: 'box' }, h)],
      ),
      h.span([h.Class('text-sm font-semibold')], ['Acme Inc']),
    ],
  )

const topNavItem = <Msg>(
  label: string,
  selected: boolean,
  h: HtmlBuilder<Msg>,
): Html =>
  h.a(
    [
      h.Href('#'),
      h.Class(
        `rounded-md px-2 py-1 text-sm${
          selected ? ' font-medium' : ' text-muted-foreground'
        }`,
      ),
    ],
    [label],
  )

const topNav = <Msg>(h: HtmlBuilder<Msg>): Html =>
  h.nav(
    [
      h.AriaLabel('Main navigation'),
      h.Class('flex h-12 items-center gap-4 px-4'),
    ],
    [
      navLogo(h),
      h.div(
        [h.Class('flex items-center gap-1')],
        [
          topNavItem('Home', true, h),
          topNavItem('Products', false, h),
          topNavItem('Docs', false, h),
        ],
      ),
    ],
  )

const sideNavItem = <Msg>(
  label: string,
  iconName: string,
  selected: boolean,
  h: HtmlBuilder<Msg>,
): Html =>
  h.a(
    [
      h.Href('#'),
      h.Class(
        `flex h-6 items-center gap-2 rounded-md px-2 text-sm${
          selected ? ' bg-accent font-medium' : ' text-muted-foreground'
        }`,
      ),
    ],
    [icon({ name: iconName }, h), label],
  )

const sideNav = <Msg>(h: HtmlBuilder<Msg>): Html => {
  const sections: ReadonlyArray<{
    title?: string
    items: ReadonlyArray<Html>
  }> = [
    {
      items: [
        sideNavItem('Dashboard', 'house', true, h),
        sideNavItem('Analytics', 'chart-column', false, h),
        sideNavItem('Projects', 'folder', false, h),
      ],
    },
    {
      title: 'Organization',
      items: [
        sideNavItem('Team', 'users', false, h),
        sideNavItem('Settings', 'settings', false, h),
      ],
    },
  ]
  return h.aside(
    [h.Class('flex shrink-0 flex-col overflow-auto')],
    [
      h.nav(
        [h.Class('flex h-full w-[260px] flex-col gap-1 p-2')],
        sections.map(section =>
          h.div(
            [h.Class('flex flex-col gap-0.5')],
            [
              ...(section.title === undefined
                ? []
                : [
                    h.div(
                      [
                        h.Class(
                          'px-2 pb-1 text-xs font-medium text-muted-foreground',
                        ),
                      ],
                      [section.title],
                    ),
                  ]),
              ...section.items,
            ],
          ),
        ),
      ),
    ],
  )
}

const pageContent = <Msg>(h: HtmlBuilder<Msg>): Html =>
  h.div(
    [h.Class('flex flex-1 flex-col gap-4')],
    [
      h.div(
        [h.Class('grid auto-rows-min gap-4 md:grid-cols-3')],
        Array.from({ length: 3 }, () =>
          h.div([h.Class('aspect-video rounded-xl bg-muted/50')], []),
        ),
      ),
      h.div(
        [h.Class('min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min')],
        [],
      ),
    ],
  )

export const appShell = <Msg>(h: HtmlBuilder<Msg>): Html =>
  h.div(
    [h.Class('flex h-dvh flex-col overflow-clip bg-background')],
    [
      h.a(
        [
          h.Href('#app-shell-01-main'),
          h.Class(
            'absolute -m-px h-px w-px overflow-hidden border-0 p-0 whitespace-nowrap [clip-path:inset(50%)] focus:fixed focus:top-2 focus:start-2 focus:z-[9999] focus:m-0 focus:h-auto focus:w-auto focus:overflow-visible focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary focus:no-underline focus:whitespace-normal focus:[clip-path:none]',
          ),
        ],
        ['Skip to content'],
      ),
      h.header([], [topNav(h)]),
      h.div(
        [h.Class('flex min-h-0 flex-1')],
        [
          sideNav(h),
          h.div(
            [h.Class('relative flex h-full min-h-0 flex-1')],
            [
              h.div(
                [
                  h.Class(
                    'pointer-events-none absolute inset-0 rounded-ss-[28px] bg-card',
                  ),
                ],
                [],
              ),
              h.main(
                [
                  h.Id('app-shell-01-main'),
                  h.Tabindex(-1),
                  h.Class(
                    'isolate min-h-0 min-w-0 flex-1 overflow-auto bg-transparent p-6 outline-none',
                  ),
                ],
                [pageContent(h)],
              ),
            ],
          ),
        ],
      ),
    ],
  )
