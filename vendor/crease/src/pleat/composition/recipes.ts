import type { Html, HtmlBuilder } from 'foldkit/html'

import {
  appShell,
  formLayout,
  pageLayout,
  section,
  tableRegion,
  toolbar,
} from './semantic-layout'
import type {
  Density,
  NarrowRegionBehavior,
  PrimitiveChildren,
} from './types-internal'
import { themeScope } from './theme'
import type { SemanticThemeName } from './theme'

// Re-exported locally to keep recipe APIs independent from implementation files.
export type RecipeDensity = Density

export type DashboardShellProps = Readonly<{
  content: PrimitiveChildren
  density?: RecipeDensity | undefined
  footer?: PrimitiveChildren | undefined
  header: PrimitiveChildren
  navigation: Html
  navigationWidth?: 'standard' | 'wide' | undefined
  theme?: SemanticThemeName | undefined
}>

export const dashboardShell = <Message>(
  props: DashboardShellProps,
  h: HtmlBuilder<Message>,
): Html =>
  themeScope(
    {
      children: [
        appShell(
          {
            children: [
              pageLayout(
                {
                  content: props.content,
                  density: props.density,
                  footer: props.footer,
                  header: props.header,
                },
                h,
              ),
            ],
            data: { recipe: 'dashboard' },
            navigation: props.navigation,
            navigationWidth: props.navigationWidth,
          },
          h,
        ),
      ],
      theme: props.theme,
    },
    h,
  )

export type SettingsPageProps = Readonly<{
  actions?: PrimitiveChildren | undefined
  description?: string | undefined
  fields: PrimitiveChildren
  navigation?: Html | undefined
  title: string
  theme?: SemanticThemeName | undefined
}>

export const settingsPage = <Message>(
  props: SettingsPageProps,
  h: HtmlBuilder<Message>,
): Html => {
  const content = [
    section(
      {
        children: [
          formLayout({ actions: props.actions, children: props.fields }, h),
        ],
        description: props.description,
        heading: props.title,
      },
      h,
    ),
  ]
  const page = pageLayout(
    { content, contentWidth: 'form', data: { recipe: 'settings' } },
    h,
  )
  return themeScope(
    {
      children: [
        props.navigation === undefined
          ? page
          : appShell({ children: [page], navigation: props.navigation }, h),
      ],
      theme: props.theme,
    },
    h,
  )
}

export type MasterDetailPageProps = Readonly<{
  detail: Html
  detailBehavior?: NarrowRegionBehavior | undefined
  header: PrimitiveChildren
  master: PrimitiveChildren
  navigation?: Html | undefined
  theme?: SemanticThemeName | undefined
}>

export const masterDetailPage = <Message>(
  props: MasterDetailPageProps,
  h: HtmlBuilder<Message>,
): Html =>
  themeScope(
    {
      children: [
        appShell(
          {
            auxiliary: props.detail,
            children: [
              pageLayout({ content: props.master, header: props.header }, h),
            ],
            data: { recipe: 'master-detail' },
            narrowAuxiliary: props.detailBehavior ?? 'overlay',
            navigation: props.navigation,
          },
          h,
        ),
      ],
      theme: props.theme,
    },
    h,
  )

export type DataExplorerPageProps = Readonly<{
  actions?: PrimitiveChildren | undefined
  description?: string | undefined
  filters: PrimitiveChildren
  navigation?: Html | undefined
  table: PrimitiveChildren
  title: string
  theme?: SemanticThemeName | undefined
}>

export const dataExplorerPage = <Message>(
  props: DataExplorerPageProps,
  h: HtmlBuilder<Message>,
): Html => {
  const content = [
    tableRegion(
      {
        actions: props.actions,
        children: props.table,
        description: props.description,
        heading: props.title,
        toolbar: [
          toolbar(
            { children: props.filters, label: `${props.title} filters` },
            h,
          ),
        ],
      },
      h,
    ),
  ]
  const page = pageLayout(
    { content, data: { recipe: 'data-explorer' }, density: 'compact' },
    h,
  )
  return themeScope(
    {
      children: [
        props.navigation === undefined
          ? page
          : appShell({ children: [page], navigation: props.navigation }, h),
      ],
      theme: props.theme,
    },
    h,
  )
}

export type CommercePageProps = Readonly<{
  cart?: Html | undefined
  header: PrimitiveChildren
  products: PrimitiveChildren
  theme?: SemanticThemeName | undefined
}>

export const commercePage = <Message>(
  props: CommercePageProps,
  h: HtmlBuilder<Message>,
): Html =>
  themeScope(
    {
      children: [
        appShell(
          {
            auxiliary: props.cart,
            children: [
              pageLayout(
                {
                  content: [
                    section(
                      { children: props.products, density: 'spacious' },
                      h,
                    ),
                  ],
                  density: 'spacious',
                  header: props.header,
                },
                h,
              ),
            ],
            data: { recipe: 'commerce' },
            narrowAuxiliary: 'overlay',
          },
          h,
        ),
      ],
      theme: props.theme,
    },
    h,
  )
