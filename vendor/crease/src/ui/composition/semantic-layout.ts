import type { Html, HtmlBuilder } from 'foldkit/html'

import { box } from './box'
import { grid } from './grid'
import { inline } from './inline'
import { stack } from './stack'
import { text } from './text'
import type {
  PrimitiveChildren,
  PrimitiveData,
  SpaceToken,
} from '@/stylex/composition/types'

export type Density = 'compact' | 'balanced' | 'spacious'
export type ContentWidth = 'fill' | 'readable' | 'form'
export type NarrowRegionBehavior = 'remain' | 'stack' | 'hide' | 'overlay'

const densitySpaces: Readonly<Record<Density, SpaceToken>> = {
  balanced: 'md',
  compact: 'sm',
  spacious: 'lg',
}

const densitySpace = (density: Density | undefined): SpaceToken =>
  densitySpaces[density ?? 'balanced']

export type AppShellProps = Readonly<{
  auxiliary?: Html | undefined
  children: PrimitiveChildren
  data?: PrimitiveData | undefined
  navigation?: Html | undefined
  navigationWidth?: 'standard' | 'wide' | undefined
  narrowAuxiliary?: NarrowRegionBehavior | undefined
}>

export const appShell = <Message>(
  props: AppShellProps,
  h: HtmlBuilder<Message>,
): Html => {
  const primary =
    props.navigation === undefined
      ? props.children
      : [
          box(
            { as: 'nav', children: [props.navigation], visibility: 'desktop' },
            h,
          ),
          ...props.children,
        ]
  const framed =
    props.navigation === undefined
      ? primary
      : [
          grid(
            {
              children: primary,
              columns:
                props.navigationWidth === 'wide' ? 'appShellWide' : 'appShell',
              width: 'full',
            },
            h,
          ),
        ]
  const withAuxiliary =
    props.auxiliary === undefined
      ? framed
      : [
          grid(
            {
              children: [
                ...framed,
                box(
                  {
                    as: 'aside',
                    children: [props.auxiliary],
                    visibility:
                      props.narrowAuxiliary === 'remain' ||
                      props.narrowAuxiliary === 'stack'
                        ? 'always'
                        : 'desktop',
                  },
                  h,
                ),
              ],
              columns: 'masterDetail',
              width: 'full',
            },
            h,
          ),
        ]

  return box(
    {
      as: 'main',
      children: withAuxiliary,
      ...(props.data === undefined ? {} : { data: props.data }),
      minHeight: 'createPage',
      surface: 'page',
      width: 'full',
    },
    h,
  )
}

export type PageRegionProps = Readonly<{
  children: PrimitiveChildren
  density?: Density | undefined
}>

export const pageHeader = <Message>(
  props: PageRegionProps,
  h: HtmlBuilder<Message>,
): Html =>
  box(
    {
      as: 'header',
      children: props.children,
      padding: densitySpace(props.density),
    },
    h,
  )

export const pageContent = <Message>(
  props: PageRegionProps & Readonly<{ width?: ContentWidth | undefined }>,
  h: HtmlBuilder<Message>,
): Html => {
  const content = stack(
    {
      children: props.children,
      gap: densitySpace(props.density),
      width: 'full',
    },
    h,
  )
  if (props.width === 'form')
    return box({ children: [content], width: 'form' }, h)
  if (props.width === 'readable')
    return box({ children: [content], width: 'readable' }, h)
  return content
}

export const pageFooter = <Message>(
  props: PageRegionProps,
  h: HtmlBuilder<Message>,
): Html =>
  box(
    {
      as: 'footer',
      children: props.children,
      padding: densitySpace(props.density),
    },
    h,
  )

export type PageLayoutProps = Readonly<{
  content: PrimitiveChildren
  contentWidth?: ContentWidth | undefined
  data?: PrimitiveData | undefined
  density?: Density | undefined
  footer?: PrimitiveChildren | undefined
  header?: PrimitiveChildren | undefined
}>

export const pageLayout = <Message>(
  props: PageLayoutProps,
  h: HtmlBuilder<Message>,
): Html =>
  stack(
    {
      children: [
        ...(props.header === undefined
          ? []
          : [
              pageHeader({ children: props.header, density: props.density }, h),
            ]),
        box(
          {
            children: [
              pageContent(
                {
                  children: props.content,
                  density: props.density,
                  width: props.contentWidth,
                },
                h,
              ),
            ],
            padding: densitySpace(props.density),
          },
          h,
        ),
        ...(props.footer === undefined
          ? []
          : [
              pageFooter({ children: props.footer, density: props.density }, h),
            ]),
      ],
      ...(props.data === undefined ? {} : { data: props.data }),
      gap: 'none',
      width: 'full',
    },
    h,
  )

export type SectionProps = Readonly<{
  actions?: PrimitiveChildren | undefined
  children: PrimitiveChildren
  data?: PrimitiveData | undefined
  density?: Density | undefined
  description?: string | undefined
  heading?: string | undefined
  surface?: 'plain' | 'card' | undefined
}>

