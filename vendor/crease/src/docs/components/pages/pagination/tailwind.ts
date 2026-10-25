import { Option, Schema as S } from 'effect'
import { Command } from 'foldkit'
import type { Html, HtmlBuilder } from 'foldkit/html'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import { paginationFixtures } from '@/docs/components/pages/pagination/shared'
import * as Field from '@/ui/field'
import * as Pagination from '@/ui/pagination'
import * as Select from '@/ui/select'

const rowsItems = [
  { value: '10', label: '10' },
  { value: '25', label: '25' },
  { value: '50', label: '50' },
  { value: '100', label: '100' },
] as const

const RowsSelect = Select.create<string>()

const PreviewMessage = defineMessageUnion({
  ChangedPaginationPage: { page: S.Number },
  GotRowsSelectMessage: { message: Select.Message },
})
type PreviewMessage = typeof PreviewMessage.Type
const PreviewModel = S.Struct({
  _docsPage: S.Literal('pagination'),
  page: S.Number,
  select: Select.Model,
  rowsPerPage: S.Option(S.String),
})
type PreviewModel = typeof PreviewModel.Type

const numberedItems = <Msg>(
  pages: ReadonlyArray<number>,
  activePage: number,
  h: HtmlBuilder<Msg>,
): ReadonlyArray<Html> =>
  pages.map(page =>
    Pagination.paginationItem(
      {
        children: [
          Pagination.paginationLink(
            {
              href: '#',
              ...(page === activePage ? { isActive: true } : {}),
              children: [String(page)],
            },
            h,
          ),
        ],
      },
      h,
    ),
  )

const simpleView = <Msg>(h: HtmlBuilder<Msg>): Html =>
  Pagination.pagination(
    {
      ariaLabel: 'Pagination',
      children: [
        Pagination.paginationContent(
          { children: [...numberedItems([1, 2, 3, 4, 5], 2, h)] },
          h,
        ),
      ],
    },
    h,
  )

const rtlView = <Msg>(h: HtmlBuilder<Msg>): Html =>
  Pagination.pagination(
    {
      ariaLabel: 'Pagination',
      direction: 'rtl',
      children: [
        Pagination.paginationContent(
          {
            children: [
              Pagination.paginationItem(
                {
                  children: [
                    Pagination.paginationPrevious(
                      { href: '#', direction: 'rtl', label: 'السابق' },
                      h,
                    ),
                  ],
                },
                h,
              ),
              ...numberedItems([1, 2, 3], 2, h),
              Pagination.paginationItem(
                { children: [Pagination.paginationEllipsis({}, h)] },
                h,
              ),
              Pagination.paginationItem(
                {
                  children: [
                    Pagination.paginationNext(
                      { href: '#', direction: 'rtl', label: 'التالي' },
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

const iconsOnlyView = (
  model: PreviewModel,
  h: HtmlBuilder<PreviewMessage>,
): Html =>
  h.div(
    [h.Class('flex items-center justify-between gap-4')],
    [
      Field.field(
        {
          orientation: 'horizontal',
          class: 'w-fit',
          children: [
            Field.fieldLabel(
              { for: 'select-rows-per-page', children: ['Rows per page'] },
              h,
            ),
            RowsSelect.select(
              {
                model: model.select,
                maybeSelectedValue: model.rowsPerPage,
                toParentMessage: message =>
                  PreviewMessage.GotRowsSelectMessage({ message }),
                ariaLabel: 'Rows per page',
                items: rowsItems,
                itemToValue: item => item.value,
                itemToLabel: item => item.label,
                triggerClass: 'w-20',
              },
              h,
            ),
          ],
        },
        h,
      ),
      Pagination.pagination(
        {
          ariaLabel: 'Pagination',
          class: 'mx-0 w-auto',
          children: [
            Pagination.paginationContent(
              {
                children: [
                  Pagination.paginationItem(
                    {
                      children: [
                        Pagination.paginationPrevious({ href: '#' }, h),
                      ],
                    },
                    h,
                  ),
                  Pagination.paginationItem(
                    {
                      children: [Pagination.paginationNext({ href: '#' }, h)],
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

const render = (
  index: number,
  model: PreviewModel,
  h: HtmlBuilder<PreviewMessage>,
): Html => {
  const fixture = paginationFixtures[index] ?? paginationFixtures[0]
  switch (fixture.kind) {
    case 'action':
      return Pagination.paginationPages(
        {
          page: model.page,
          totalPages: 5,
          navigation: {
            kind: 'action',
            onNavigate: page => PreviewMessage.ChangedPaginationPage({ page }),
          },
          ariaLabel: 'Search result pages',
        },
        h,
      )
    case 'link':
      return Pagination.paginationPages(
        {
          page: model.page,
          totalPages: 12,
          siblingCount: fixture.siblingCount,
          boundaryCount: 1,
          navigation: { kind: 'link', href: () => '#' },
          ariaLabel: 'Invoice pages',
        },
        h,
      )
    case 'simple':
      return simpleView(h)
    case 'icons':
      return iconsOnlyView(model, h)
    case 'rtl':
      return rtlView(h)
  }
}

export const paginationTailwindPreviewProgram = definePreviewProgram<
  PreviewModel,
  PreviewMessage
>({
  Model: PreviewModel,
  Message: PreviewMessage,
  init: index => {
    const fixture = paginationFixtures[index] ?? paginationFixtures[0]
    return {
      _docsPage: 'pagination',
      page: 'page' in fixture ? fixture.page : 2,
      select: Select.init({ id: `select-rows-per-page-${String(index)}` }),
      rowsPerPage: Option.some('25'),
    }
  },
  update: (model, message) => {
    switch (message._tag) {
      case 'ChangedPaginationPage':
        return { model: { ...model, page: message.page } }
      case 'GotRowsSelectMessage': {
        const next = RowsSelect.update(model.select, message.message)
        const commands = next.commands ?? []
        return {
          model: {
            ...model,
            select: next.model,
            rowsPerPage: Option.match(Option.fromNullishOr(next.outMessage), {
              onNone: () => model.rowsPerPage,
              onSome: selection =>
                selection._tag === 'Selected'
                  ? Option.some(selection.value)
                  : Option.none(),
            }),
          },
          commands: Command.mapMessages(commands, next =>
            PreviewMessage.GotRowsSelectMessage({ message: next }),
          ),
        }
      }
    }
  },
  view: (index, model, h) => render(index, model, h),
})
