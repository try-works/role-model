import type { Option } from 'effect'
import * as stylex from '@stylexjs/stylex'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import { paginationFixtures } from '@/docs/components/pages/pagination/shared'
import * as Field from '@/stylex/field'
import * as Pagination from '@/stylex/pagination'
import * as Select from '@/stylex/select'
import { className } from '@/stylex/style'

const styles = stylex.create({
  row: {
    gap: '1rem',
    alignItems: 'center',
    display: 'flex',
    justifyContent: 'space-between',
  },
  field: { width: 'fit-content' },
  trigger: { width: '5rem' },
  pagination: { marginInline: 0, width: 'auto' },
})

const rowsItems = [
  { value: '10', label: '10' },
  { value: '25', label: '25' },
  { value: '50', label: '50' },
  { value: '100', label: '100' },
] as const

interface PreviewShape {
  readonly page: number
  readonly select: Select.Model
  readonly rowsPerPage: Option.Option<string>
}

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

const iconsOnlyView = <Msg>(
  model: PreviewShape,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html =>
  h.div(
    [h.Class(className(styles.row))],
    [
      Field.field(
        {
          orientation: 'horizontal',
          layoutStyle: styles.field,
          children: [
            Field.fieldLabel(
              { for: 'select-rows-per-page', children: ['Rows per page'] },
              h,
            ),
            Select.select(
              {
                model: model.select,
                maybeSelectedValue: model.rowsPerPage,
                toParentMessage: message =>
                  onMessageJson(
                    JSON.stringify({
                      _tag: 'GotRowsSelectMessage',
                      message,
                    }),
                  ),
                ariaLabel: 'Rows per page',
                items: rowsItems,
                itemToValue: item => item.value,
                itemToLabel: item => item.label,
                triggerLayoutStyle: styles.trigger,
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
          layoutStyle: styles.pagination,
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

export const paginationStyleXPreview: ExamplePreviewProvider = <Msg>(
  index: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html => {
  const preview = model as PreviewShape
  const fixture = paginationFixtures[index] ?? paginationFixtures[0]
  switch (fixture.kind) {
    case 'action':
      return Pagination.paginationPages(
        {
          page: preview.page,
          totalPages: 5,
          navigation: {
            kind: 'action',
            onNavigate: page =>
              onMessageJson(
                JSON.stringify({ _tag: 'ChangedPaginationPage', page }),
              ),
          },
          ariaLabel: 'Search result pages',
        },
        h,
      )
    case 'link':
      return Pagination.paginationPages(
        {
          page: preview.page,
          totalPages: 12,
          siblingCount: fixture.siblingCount,
          boundaryCount: 1,
          navigation: { kind: 'link', href: () => '#' },
          ariaLabel: 'Invoice pages',
        },
        h,
      )
    case 'simple':
      return Pagination.pagination(
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
    case 'icons':
      return iconsOnlyView(preview, onMessageJson, h)
    case 'rtl':
      return Pagination.pagination(
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
  }
}
