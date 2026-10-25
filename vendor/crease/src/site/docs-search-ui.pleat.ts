import { Style } from '@pleat/core'
import type { HtmlBuilder } from 'foldkit/html'
import * as DialogComponent from '@/pleat/dialog'

import { layoutStyle } from '@/pleat/contracts'
export * as CommandMenu from '@/pleat/command'

const styles = {
  panel: layoutStyle({
    width: 'min(32rem, calc(100vw - 2rem))',
    maxWidth: 'calc(100vw - 2rem)',
  }),
}

export const Dialog = {
  ...DialogComponent,
  dialog: <Msg>(props: DialogComponent.DialogProps<Msg>, h: HtmlBuilder<Msg>) =>
    DialogComponent.dialog({ ...props, layoutStyle: styles.panel }, h),
}
