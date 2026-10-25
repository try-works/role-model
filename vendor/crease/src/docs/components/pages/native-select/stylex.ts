import type { HtmlBuilder } from 'foldkit/html'

import type { ExamplePreviewProvider } from '@/docs/components/page-definition'
import {
  nativeSelectFixtures,
  nativeSelectSpecs,
} from '@/docs/components/pages/native-select/shared'
import * as NativeSelect from '@/stylex/native-select'

interface NativeSelectPreviewShape {
  readonly value: string
}

export const nativeSelectStyleXPreview: ExamplePreviewProvider = <Msg>(
  exampleIndex: number,
  model: unknown,
  onMessageJson: (messageJson: string) => Msg,
  h: HtmlBuilder<Msg>,
) => {
  const shape = model as NativeSelectPreviewShape
  const fixture = nativeSelectFixtures[exampleIndex] ?? nativeSelectFixtures[0]
  const spec = nativeSelectSpecs[fixture.kind]
  return NativeSelect.nativeSelect(
    {
      id: `docs-native-select-sx-${String(exampleIndex)}`,
      value: shape.value,
      onChange: value =>
        onMessageJson(JSON.stringify({ _tag: 'ChangedValue', value })),
      options: [{ value: '', label: spec.placeholder }, ...spec.options],
      ...(spec.groups === undefined ? {} : { groups: spec.groups }),
      ...(spec.isDisabled === true ? { isDisabled: true } : {}),
      ...(spec.isInvalid === true ? { isInvalid: true } : {}),
      ...(spec.direction === undefined ? {} : { direction: spec.direction }),
    },
    h,
  )
}
