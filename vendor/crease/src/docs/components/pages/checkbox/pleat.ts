import { Style } from '@pleat/core'
import type { HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  checkboxFixtures,
  checkboxGroupItems,
  checkboxTableRows,
} from '@/docs/components/pages/checkbox/shared'
import * as Checkbox from '@/pleat/checkbox'
import * as Field from '@/pleat/field'
import { className } from '@/pleat/style'
import * as Table from '@/pleat/table'

import { layoutStyle } from '@/pleat/contracts'
const styles = {
  wide: Style.make({ maxWidth: '24rem', width: '100%' }),
  wide2xl: Style.make({ maxWidth: '42rem', width: '100%' }),
  descOffset: layoutStyle({ marginTop: '-0.375rem' }),
}

export const checkboxPleatPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => {
  const preview = model as {
    isChecked: boolean
    isIndeterminate: boolean
    disks: boolean
    external: boolean
    drives: boolean
    servers: boolean
    selected: ReadonlyArray<string>
  }
  const fixture = checkboxFixtures[exampleIndex]
  if (fixture === undefined) return undefined
  if (fixture.kind === 'group') {
    return h.div(
      [h.Class(className(styles.wide))],
      [
        Field.fieldSet(
          {
            children: [
              Field.fieldLegend(
                { children: ['Show these items on the desktop:'] },
                h,
              ),
              Field.fieldDescription(
                {
                  layoutStyle: styles.descOffset,
                  children: [
                    'Select the items you want to show on the desktop.',
                  ],
                },
                h,
              ),
              Field.fieldGroup(
                {
                  children: checkboxGroupItems.map(item =>
                    Checkbox.checkbox(
                      {
                        id: `desktop-${item.id}`,
                        isChecked: preview[item.id],
                        onToggle: isChecked =>
                          onMessageJson(
                            JSON.stringify({
                              _tag: 'ToggledGroupItem',
                              item: item.id,
                              isChecked,
                            }),
                          ),
                        label: item.label,
                        name: 'desktop-items',
                        value: item.id,
                      },
                      h,
                    ),
                  ),
                },
                h,
              ),
            ],
          },
          h,
        ),
      ],
    )
  }
  if (fixture.kind === 'table') {
    return h.div(
      [h.Class(className(styles.wide2xl))],
      [
        Table.table(
          {
            children: [
              Table.tableHeader(
                {
                  children: [
                    Table.tableRow(
                      {
                        children: [
                          Table.tableHead(
                            {
                              children: [
                                Checkbox.checkbox(
                                  {
                                    id: 'select-all',
                                    isChecked:
                                      preview.selected.length ===
                                      checkboxTableRows.length,
                                    onToggle: isChecked =>
                                      onMessageJson(
                                        JSON.stringify({
                                          _tag: 'ToggledAll',
                                          isChecked,
                                        }),
                                      ),
                                    label: 'Select all rows',
                                  },
                                  h,
                                ),
                              ],
                            },
                            h,
                          ),
                          Table.tableHead({ children: ['Name'] }, h),
                          Table.tableHead({ children: ['Email'] }, h),
                          Table.tableHead({ children: ['Role'] }, h),
                        ],
                      },
                      h,
                    ),
                  ],
                },
                h,
              ),
              Table.tableBody(
                {
                  children: checkboxTableRows.map(row =>
                    Table.tableRow(
                      {
                        children: [
                          Table.tableCell(
                            {
                              children: [
                                Checkbox.checkbox(
                                  {
                                    id: `row-${row.id}`,
                                    isChecked: preview.selected.includes(
                                      row.id,
                                    ),
                                    onToggle: isChecked =>
                                      onMessageJson(
                                        JSON.stringify({
                                          _tag: 'ToggledRow',
                                          id: row.id,
                                          isChecked,
                                        }),
                                      ),
                                    label: `Select ${row.name}`,
                                  },
                                  h,
                                ),
                              ],
                            },
                            h,
                          ),
                          Table.tableCell({ children: [row.name] }, h),
                          Table.tableCell({ children: [row.email] }, h),
                          Table.tableCell({ children: [row.role] }, h),
                        ],
                      },
                      h,
                    ),
                  ),
                },
                h,
              ),
            ],
          },
          h,
        ),
      ],
    )
  }
  const checkbox = Checkbox.checkbox(
    {
      id: `docs-checkbox-${String(exampleIndex)}`,
      isChecked: preview.isChecked,
      onToggle: isChecked =>
        onMessageJson(
          JSON.stringify({ _tag: 'ToggledCheckboxPreview', isChecked }),
        ),
      label: fixture.label,
      ...(fixture.title === 'Invalid State' ? { isInvalid: true } : {}),
      ...(fixture.title === 'Description'
        ? {
            description:
              'By clicking this checkbox, you agree to the terms and conditions.',
          }
        : {}),
      ...(fixture.title === 'Disabled' ? { isDisabled: true } : {}),
      ...(fixture.title === 'Indeterminate'
        ? { isIndeterminate: preview.isIndeterminate }
        : {}),
      ...(fixture.title === 'Read only'
        ? {
            isReadOnly: true,
            description: 'This status is supplied by your identity provider.',
          }
        : {}),
      name: 'terms',
      value: 'accepted',
    },
    h,
  )
  return fixture.rtl === true ? h.div([h.Dir('rtl')], [checkbox]) : checkbox
}
