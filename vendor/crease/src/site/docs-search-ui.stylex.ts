import * as stylex from '@stylexjs/stylex'
import type { HtmlBuilder } from 'foldkit/html'
import * as DialogComponent from '@/stylex/dialog'

export * as CommandMenu from '@/stylex/command'

const styles = stylex.create({
  panel: {
    width: 'min(32rem, calc(100vw - 2rem))',
    maxWidth: 'calc(100vw - 2rem)',
  },
})

export const Dialog = {
  ...DialogComponent,
  dialog: <Msg>(props: DialogComponent.DialogProps<Msg>, h: HtmlBuilder<Msg>) =>
    DialogComponent.dialog({ ...props, layoutStyle: styles.panel }, h),
}
