import { SegmentedControl } from "@role-model/ui";

import { fieldClassName, fieldLabelClassName } from "../lib/design-system";
import { telemetryTimeRangeOptions } from "../lib/telemetry-chart-config";
import type { TelemetryTimeRangeValue } from "../lib/telemetry-route-models";
import { SelectField } from "./page-primitives";

export function TelemetryTimeRangeControl({
  value,
  onChange,
}: {
  readonly value: TelemetryTimeRangeValue;
  readonly onChange: (value: TelemetryTimeRangeValue) => void;
}) {
  return (
    <SegmentedControl
      aria-label="Telemetry time range"
      value={value}
      options={telemetryTimeRangeOptions.map((option) => ({
        value: option.value,
        label: option.label,
      }))}
      onChange={onChange}
      size="md"
      className="flex-nowrap"
    />
  );
}

export function TelemetrySelectField({
  label,
  value,
  options,
  onChange,
  className,
}: {
  readonly label: string;
  readonly value: string;
  readonly options: ReadonlyArray<{
    readonly label: string;
    readonly value: string;
  }>;
  readonly onChange: (value: string) => void;
  readonly className?: string;
}) {
  return (
    <SelectField className={className} label={label} onChange={onChange} value={value}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </SelectField>
  );
}

export function TelemetryTextField({
  label,
  value,
  placeholder,
  onChange,
}: {
  readonly label: string;
  readonly value: string;
  readonly placeholder?: string;
  readonly onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={fieldLabelClassName}>{label}</span>
      <input
        className={fieldClassName}
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}
