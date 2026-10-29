import { Option } from "effect";

import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";
import * as Listbox from "@role-model-router/foldkit-ui/listbox";

/**
 * Workspace W1b (S491): the first real Foldkit Listbox facade.
 *
 * Bounded to one existing select (the Requests ranking metric). The parent keeps
 * the selected value in its existing RequestsRankingState; this module wraps the
 * vendored single-select Listbox view/update and maps its Selected OutMessage back
 * to the parent's existing Message.
 */
export const requestsMetricListbox = Listbox.create<string>();

export type RequestsMetricListboxModel = Listbox.Model;

export const initRequestsMetricListbox = (): RequestsMetricListboxModel =>
  Listbox.init({ id: "requests-ranking-metric" });

export interface RequestsMetricListboxOption {
  readonly label: string;
  readonly value: string;
}

export const requestsMetricListboxView = <ParentMessage>(
  config: {
    readonly model: Listbox.Model;
    readonly selected: string;
    readonly options: readonly RequestsMetricListboxOption[];
    readonly toParentMessage: (message: Listbox.Message) => ParentMessage;
  },
  h: HtmlBuilder<ParentMessage>,
): Html => {
  const labels = new Map(config.options.map((option) => [option.value, option.label]));
  return h.submodel({
    slotId: "requests-ranking-metric",
    model: config.model,
    view: requestsMetricListbox.view,
    viewInputs: {
      items: config.options.map((option) => option.value),
      itemToConfig: (value: string) => ({
        content: h.span([h.DataAttribute("ranking-metric-option", value)], [
          labels.get(value) ?? value,
        ]),
      }),
      buttonContent: h.span([h.DataAttribute("ranking-metric-value", "")], [
        labels.get(config.selected) ?? config.selected,
      ]),
      maybeSelectedValue: Option.some(config.selected),
      anchor: { placement: "bottom-start" },
    },
    toParentMessage: config.toParentMessage,
  });
};
