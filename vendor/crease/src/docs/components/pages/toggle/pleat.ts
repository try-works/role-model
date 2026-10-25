import { Style } from '@pleat/core'
import type { Html, HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  toggleFixtures,
  type ToggleItem,
} from '@/docs/components/pages/toggle/shared'
import * as Icon from '@/lib/icon'
import { className } from '@/pleat/style'
import * as Toggle from '@/pleat/toggle'

const styles = {
  row: Style.make({
    gap: '0.5rem',
    alignItems: 'center',
    display: 'flex',
    flexWrap: 'wrap',
  }),
  iconMd: Style.make({
    flexShrink: 0,
    pointerEvents: 'none',
    height: '1rem',
    width: '1rem',
  }),
}

interface TogglePreviewShape {
  readonly states: Readonly<Record<string, boolean>>
}

const itemToggle = <Msg>(
  item: ToggleItem,
  shape: TogglePreviewShape,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
): Html =>
  Toggle.toggle(
    {
      isPressed: shape.states[item.key] ?? false,
      onToggle: onMessageJson(
        JSON.stringify({ _tag: 'ToggledTogglePreview', id: item.key }),
      ),
      ...(item.variant === undefined ? {} : { variant: item.variant }),
      ...(item.size === undefined ? {} : { size: item.size }),
      ariaLabel: item.ariaLabel,
      ...(item.isDisabled === true ? { isDisabled: true } : {}),
      ...(item.direction === undefined ? {} : { direction: item.direction }),
      children:
        item.icon === undefined
          ? [item.label]
          : [
              Icon.icon(item.icon, { class: className(styles.iconMd) }, h),
              item.label,
            ],
    },
    h,
  )

export const togglePleatPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => {
  const shape = model as TogglePreviewShape
  const fixture = toggleFixtures[exampleIndex] ?? toggleFixtures[0]
  const toggles = fixture.items.map(item =>
    itemToggle(item, shape, onMessageJson, h),
  )
  if (fixture.kind === 'single') {
    return toggles[0] ?? h.div([], [])
  }
  return h.div([h.Class(className(styles.row))], toggles)
}
