import { Schema as S } from 'effect'
import { definePreviewProgram } from '@/docs/components/pages/authored-page'
import {
  dataGridFixtures,
  docDataGridConfig,
  docPeople,
} from '@/docs/components/pages/data-grid/shared'
import * as DataGrid from '@/lib/data-grid'
import { dataGrid } from '@/stylex/data-grid'

const Message = DataGrid.Message
type Message = typeof Message.Type
const Model = S.Struct({
  _docsPage: S.Literal('data-grid'),
  grid: DataGrid.Model,
})
type Model = typeof Model.Type

export const dataGridStylexPreviewProgram = definePreviewProgram<
  Model,
  Message
>({
  Model,
  Message,
  init: () => ({
    _docsPage: 'data-grid',
    grid: DataGrid.init(docDataGridConfig, docPeople),
  }),
  update: (model, message) => ({
    model: {
      ...model,
      grid: DataGrid.update(model.grid, message, docDataGridConfig),
    },
  }),
  view: (index, model, h) => {
    const fixture = dataGridFixtures[index] ?? dataGridFixtures[0]!
    return h.div(
      [h.Class('h-140 flex flex-col'), ...(fixture.rtl ? [h.Dir('rtl')] : [])],
      [dataGrid({ model: model.grid, config: docDataGridConfig }, h)],
    )
  },
})