export const section = <Message>(
  props: SectionProps,
  h: HtmlBuilder<Message>,
): Html => {
  const heading =
    props.heading === undefined
      ? []
      : [
          inline(
            {
              align: 'center',
              children: [
                stack(
                  {
                    children: [
                      text(
                        {
                          as: 'h2',
                          children: [props.heading],
                          variant: 'headingSm',
                        },
                        h,
                      ),
                      ...(props.description === undefined
                        ? []
                        : [
                            text(
                              {
                                as: 'p',
                                children: [props.description],
                                tone: 'secondary',
                                variant: 'caption',
                              },
                              h,
                            ),
                          ]),
                    ],
                    gap: 'xs',
                  },
                  h,
                ),
                ...(props.actions ?? []),
              ],
              justify: 'between',
              width: 'full',
              wrap: true,
            },
            h,
          ),
        ]
  return box(
    {
      as: 'section',
      children: [
        stack(
          {
            children: [...heading, ...props.children],
            gap: densitySpace(props.density),
          },
          h,
        ),
      ],
      ...(props.data === undefined ? {} : { data: props.data }),
      padding: densitySpace(props.density),
      radius: props.surface === 'card' ? 'lg' : 'none',
      surface: props.surface === 'card' ? 'card' : 'none',
    },
    h,
  )
}

export type ToolbarProps = Readonly<{
  children: PrimitiveChildren
  density?: Density | undefined
  label: string
}>

export const toolbar = <Message>(
  props: ToolbarProps,
  h: HtmlBuilder<Message>,
): Html =>
  inline(
    {
      as: 'div',
      align: 'center',
      children: props.children,
      data: { region: 'toolbar', label: props.label },
      gap: densitySpace(props.density),
      justify: 'between',
      width: 'full',
      wrap: true,
    },
    h,
  )

export type FormLayoutProps = Readonly<{
  actions?: PrimitiveChildren | undefined
  children: PrimitiveChildren
  density?: Density | undefined
}>

export const formLayout = <Message>(
  props: FormLayoutProps,
  h: HtmlBuilder<Message>,
): Html =>
  box(
    {
      children: [
        stack(
          {
            children: [
              ...props.children,
              ...(props.actions === undefined
                ? []
                : [
                    inline(
                      {
                        align: 'center',
                        children: props.actions,
                        gap: 'sm',
                        justify: 'end',
                        width: 'full',
                        wrap: true,
                      },
                      h,
                    ),
                  ]),
            ],
            gap: densitySpace(props.density),
            width: 'full',
          },
          h,
        ),
      ],
      width: 'form',
    },
    h,
  )

export type MetricGridProps = Readonly<{
  children: PrimitiveChildren
  density?: Density | undefined
}>

export const metricGrid = <Message>(
  props: MetricGridProps,
  h: HtmlBuilder<Message>,
): Html =>
  grid(
    {
      children: props.children,
      columns: 'four',
      gap: densitySpace(props.density),
      width: 'full',
    },
    h,
  )

export type TableRegionProps = Readonly<{
  actions?: PrimitiveChildren | undefined
  children: PrimitiveChildren
  density?: Density | undefined
  description?: string | undefined
  footer?: PrimitiveChildren | undefined
  heading: string
  toolbar?: PrimitiveChildren | undefined
}>

export const tableRegion = <Message>(
  props: TableRegionProps,
  h: HtmlBuilder<Message>,
): Html =>
  box(
    {
      as: 'section',
      children: [
        box(
          {
            children: [
              inline(
                {
                  align: 'center',
                  children: [
                    stack(
                      {
                        children: [
                          text(
                            {
                              as: 'h2',
                              children: [props.heading],
                              variant: 'headingSm',
                            },
                            h,
                          ),
                          ...(props.description === undefined
                            ? []
                            : [
                                text(
                                  {
                                    as: 'p',
                                    children: [props.description],
                                    tone: 'secondary',
                                    variant: 'caption',
                                  },
                                  h,
                                ),
                              ]),
                        ],
                        gap: 'xs',
                      },
                      h,
                    ),
                    ...(props.actions ?? []),
                  ],
                  justify: 'between',
                  width: 'full',
                  wrap: true,
                },
                h,
              ),
            ],
            padding: densitySpace(props.density),
          },
          h,
        ),
        ...(props.toolbar === undefined
          ? []
          : [
              box(
                {
                  children: props.toolbar,
                  padding: densitySpace(props.density),
                },
                h,
              ),
            ]),
        box({ children: props.children, overflowX: 'auto', width: 'full' }, h),
        ...(props.footer === undefined
          ? []
          : [
              box(
                {
                  children: props.footer,
                  padding: densitySpace(props.density),
                },
                h,
              ),
            ]),
      ],
      data: { region: 'table' },
      radius: 'lg',
      surface: 'card',
    },
    h,
  )
