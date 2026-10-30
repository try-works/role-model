import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";

import { CONTROL_SPECS, type ControlsState } from "../../control";
import {
  renderControlPage,
  renderDeviceAuthorizationForm,
  renderEndpointAdmissionForm,
  renderProviderAccountForm,
} from "../../control-view";
import type { DeviceAuthState } from "../../device-auth";
import type { EndpointAdmissionState } from "../../endpoint-admission";
import type { ProviderAccountState } from "../../provider-account";
import type { ReadbacksState } from "../../readback";
import type { DeviceAuthDialogModel } from "../../ui/dialog";
import type { Message } from "../../message";

export interface ProvidersRouteContext {
  readonly controls: Pick<ControlsState, "providers">;
  readonly deviceAuth: DeviceAuthState;
  readonly deviceAuthDialog: DeviceAuthDialogModel | undefined;
  readonly h: HtmlBuilder<Message>;
  readonly providerAccount: ProviderAccountState;
  readonly readbacks: ReadbacksState;
}

export interface EndpointsRouteContext {
  readonly controls: Pick<ControlsState, "endpoints">;
  readonly endpointAdmission: EndpointAdmissionState;
  readonly h: HtmlBuilder<Message>;
  readonly readbacks: ReadbacksState;
}

export const providersRoute = (ctx: ProvidersRouteContext): Html =>
  ctx.h.section([], [
    renderControlPage(CONTROL_SPECS.providers, ctx.controls.providers, ctx.h),
    renderDeviceAuthorizationForm(ctx.deviceAuth, ctx.deviceAuthDialog, ctx.h),
    renderProviderAccountForm(ctx.providerAccount, ctx.h),
  ]);

export const endpointsRoute = (ctx: EndpointsRouteContext): Html =>
  ctx.h.section([], [
    renderControlPage(CONTROL_SPECS.endpoints, ctx.controls.endpoints, ctx.h),
    renderEndpointAdmissionForm(ctx.endpointAdmission, ctx.h),
  ]);
