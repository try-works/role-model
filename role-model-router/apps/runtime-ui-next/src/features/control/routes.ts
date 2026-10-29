import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";

import { CONTROL_SPECS, type ControlsState } from "../../control";
import { renderControlPage, renderDeviceAuthorizationForm, renderProviderAccountForm } from "../../control-view";
import type { DeviceAuthState } from "../../device-auth";
import type { EndpointAdmissionState } from "../../endpoint-admission";
import type { ProviderAccountState } from "../../provider-account";
import type { DeviceAuthDialogModel } from "../../ui/dialog";
import { renderEndpointAdmissionForm } from "../endpoint-activation/view";
import type { Message } from "../../message";

export interface ControlRouteContext {
  readonly controls: ControlsState;
  readonly deviceAuth: DeviceAuthState;
  readonly deviceAuthDialog: DeviceAuthDialogModel | undefined;
  readonly endpointAdmission: EndpointAdmissionState;
  readonly h: HtmlBuilder<Message>;
  readonly providerAccount: ProviderAccountState;
}

export const providersRoute = (ctx: ControlRouteContext): Html =>
  ctx.h.section([], [
    renderControlPage(CONTROL_SPECS.providers, ctx.controls.providers, ctx.h),
    renderDeviceAuthorizationForm(ctx.deviceAuth, ctx.deviceAuthDialog, ctx.h),
    renderProviderAccountForm(ctx.providerAccount, ctx.h),
  ]);

export const endpointsRoute = (ctx: ControlRouteContext): Html =>
  ctx.h.section([], [
    renderControlPage(CONTROL_SPECS.endpoints, ctx.controls.endpoints, ctx.h),
    renderEndpointAdmissionForm(ctx.endpointAdmission, ctx.h),
  ]);
