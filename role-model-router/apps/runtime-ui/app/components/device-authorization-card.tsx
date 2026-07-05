import {
  bodyStrongTextClassName,
  inlineLinkClassName,
  monoCodeValueClassName,
  monoMetaTextClassName,
  panelBodyTextClassName,
  mutedPanelClassName,
  raisedPanelClassName,
  secondaryButtonClassName,
} from "../lib/design-system";
import {
  isCodexSubscriptionDeviceAuthorization,
  resolveVerificationWindowUrl,
  shouldAutoPollDeviceAuthorization,
} from "../lib/device-authorization";
import type { RuntimeDeviceAuthorization } from "../lib/runtime-api";
import { StatusPill } from "./page-primitives";

export function DeviceAuthorizationCard(input: {
  readonly session: RuntimeDeviceAuthorization;
  readonly copyCodeLabel: string;
  readonly onCopyCode: () => void;
}) {
  const verificationUrl = resolveVerificationWindowUrl(input.session);
  const isCodexSubscription = isCodexSubscriptionDeviceAuthorization(input.session);

  return (
    <div className={`${mutedPanelClassName} p-4 ${panelBodyTextClassName}`}>
      <div className="flex flex-wrap items-center gap-2">
        <p className={bodyStrongTextClassName}>Current provider authorization</p>
        <StatusPill
          tone={
            input.session.status === "connected"
              ? "success"
              : input.session.status === "pending"
                ? "accent"
                : "warning"
          }
        >
          {input.session.status}
        </StatusPill>
      </div>

      {isCodexSubscription && input.session.userCode ? (
        <div className={`mt-3 ${raisedPanelClassName} space-y-3 p-4`}>
          <p className={bodyStrongTextClassName}>Enter this code on the OpenAI page</p>
          <p className={monoCodeValueClassName}>{input.session.userCode}</p>
          <p>OpenAI asks for this code after you sign in.</p>
          <div className="flex flex-wrap gap-3">
            <button className={secondaryButtonClassName} type="button" onClick={input.onCopyCode}>
              {input.copyCodeLabel}
            </button>
            {verificationUrl ? (
              <a
                className={secondaryButtonClassName}
                href={verificationUrl}
                rel="noreferrer"
                target="_blank"
              >
                Open OpenAI verification page
              </a>
            ) : null}
          </div>
        </div>
      ) : input.session.userCode ? (
        <p className="mt-2">
          <span className={bodyStrongTextClassName}>User code:</span>{" "}
          {input.session.userCode}
        </p>
      ) : null}

      {isCodexSubscription && input.session.status === "pending" ? (
        <div className="mt-3 space-y-1">
          <p>1. Copy the one-time code.</p>
          <p>2. Open the OpenAI verification page.</p>
          <p>3. Sign in and paste the code when OpenAI asks for it.</p>
        </div>
      ) : shouldAutoPollDeviceAuthorization(input.session) ? (
        <p className="mt-2">
          The verification page opens in a new tab and this screen keeps checking automatically.
          Successful completion activates the selected models into the runtime endpoint registry.
        </p>
      ) : null}

      {verificationUrl && !isCodexSubscription ? (
        <p className="mt-2 break-all">
          <span className={bodyStrongTextClassName}>Verification URL:</span>{" "}
          <a
            className={inlineLinkClassName}
            href={verificationUrl}
            rel="noreferrer"
            target="_blank"
          >
            {verificationUrl}
          </a>
        </p>
      ) : null}

      {input.session.lastError ? (
        <p className={`mt-2 ${monoMetaTextClassName} text-[var(--rm-danger)]`}>
          {input.session.lastError}
        </p>
      ) : null}
    </div>
  );
}
