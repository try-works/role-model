import { Schema as S } from 'effect'
import { defineMessageUnion } from 'foldkit/message'

import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  checkboxFixtures,
  checkboxGroupItems,
  checkboxTableRows,
} from '@/docs/components/pages/checkbox/shared'
import * as Checkbox from '@/ui/checkbox'
import * as Field from '@/ui/field'
import * as Table from '@/ui/table'

const PreviewModel = S.Struct({
  _docsPage: S.Literal('checkbox'),
  isChecked: S.Boolean,
  isIndeterminate: S.Boolean,
  disks: S.Boolean,
  external: S.Boolean,
  drives: S.Boolean,
  servers: S.Boolean,
  selected: S.Array(S.String),
})
type PreviewModel = typeof PreviewModel.Type
const PreviewMessage = defineMessageUnion({
  ToggledCheckboxPreview: { isChecked: S.Boolean },
  ToggledGroupItem: {
    item: S.Literals(['disks', 'external', 'drives', 'servers']),
    isChecked: S.Boolean,
  },
  ToggledRow: { id: S.String, isChecked: S.Boolean },
  ToggledAll: { isChecked: S.Boolean },
})
type PreviewMessage = typeof PreviewMessage.Type

export const checkboxTailwindPreviewProgram = definePreviewProgram<
  PreviewModel,
  PreviewMessage
>({
  Model: PreviewModel,
  Message: PreviewMessage,
  init: index => ({
    _docsPage: 'checkbox',
    isChecked: checkboxFixtures[index]?.checked ?? false,
    isIndeterminate: checkboxFixtures[index]?.title === 'Indeterminate',
    disks: true,
    external: true,
    drives: false,
    servers: false,
    selected: ['1'],
  }),
  update: (model, message) => {
    switch (message._tag) {
      case 'ToggledCheckboxPreview':
        return {
          model: {
            ...model,
            isChecked: message.isChecked,
            isIndeterminate: false,
          },
        }
      case 'ToggledGroupItem':
        return { model: { ...model, [message.item]: message.isChecked } }
      case 'ToggledRow':
        return {
          model: {
            ...model,
            selected: message.isChecked
              ? [...model.selected, message.id]
              : model.selected.filter(id => id !== message.id),
          },
        }
      case 'ToggledAll':
        return {
          model: {
            ...model,
            selected: message.isChecked
              ? checkboxTableRows.map(row => row.id)
              : [],
          },
        }
    }
  },
  view: (index, model, h) => {
    const fixture = checkboxFixtures[index]
    if (fixture === undefined) return h.empty
    if (fixture.kind === 'group') {
      return h.div(
        [h.Class('w-full max-w-sm')],
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
                          isChecked: model[item.id],
                          onToggle: isChecked =>
                            PreviewMessage['ToggledGroupItem']({
                              item: item.id,
                              isChecked,
                            }),
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
        [h.Class('w-full max-w-2xl')],
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
                                        model.selected.length ===
                                        checkboxTableRows.length,
                                      onToggle: isChecked =>
                                        PreviewMessage['ToggledAll']({
                                          isChecked,
                                        }),
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
                                      isChecked: model.selected.includes(
                                        row.id,
                                      ),
                                      onToggle: isChecked =>
                                        PreviewMessage['ToggledRow']({
                                          id: row.id,
                                          isChecked,
                                        }),
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
        id: `docs-checkbox-${String(index)}`,
        isChecked: model.isChecked,
        onToggle: isChecked =>
          PreviewMessage['ToggledCheckboxPreview']({ isChecked }),
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
          ? { isIndeterminate: model.isIndeterminate }
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
  },
})
