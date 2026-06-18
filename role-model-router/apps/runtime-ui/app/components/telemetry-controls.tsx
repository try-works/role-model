import { SelectField } from "./page-primitives";
import {
  fieldClassName,
  primaryButtonClassName,
  secondaryButtonClassName,
  utilityLabelClassName,
} from "../lib/design-system";
import type { TelemetryTimeRangeValue } from "../lib/telemetry-route-models";
import { telemetryTimeRangeOptions } from "../lib/telemetry-chart-config";

export function TelemetryTimeRangeControl({
  value,
  onChange,
}: {
  readonly value: TelemetryTimeRangeValue;
  readonly onChange: (value: TelemetryTimeRangeValue) => void;
}) {
  return (
    <div className="flex flex-nowrap gap-2">
      {telemetryTimeRangeOptions.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            className={selected ? primaryButtonClassName : secondaryButtonClassName}
            onClick={() => onChange(option.value)}
            type="button"
          >
            {option.label}
          </button>
        );
      })}
    </div>
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
    <label className="grid gap-2">
      <span className={`${utilityLabelClassName} text-[var(--rm-secondary)]`}>{label}</span>
      <input
        className={fieldClassName}
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder={placeholder}
        type="text"
        value={value}
      />
    </label>
  );
}
