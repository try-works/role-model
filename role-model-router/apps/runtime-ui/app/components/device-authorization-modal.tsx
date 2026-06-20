import { useEffect } from "react";

import {
  primaryButtonClassName,
  raisedPanelClassName,
  secondaryButtonClassName,
} from "../lib/design-system";
import { resolveVerificationWindowUrl } from "../lib/device-authorization";
import type { RuntimeDeviceAuthorization } from "../lib/runtime-api";

export function DeviceAuthorizationModal(input: {
  readonly session: RuntimeDeviceAuthorization;
  readonly copyCodeLabel: string;
  readonly onClose: () => void;
  readonly onCopyCode: () => void;
}) {
  const verificationUrl = resolveVerificationWindowUrl(input.session);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        input.onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [input]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4" role="presentation">
      <button
        aria-label="Close device authorization modal"
        className="absolute inset-0 bg-[var(--rm-accent-ghost)] backdrop-blur-[1px]"
        type="button"
        onClick={input.onClose}
      />
      <dialog
        open
        aria-labelledby="device-authorization-modal-title"
        aria-modal="true"
        className="relative mx-auto max-w-2xl rounded-[var(--rm-radius-panel)] border border-[var(--rm-border)] bg-[var(--rm-surface)] p-6 shadow-[var(--rm-shadow-card)]"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-normal uppercase tracking-[0.2em] text-[var(--rm-muted)]">
              Codex Subscription
            </p>
            <h2
              id="device-authorization-modal-title"
              className="mt-2 text-2xl font-light tracking-tight text-[var(--rm-fg)]"
            >
              OpenAI verification code
            </h2>
            <p className="mt-2 max-w-[60ch] text-sm leading-6 text-[var(--rm-secondary)]">
              Keep this code visible, then enter it on the OpenAI page after you sign in.
            </p>
          </div>
          <button className={secondaryButtonClassName} type="button" onClick={input.onClose}>
            Dismiss
          </button>
        </div>

        <div className={`mt-6 ${raisedPanelClassName} space-y-4 p-5`}>
          <p className="font-semibold text-[var(--rm-fg)]">Enter this code on the OpenAI page</p>
          <p className="font-mono text-3xl tracking-[0.32em] text-[var(--rm-fg)]">
            {input.session.userCode}
          </p>
          <p className="text-sm leading-6 text-[var(--rm-secondary)]">
            OpenAI asks for this one-time code after you approve access.
          </p>
        </div>

        <div className="mt-6 space-y-2 text-sm leading-6 text-[var(--rm-secondary)]">
          <p>1. Copy the one-time code.</p>
          <p>2. Open the OpenAI verification page.</p>
          <p>3. Sign in and paste the code when OpenAI asks for it.</p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button className={primaryButtonClassName} type="button" onClick={input.onCopyCode}>
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
      </dialog>
    </div>
  );
}
