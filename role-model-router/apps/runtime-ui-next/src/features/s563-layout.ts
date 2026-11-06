import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";

import type { Message } from "../message";

/**
 * S563: shared page-layout primitives ported from the 0.0.20 reference
 * (SectionCard / PageFilters / DataTable / MetricStrip / ChartGrid). Pages compose
 * these instead of styling one-off CSS-variable panels, so every assigned route
 * shares the same card shell, header rule, filter bar, table shell and grid spans.
 */
type H = HtmlBuilder<Message>;

export const cardClass = "rounded-lg border border-border bg-card text-card-foreground";
export const cardHeaderClass = "-mx-4 flex flex-col gap-1 border-b border-border px-4 pb-3";
export const titleClass = "text-sm font-medium leading-5 tracking-tight text-foreground";
export const descriptionClass = "text-xs leading-4 text-muted-foreground";
export const filterLabelClass = "font-sans text-xs font-normal leading-4 text-muted-foreground";
export const filterControlClass =
  "h-[34px] w-full rounded-md border border-input bg-secondary px-2.5 text-left font-sans text-sm font-normal leading-[18px] text-foreground outline-none";
export const tableHeadClass =
  "border-b border-border pb-3 font-mono text-[11px] font-normal uppercase leading-4 tracking-[0.08em] text-muted-foreground";
export const tableCellClass =
  "border-b border-border py-3 align-top text-sm leading-5 text-foreground";

export const card = (
  title: string,
  description: string | undefined,
  children: ReadonlyArray<Html>,
  h: H,
): Html =>
  h.section(
    [h.Class(`${cardClass} flex flex-col gap-3 p-4`), h.DataAttribute("s563-card", title)],
    [
      h.div(
        [h.Class(cardHeaderClass)],
        [
          h.h2([h.Class(titleClass)], [title]),
          ...(description === undefined ? [] : [h.p([h.Class(descriptionClass)], [description])]),
        ],
      ),
      h.div([h.Class("min-w-0 pt-4")], children),
    ],
  );

export const table = (
  headers: ReadonlyArray<string>,
  rows: ReadonlyArray<ReadonlyArray<string>>,
  emptyText: string,
  h: H,
): Html =>
  h.table(
    [h.Class("min-w-full text-left text-sm"), h.DataAttribute("s563-table", "")],
    [
      h.thead(
        [],
        [
          h.tr(
            [],
            headers.map((header) => h.th([h.Class(tableHeadClass)], [header])),
          ),
        ],
      ),
      h.tbody(
        [],
        rows.length === 0
          ? [
              h.tr(
                [],
                [
                  h.td(
                    [
                      h.Attribute("colspan", String(headers.length)),
                      h.Class("py-3 text-sm text-muted-foreground"),
                    ],
                    [emptyText],
                  ),
                ],
              ),
            ]
          : rows.map((cells) =>
              h.tr(
                [h.Class("last:border-0")],
                cells.map((cell) => h.td([h.Class(tableCellClass)], [cell])),
              ),
            ),
      ),
    ],
  );

export type FilterField = {
  readonly label: string;
  readonly value: string;
  readonly options: ReadonlyArray<string>;
};

export const filterBar = (fields: ReadonlyArray<FilterField>, h: H): Html =>
  h.div(
    [
      h.Class("flex flex-wrap items-end justify-between gap-4"),
      h.DataAttribute("s563-filters", ""),
    ],
    [
      h.div(
        [h.Class("flex flex-wrap items-end gap-4")],
        fields.map((field) =>
          h.label(
            [h.Class("flex w-[150px] shrink-0 flex-col gap-1.5")],
            [
              h.span([h.Class(filterLabelClass)], [field.label]),
              h.select(
                [
                  h.AriaLabel(`${field.label}: ${field.options.join(", ")}`),
                  h.Class(filterControlClass),
                ],
                field.options.map((option) =>
                  h.option(
                    option === field.value
                      ? [h.Value(option), h.Selected(true)]
                      : [h.Value(option)],
                    [option],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    ],
  );

export const metrics = (
  items: ReadonlyArray<{ readonly label: string; readonly value: string }>,
  h: H,
): Html =>
  h.div(
    [
      h.Class("flex h-[54px] w-full overflow-hidden rounded-md border border-border bg-card"),
      h.DataAttribute("s563-metrics", ""),
    ],
    items.flatMap((item, index) => [
      ...(index === 0 ? [] : [h.div([h.Class("w-px shrink-0 self-stretch bg-border")], [])]),
      h.div(
        [h.Class("flex min-w-0 flex-1 flex-col justify-center gap-0.5 px-3.5")],
        [
          h.p(
            [
              h.Class(
                "font-mono text-[11px] leading-[14px] uppercase tracking-[0.08em] text-muted-foreground",
              ),
            ],
            [item.label],
          ),
          h.p(
            [h.Class("font-mono text-sm leading-[18px] font-medium tabular-nums text-foreground")],
            [item.value],
          ),
        ],
      ),
    ]),
  );

export const segmented = (
  label: string,
  options: ReadonlyArray<string>,
  active: string,
  h: H,
  onSelect?: (option: string) => Message,
): Html =>
  h.div(
    [
      h.Role("group"),
      h.AriaLabel(label),
      h.Class(
        "flex h-9 w-fit shrink-0 items-center gap-1 rounded-md border border-border bg-secondary p-1",
      ),
      h.DataAttribute("s563-segmented", label),
    ],
    options.map((option) =>
      h.button(
        [
          h.Type("button"),
          h.Attribute("aria-pressed", option === active ? "true" : "false"),
          ...(onSelect === undefined ? [] : [h.OnClick(onSelect(option))]),
          h.Class(
            `flex h-7 items-center justify-center whitespace-nowrap rounded-[5px] px-2.5 font-sans text-sm leading-[18px] ${
              option === active
                ? "bg-primary font-semibold text-primary-foreground"
                : "font-normal text-muted-foreground"
            }`,
          ),
        ],
        [option],
      ),
    ),
  );

export const chartGrid = (
  cells: ReadonlyArray<{ readonly span: 6 | 12; readonly body: Html }>,
  h: H,
): Html =>
  h.div(
    [
      h.Class(
        "grid w-full grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-2",
      ),
    ],
    cells.map((cell) =>
      h.div(
        [
          h.Class(
            `min-w-0 bg-card ${cell.span === 12 ? "col-span-1 md:col-span-2" : "col-span-1"}`,
          ),
        ],
        [cell.body],
      ),
    ),
  );
