import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";

import type { Model } from "../../model";
import { READBACK_SPECS, type ReadbacksState, renderReadbackPage } from "../../readback";
import { Message } from "../../message";
import { referenceCard, referenceDescription, referenceSection } from "../layout/reference";

export interface RuntimeRouteContext {
  readonly h: HtmlBuilder<Message>;
  readonly readbacks: ReadbacksState;
  readonly runtimeConfigEditor: Model["runtimeConfigEditor"];
  readonly runtimeConfigPage: (
    state: Model["runtimeConfigEditor"],
    configReadback: ReadbacksState["runtimeConfig"],
    runtimeReadback: ReadbacksState["runtime"],
    h: HtmlBuilder<Message>,
  ) => Html;
}

export const runtimeConfigRoute = (ctx: RuntimeRouteContext): Html => {
  const { h, readbacks } = ctx;
  return h.section([h.Class("rm3-next-route space-y-6"), h.DataAttribute("route", "runtime-config"), h.DataAttribute("page-layout", "reference")], [
    h.h2([h.Class("rm3-next-route-title text-sm font-medium leading-5 tracking-tight")], ["Runtime config"]),
    referenceDescription("Load, edit, review and confirm the runtime configuration against the applied snapshot.", h),
    ctx.runtimeConfigPage(ctx.runtimeConfigEditor, readbacks.runtimeConfig, readbacks.runtime, h),
  ]);
};

export const runtimeRoute = (ctx: RuntimeRouteContext): Html => {
  const { h, readbacks } = ctx;
  return referenceSection("runtime", "ok", [
    referenceCard("Applied runtime policy", "The policy the runtime has applied, read from the host snapshot.", [
      referenceDescription("Runtime topology · the applied policy is the source of truth.", h),
      renderReadbackPage(READBACK_SPECS.runtime, readbacks.runtime, h),
    ], h),
    referenceCard("Execution readiness", "Whether the runtime can execute the current configuration.", [
      referenceDescription("Execution readiness follows the host health and model availability.", h),
    ], h),
    referenceCard("Controller posture", "The current controller assignment and routing posture.", [
      referenceDescription("Controller posture is recorded by the runtime controller assignment.", h),
    ], h),
    referenceCard("Version facts", "Build and protocol version facts for this runtime.", [
      referenceDescription("Version facts are read from the running host.", h),
    ], h),
  ], h);
};
