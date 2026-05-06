import { useEffect, useState } from "react";
import { useParams } from "react-router";

import { CodeBlock, ErrorState, LoadingState, PageHeader, SectionCard } from "../components/page-primitives";
import { fetchRequestDetail } from "../lib/runtime-api";

export default function RequestDetailRoute() {
  const { requestId = "" } = useParams();
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof fetchRequestDetail>> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!requestId) {
      return;
    }

    void fetchRequestDetail(requestId)
      .then(setDetail)
      .catch((value: unknown) => setError(value instanceof Error ? value.message : "Could not load request detail."));
  }, [requestId]);

  if (error) {
    return <ErrorState label={error} />;
  }
  if (!detail) {
    return <LoadingState label="Loading request inspector…" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Request inspector"
        title={requestId}
        description="Request artifact JSON plus the linked endpoint profile stay aligned with the runtime observation model."
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard title="Request artifact" description="Structured request detail from the host bridge.">
          <CodeBlock>
            {JSON.stringify(detail.request, null, 2)}
          </CodeBlock>
        </SectionCard>
        <SectionCard title="Endpoint profile" description="The latest observed profile and recent sample list for the selected endpoint.">
          <CodeBlock>
            {JSON.stringify(detail.endpointProfile, null, 2)}
          </CodeBlock>
        </SectionCard>
      </div>
    </div>
  );
}
