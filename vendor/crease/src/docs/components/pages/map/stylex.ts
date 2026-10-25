import * as stylex from '@stylexjs/stylex'
import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import { renderDemo } from '@/docs/components/pages/map/preview'
import type {
  MapDemoComponents,
  MapDemoModel,
  MapDemoSkin,
} from '@/docs/components/pages/map/preview'
import { mapSkin } from '@/stylex/map'
import * as Select from '@/stylex/select'
import * as Button from '@/stylex/button'
import * as Label from '@/stylex/label'
import * as Text from '@/stylex/text'
import { className } from '@/stylex/style'
import { tokens } from '../../../../stylex/tokens.stylex'
import { foundationTokens } from '../../../../stylex/foundations-tokens.stylex'

const styles = stylex.create({
  toolbar: {
    padding: '0.5rem',
    borderRadius: tokens.radius,
    gap: '0.75rem',
    alignItems: 'center',
    backgroundColor: tokens.background,
    boxShadow: foundationTokens.shadowMd,
    color: tokens.foreground,
    display: 'flex',
    flexWrap: 'wrap',
    fontSize: '0.875rem',
    position: 'absolute',
    left: '0.75rem',
    top: '0.75rem',
  },
  field: { gap: '0.75rem', alignItems: 'center', display: 'flex' },
  readout: {
    padding: '0.5rem',
    borderRadius: tokens.controlRadius,
    overflow: 'auto',
    backgroundColor: tokens.background,
    boxShadow: foundationTokens.shadowSm,
    overflowWrap: 'anywhere',
    position: 'absolute',
    zIndex: 10,
    bottom: '2.5rem',
    left: '0.75rem',
    maxHeight: '5rem',
    right: '0.75rem',
  },
})
const demoSkin: MapDemoSkin = {
  toolbar: className(styles.toolbar),
  field: className(styles.field),
  readout: className(styles.readout),
}
const components: MapDemoComponents = {
  select: Select.select,
  button: Button.button,
  label: Label.label,
  text: Text.text,
}
export const mapStyleXPreview =
  (slug: string): ExamplePreviewProvider =>
  (index, model, onMessageJson, h) =>
    renderDemo(
      slug,
      index,
      model as MapDemoModel,
      mapSkin,
      message => onMessageJson(JSON.stringify(message)),
      h,
      demoSkin,
      components,
    )
