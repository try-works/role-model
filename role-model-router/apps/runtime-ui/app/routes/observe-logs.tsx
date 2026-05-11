import { useEffect, useState } from "react";

import {
  CodeBlock,
  ErrorState,
  FactCard,
  LoadingState,
  PageHeader,
  SectionCard,
} from "../components/page-primitives";
import { mutedPanelClassName, secondaryButtonClassName } from "../lib/design-system";
import { fetchTextLogs } from "../lib/runtime-api";

export default function ObserveLogsRoute() {
  const [combinedLogs, setCombinedLogs] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchTextLogs("/logs")
      .then(setCombinedLogs)
      .catch((value: unknown) =>
        setError(value instanceof Error ? value.message : "Could not load preserved logs."),
      );
  }, []);

  if (error) {
    return <ErrorState label={error} />;
  }
  if (combinedLogs === null) {
    return <LoadingState label="Loading preserved logs…" />;
  }

  const lineCount = combinedLogs.split(/\r?\n/).filter((line) => line.length > 0).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Observe"
        title="Logs"
        description="The repo-owned shell keeps raw host logs inside a clearer operator frame while preserving the original stream endpoints."
        actions={
          <>
            <a className={secondaryButtonClassName} href="/logs">
              Combined log
            </a>
            <a className={secondaryButtonClassName} href="/logs/stream/proxy">
              Proxy stream
            </a>
            <a className={secondaryButtonClassName} href="/logs/stream/upstream">
              Upstream stream
            </a>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <FactCard
          label="Combined lines"
          value={String(lineCount)}
          detail="Current `/logs` history rendered below."
          emphasis
        />
        <FactCard
          label="Proxy stream"
          value="/logs/stream/proxy"
          detail="Live per-process proxy output stays preserved as a raw text stream."
        />
        <FactCard
          label="Upstream stream"
          value="/logs/stream/upstream"
          detail="Separate upstream output remains available without leaving the shell."
        />
      </div>

      <SectionCard
        title="Combined history"
        description="Use the preserved combined log to scan the latest history before dropping into the live split consoles."
      >
        <CodeBlock className="max-h-[22rem] overflow-y-auto">
          {combinedLogs || "(no logs recorded yet)"}
        </CodeBlock>
      </SectionCard>

      <div className="grid grid-cols-12 gap-4">
        <SectionCard
          className="col-span-12 xl:col-span-6"
          title="Proxy console"
          description="The live proxy stream stays raw and uninterrupted inside the observation shell."
        >
          <div className={`${mutedPanelClassName} overflow-hidden p-0`}>
            <iframe
              className="h-[26rem] w-full bg-[var(--rm-surface-strong)]"
              src="/logs/stream/proxy"
              title="Proxy log stream"
            />
          </div>
        </SectionCard>
        <SectionCard
          className="col-span-12 xl:col-span-6"
          title="Upstream console"
          description="Keep upstream process output adjacent to proxy logs so correlation stays immediate."
        >
          <div className={`${mutedPanelClassName} overflow-hidden p-0`}>
            <iframe
              className="h-[26rem] w-full bg-[var(--rm-surface-strong)]"
              src="/logs/stream/upstream"
              title="Upstream log stream"
            />
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
