import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";

import type { ReadbackRowSchema } from "./readback";
import type { Schema } from "effect";

import {
  learningLadderRowKey,
  parseStoredLadderRow,
  type LearningRankingState,
} from "./learning-ranking";
import { Message } from "./message";

type ReadbackRow = typeof ReadbackRowSchema.Type;

const cell = (text: string) => text;

/** S412: top-3 ranked endpoints + full-ranking disclosure + per-row confirm/pending/error toggle. */
export const renderLearningRanking = (
  rows: readonly ReadbackRow[],
  state: LearningRankingState | undefined,
  h: HtmlBuilder<Message>,
): Html => {
  const ladders = rows.flatMap((entry) => {
    if (!entry.id.startsWith("ladder:")) return [];
    const ladder = parseStoredLadderRow(entry.meta);
    return ladder === null ? [] : [ladder];
  });
  if (ladders.length === 0) {
    return h.p([h.DataAttribute("learning-ranking-empty", ""), h.Class("mt-2 text-[12px] text-[var(--rm-secondary)]")], ["No endpoint ladder ranking rows reported."]);
  }
  return h.div([h.DataAttribute("learning-ranking", "")], [
    h.table([h.Class("mt-2 w-full text-left text-[12px]")], [
      h.thead([], [h.tr([], ["Role", "Task", "Admitted", "Configured", "Ranked", "Top 3", "Action"].map((label) => h.th([h.Class("border-b border-[var(--rm-border)] px-2 py-1")], [label])))]),
      h.tbody([], ladders.map((ladder) => {
        const key = learningLadderRowKey(ladder);
        const phase = state?.phases[key]?.phase ?? "idle";
        const phaseError = state?.phases[key]?.error;
        const rolledBack = ladder.rolledBack?.on === true;
        const label = phase === "confirming"
          ? (rolledBack ? "Confirm activate" : "Confirm roll back")
          : (rolledBack ? "Activate" : "Roll back");
        const top3 = ladder.topEndpoints.length === 0
          ? "No ranked endpoints reported."
          : ladder.topEndpoints.map((point) => point.endpointId + " (#" + String(point.rank ?? "?") + ", " + (point.status ?? "unknown") + ")").join("; ");
        return h.tr([h.DataAttribute("learning-ladder-row", key)], [
          h.td([h.Class("px-2 py-1")], [cell(ladder.roleId)]),
          h.td([h.Class("px-2 py-1")], [cell(ladder.taskTypeId)]),
          h.td([h.Class("px-2 py-1")], [ladder.completeness.admitted === null ? "not reported" : String(ladder.completeness.admitted)]),
          h.td([h.Class("px-2 py-1")], [ladder.completeness.configured === null ? "not reported" : String(ladder.completeness.configured)]),
          h.td([h.Class("px-2 py-1")], [ladder.rankedCount === null ? "not reported" : String(ladder.rankedCount)]),
          h.td([h.Class("px-2 py-1")], [top3]),
          h.td([h.Class("px-2 py-1")], [
            h.button([h.Type("button"), h.AriaDisabled(phase === "pending"), h.DataAttribute("learning-ladder-toggle", key), h.OnClick(Message.LearningLadderToggleRequested({ rolledBack: !rolledBack, roleId: ladder.roleId, taskTypeId: ladder.taskTypeId }))], [label]),
            ...(phaseError === undefined ? [] : [h.p([h.Role("alert"), h.Class("mt-1 text-[11px] text-[var(--rm-error)]")], [phaseError])]),
          ]),
        ]);
      })),
    ]),
    ...ladders.flatMap((ladder) => ladder.rungs === undefined ? [] : [
      h.details([h.DataAttribute("learning-full-ranking", learningLadderRowKey(ladder))], [
        h.summary([], ["Full endpoint ranking"]),
        h.ul([], ladder.rungs.map((point) => h.li([], [point.endpointId + " (rank " + String(point.rank ?? "?") + ", " + (point.status ?? "unknown") + ")"]))),
      ]),
    ]),
  ]);
};
