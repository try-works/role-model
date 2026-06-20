import {
  Children,
  type ReactElement,
  type ReactNode,
  isValidElement,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { cn } from "../lib/cn";
import {
  bodyTextClassName,
  cardClassName,
  codeBlockClassName,
  eyebrowClassName,
  largeValueClassName,
  mutedPanelClassName,
  raisedPanelClassName,
  sectionTitleClassName,
  selectChevronStyle,
  selectFieldClassName,
  utilityLabelClassName,
} from "../lib/design-system";

export function SectionCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn(`${cardClassName} min-w-0 px-5 py-5 md:px-6 md:py-6`, className)}>
      <div className="mb-5">
        <h2 className={`text-[var(--rm-fg)] ${sectionTitleClassName}`}>{title}</h2>
        {description ? (
          <p className={`mt-2 max-w-[60ch] ${bodyTextClassName} text-[var(--rm-secondary)]`}>
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${raisedPanelClassName} p-5`}>
      <p className={eyebrowClassName}>{label}</p>
      <p className={`mt-4 text-[var(--rm-fg)] ${largeValueClassName}`}>{value}</p>
    </div>
  );
}

export function FactCard({
  label,
  value,
  detail,
  emphasis = false,
  className,
  valueClassName = largeValueClassName,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  emphasis?: boolean;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div
      className={cn(
        `${emphasis ? raisedPanelClassName : mutedPanelClassName} p-4 md:p-5`,
        className,
      )}
    >
      <p className={eyebrowClassName}>{label}</p>
      <p className={`mt-3 break-words tabular-nums text-[var(--rm-fg)] ${valueClassName}`}>
        {value}
      </p>
      {detail ? (
        <p className={`mt-2 max-w-[28ch] ${bodyTextClassName} text-[var(--rm-secondary)]`}>
          {detail}
        </p>
      ) : null}
    </div>
  );
}

export function StatusPill({
  tone,
  children,
  className,
}: {
  tone: "neutral" | "accent" | "warning" | "success";
  children: ReactNode;
  className?: string;
}) {
  const toneClass =
    tone === "accent"
      ? "border-[color:var(--rm-accent-muted)] bg-transparent text-[var(--rm-accent)]"
      : tone === "warning"
        ? "border-[var(--rm-warning)] bg-transparent text-[var(--rm-warning)]"
        : tone === "success"
          ? "border-[var(--rm-success)] bg-transparent text-[var(--rm-success)]"
          : "border-[var(--rm-border)] bg-transparent text-[var(--rm-secondary)]";

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[var(--rm-radius-pill)] border px-3 py-1.5 text-[12px] font-normal uppercase tracking-[0.16em] leading-3",
        toneClass,
        className,
      )}
    >
      {children}
    </span>
  );
}

export type SelectOptionModel = {
  readonly value: string;
  readonly label: string;
  readonly disabled: boolean;
};

type SelectOptionElement = ReactElement<{
  readonly children?: ReactNode;
  readonly disabled?: boolean;
  readonly value?: string | number;
}>;

function getNodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(getNodeText).join("");
  }
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return getNodeText(node.props.children);
  }
  return "";
}

function getSelectOptions(children: ReactNode): SelectOptionModel[] {
  return Children.toArray(children).flatMap((child): SelectOptionModel[] => {
    if (!isValidElement(child)) {
      return [];
    }
    const option = child as SelectOptionElement;
    const label = getNodeText(option.props.children).trim();
    const rawValue = option.props.value;
    return [
      {
        value: rawValue === undefined ? label : String(rawValue),
        label,
        disabled: Boolean(option.props.disabled),
      },
    ];
  });
}

export function getSelectTypeaheadMatchIndex(
  options: readonly SelectOptionModel[],
  query: string,
  currentIndex: number,
): number {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  if (!normalizedQuery || options.length === 0) {
    return -1;
  }

  const startIndex = currentIndex >= 0 ? currentIndex + 1 : 0;
  for (let offset = 0; offset < options.length; offset += 1) {
    const index = (startIndex + offset) % options.length;
    const option = options[index];
    if (!option?.disabled && option.label.trim().toLocaleLowerCase().startsWith(normalizedQuery)) {
      return index;
    }
  }
  return -1;
}

export function SelectField({
  label,
  value,
  children,
  onChange,
  className,
}: {
  label: string;
  value: string;
  children: ReactNode;
  onChange: (value: string) => void;
  className?: string;
}) {
  const labelId = useId();
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const typeaheadTextRef = useRef("");
  const typeaheadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const options = useMemo(() => getSelectOptions(children), [children]);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const selectedOption = selectedIndex >= 0 ? options[selectedIndex] : null;
  const firstEnabledIndex = options.findIndex((option) => !option.disabled);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(
    selectedIndex >= 0 ? selectedIndex : firstEnabledIndex,
  );

  useEffect(() => {
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : firstEnabledIndex);
  }, [firstEnabledIndex, selectedIndex]);

  useEffect(() => {
    return () => {
      if (typeaheadTimerRef.current) {
        clearTimeout(typeaheadTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (open && activeIndex >= 0) {
      optionRefs.current[activeIndex]?.focus();
    }
  }, [activeIndex, open]);

  const moveActive = (direction: 1 | -1) => {
    if (options.length === 0) {
      return;
    }
    let nextIndex = activeIndex >= 0 ? activeIndex : firstEnabledIndex;
    for (let attempt = 0; attempt < options.length; attempt += 1) {
      nextIndex = (nextIndex + direction + options.length) % options.length;
      if (!options[nextIndex]?.disabled) {
        setActiveIndex(nextIndex);
        return;
      }
    }
  };

  const chooseOption = (option: SelectOptionModel) => {
    if (option.disabled) {
      return;
    }
    onChange(option.value);
    setOpen(false);
  };

  const handleTypeahead = (event: React.KeyboardEvent) => {
    if (
      event.key.length !== 1 ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      options.length === 0
    ) {
      return false;
    }

    event.preventDefault();

    const key = event.key.toLocaleLowerCase();
    const nextQuery = `${typeaheadTextRef.current}${key}`;
    const isRepeatedKey =
      nextQuery.length > 1 && Array.from(nextQuery).every((character) => character === key);
    const effectiveQuery = isRepeatedKey ? key : nextQuery;
    const currentIndex = activeIndex >= 0 ? activeIndex : selectedIndex;
    const matchIndex = getSelectTypeaheadMatchIndex(options, effectiveQuery, currentIndex);

    typeaheadTextRef.current = effectiveQuery;
    if (typeaheadTimerRef.current) {
      clearTimeout(typeaheadTimerRef.current);
    }
    typeaheadTimerRef.current = setTimeout(() => {
      typeaheadTextRef.current = "";
    }, 700);

    if (matchIndex >= 0) {
      setOpen(true);
      setActiveIndex(matchIndex);
    }

    return true;
  };

  return (
    <div className="relative grid min-w-0 gap-2" ref={rootRef}>
      <span className={`${utilityLabelClassName} text-[var(--rm-fg)]`} id={labelId}>
        {label}
      </span>
      <button
        aria-controls={listboxId}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-labelledby={labelId}
        className={cn(
          `${selectFieldClassName} flex min-w-0 items-center justify-between gap-3 text-left`,
          className,
        )}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (handleTypeahead(event)) {
            return;
          }
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            setOpen(true);
            setActiveIndex(selectedIndex >= 0 ? selectedIndex : firstEnabledIndex);
          }
        }}
        style={selectChevronStyle}
        title={selectedOption?.label ?? "Select…"}
        type="button"
      >
        <span
          className={selectedOption ? "min-w-0 flex-1 truncate" : "min-w-0 flex-1 truncate text-[var(--rm-muted)]"}
        >
          {selectedOption?.label ?? "Select…"}
        </span>
      </button>
      {open ? (
        <div
          aria-labelledby={labelId}
          className="absolute left-0 top-full z-50 mt-2 max-h-[320px] w-full overflow-y-auto rounded-[var(--rm-radius-panel)] border border-[var(--rm-border-strong)] bg-[var(--rm-surface)] p-1 shadow-[0_18px_48px_rgba(0,0,0,0.18)]"
          id={listboxId}
          role="listbox"
          tabIndex={-1}
        >
          {options.map((option, index) => {
            const selected = option.value === value;
            const active = index === activeIndex;
            return (
              <button
                aria-disabled={option.disabled || undefined}
                aria-selected={selected}
                className={cn(
                  "flex min-h-[40px] w-full items-center rounded-[var(--rm-radius-md)] px-3 py-2 text-left text-[15px] font-normal leading-5 tracking-[-0.016em] transition",
                  selected
                    ? "bg-[var(--rm-accent)] text-[var(--rm-on-primary)]"
                    : active
                      ? "bg-[var(--rm-accent-ghost)] text-[var(--rm-fg)]"
                      : "bg-transparent text-[var(--rm-secondary)] hover:bg-[var(--rm-panel)] hover:text-[var(--rm-fg)]",
                  option.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                )}
                key={`${option.value}:${option.label}`}
                onClick={() => chooseOption(option)}
                onKeyDown={(event) => {
                  if (handleTypeahead(event)) {
                    return;
                  }
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    moveActive(1);
                  } else if (event.key === "ArrowUp") {
                    event.preventDefault();
                    moveActive(-1);
                  } else if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    chooseOption(option);
                  }
                }}
                ref={(node) => {
                  optionRefs.current[index] = node;
                }}
                role="option"
                tabIndex={active ? 0 : -1}
                type="button"
              >
                <span className="truncate">{option.label}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function LoadingState({ label }: { label: string }) {
  return (
    <p className={`${mutedPanelClassName} border-dashed p-6 text-sm text-[var(--rm-secondary)]`}>
      {label}
    </p>
  );
}

export function EmptyState({ label }: { label: string }) {
  return (
    <p className={`${mutedPanelClassName} border-dashed p-6 text-sm text-[var(--rm-secondary)]`}>
      {label}
    </p>
  );
}

export function ErrorState({ label }: { label: string }) {
  return (
    <p className="rounded-[var(--rm-radius-panel)] border border-[var(--rm-error)] bg-[var(--rm-error-ghost)] p-6 text-sm text-[var(--rm-error)]">
      {label}
    </p>
  );
}

export function CodeBlock({ children, className }: { children: ReactNode; className?: string }) {
  return <pre className={cn(codeBlockClassName, className)}>{children}</pre>;
}

export function DisclosureSection({
  summary,
  children,
  defaultOpen = false,
}: {
  summary: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details className={`${cardClassName} px-5 py-4 md:px-6`} open={defaultOpen ? true : undefined}>
      <summary
        className={`cursor-pointer list-none text-[var(--rm-fg)] marker:content-none [&::-webkit-details-marker]:hidden ${sectionTitleClassName}`}
      >
        {summary}
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}
