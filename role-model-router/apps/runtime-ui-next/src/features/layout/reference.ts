import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";

import type { Message } from "../../message";

type H = HtmlBuilder<Message>;

export const referenceCardClass = "relative min-w-0 rounded-lg border border-border bg-card p-4";
export const referenceCardHeaderClass =
  "-mx-4 flex flex-col gap-2 border-b border-border px-4 pb-2";
export const referenceCardTitleClass =
  "text-sm font-medium leading-5 tracking-tight text-foreground";
export const referenceCardDescriptionClass = "max-w-[60ch] text-xs leading-4 text-muted-foreground";
export const referenceTableHeadCellClass =
  "px-3 py-2.5 font-mono text-[11px] font-normal uppercase leading-4 tracking-[0.08em] text-muted-foreground";
export const referenceTableClass = "w-full min-w-[640px] border-collapse text-left text-sm";
export const referenceTableCellClass = "px-3 py-3 align-top text-[13px] leading-5 text-foreground";
export const referenceTableRowClass = "border-b border-border last:border-b-0";

export const referenceSection = (
  route: string,
  state: string,
  children: ReadonlyArray<Html>,
  h: H,
  stateAttribute?: string,
): Html =>
  h.section(
    [
      h.Class("rm3-next-route space-y-4"),
      h.DataAttribute("route", route),
      h.DataAttribute("page-layout", "reference"),
      h.DataAttribute("page-state", state),
      ...(stateAttribute === undefined ? [] : [h.DataAttribute(stateAttribute, state)]),
    ],
    children,
  );

export const referenceCard = (
  title: string,
  description: string | undefined,
  children: ReadonlyArray<Html>,
  h: H,
): Html =>
  h.section(
    [h.Class(referenceCardClass)],
    [
      h.div(
        [h.Class(referenceCardHeaderClass)],
        [
          h.h3([h.Class(referenceCardTitleClass)], [title]),
          ...(description === undefined
            ? []
            : [
                h.p(
                  [h.Class(referenceCardDescriptionClass), h.Attribute("style", "max-width: 60ch")],
                  [description],
                ),
              ]),
        ],
      ),
      h.div([h.Class("mt-5")], children),
    ],
  );

export const referenceTable = (
  headings: ReadonlyArray<string>,
  rows: ReadonlyArray<ReadonlyArray<string>>,
  emptyText: string,
  h: H,
  emptyState?: string,
): Html =>
  h.div(
    [h.Class("overflow-x-auto")],
    [
      h.table(
        [h.Class(referenceTableClass)],
        [
          h.thead(
            [],
            [
              h.tr(
                [h.Class("border-b border-border")],
                headings.map((heading) => h.th([h.Class(referenceTableHeadCellClass)], [heading])),
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
                          h.Attribute("colspan", String(headings.length)),
                          ...(emptyState === undefined
                            ? []
                            : [h.DataAttribute("empty-state", emptyState)]),
                          h.Class("px-3 py-3 text-xs leading-4 text-muted-foreground"),
                        ],
                        [emptyText],
                      ),
                    ],
                  ),
                ]
              : rows.map((cells) =>
                  h.tr(
                    [h.Class(referenceTableRowClass)],
                    cells.map((cell) => h.td([h.Class(referenceTableCellClass)], [cell])),
                  ),
                ),
          ),
        ],
      ),
    ],
  );

export const referenceDescription = (text: string, h: H): Html =>
  h.p([h.Class("max-w-[72ch] text-xs leading-4 text-muted-foreground")], [text]);

export const referenceFilterBar = (
  filters: ReadonlyArray<Html>,
  actions: ReadonlyArray<Html>,
  h: H,
): Html =>
  h.div(
    [h.Class("flex flex-wrap items-end justify-between gap-4")],
    [
      h.div([h.Class("flex flex-wrap items-end gap-3")], filters),
      h.div([h.Class("flex items-end gap-2")], actions),
    ],
  );

export const referenceSelect = (label: string, options: ReadonlyArray<string>, h: H): Html =>
  h.label(
    [h.Class("flex flex-col gap-1 font-sans text-xs font-normal leading-4 text-muted-foreground")],
    [
      h.span([], [label]),
      h.select(
        [
          h.Class(
            "h-[34px] rounded-md border border-input bg-secondary px-3 text-sm text-foreground",
          ),
          h.AriaLabel(`${label} ${options.join(" ")}`),
        ],
        options.map((option) => h.option([], [option])),
      ),
    ],
  );

export const referenceMetricGrid = (
  items: ReadonlyArray<{ readonly label: string; readonly value: string }>,
  h: H,
): Html =>
  h.div(
    [h.Class("grid gap-4 sm:grid-cols-2 xl:grid-cols-3")],
    items.map((item) =>
      h.div(
        [h.Class("rounded-lg border border-border bg-card p-4")],
        [
          h.p(
            [
              h.Class(
                "font-mono text-[11px] uppercase leading-4 tracking-[0.08em] text-muted-foreground",
              ),
            ],
            [item.label],
          ),
          h.p(
            [h.Class("mt-2 text-2xl font-medium leading-7 tabular-nums text-foreground")],
            [item.value],
          ),
        ],
      ),
    ),
  );
