/* tablecn data-grid block view — thin wrapper around the stylex data-grid
   component, wired to the Person demo columns. */

import type { Html, HtmlBuilder } from 'foldkit/html'

import type * as DataGrid from '@/lib/data-grid'
import { personDataGridConfig } from '@/lib/tablecn-data'
import { dataGrid } from '@/pleat/data-grid'

export const gridView = (
  model: DataGrid.Model,
  h: HtmlBuilder<DataGrid.Message>,
): Html => dataGrid({ model, config: personDataGridConfig }, h)
