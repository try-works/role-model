import { useMDXComponents } from "@/components/mdx";
import { baseOptions, docsLayoutOptions } from "@/lib/layout.shared";
import { gitConfig } from "@/lib/shared";
import { getPageMarkdownUrl, source } from "@/lib/source";
import browserCollections from "collections/browser";
import { useFumadocsLoader } from "fumadocs-core/source/client";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
  ViewOptionsPopover,
} from "fumadocs-ui/layouts/docs/page";
import { redirect } from "react-router";
import type { Route } from "./+types/docs";

const legacyRedirects: Record<string, string> = {
  operators: "/runtime/runtime-ui-tour",
  "operators/runtime-ui-tour": "/runtime/runtime-ui-tour",
  "operators/models-and-role-activation": "/runtime/models-and-role-activation",
  "operators/benchmarks-and-evaluation": "/runtime/benchmarks-and-evaluation",
  "operators/routing-controls-and-decision-review": "/runtime/routing-controls-and-decision-review",
  routing: "/router/overview",
  "routing/candidate-discovery": "/router/candidate-selection-and-eligibility",
  "routing/eligibility-and-rejection": "/router/candidate-selection-and-eligibility",
  "routing/comparison-and-tradeoffs": "/router/scoring-tie-breaks-and-decisions",
  "routing/decision-semantics": "/router/scoring-tie-breaks-and-decisions",
  "routing/routing-outcomes-and-failure-modes": "/router/fallbacks-failures-and-observability",
  "routing/observability-of-routing": "/router/fallbacks-failures-and-observability",
  "routing/how-routing-works-end-to-end": "/router/how-routing-works-end-to-end",
  "routing/protocol-to-router-mapping": "/router/protocol-to-router-mapping",
  "router/candidate-selection": "/router/candidate-selection-and-eligibility",
  "router/scoring-and-tie-breaks": "/router/scoring-tie-breaks-and-decisions",
  "router/decisions-fallbacks-and-failures": "/router/fallbacks-failures-and-observability",
};

export async function loader({ params }: Route.LoaderArgs) {
  const path = (params["*"] ?? "").replace(/^\/+|\/+$/g, "");
  const redirectTarget = legacyRedirects[path];
  if (redirectTarget) throw redirect(redirectTarget, 301);

  const slugs = path.split("/").filter((v) => v.length > 0);
  const page = source.getPage(slugs);
  if (!page) throw new Response("Not found", { status: 404 });

  return {
    path: page.path,
    markdownUrl: getPageMarkdownUrl(page).url,
    pageTree: await source.serializePageTree(source.getPageTree()),
  };
}

const clientLoader = browserCollections.docs.createClientLoader({
  component(
    { toc, frontmatter, default: Mdx },
    // you can define props for the component
    {
      markdownUrl,
      path,
    }: {
      markdownUrl: string;
      path: string;
    },
  ) {
    return (
      <DocsPage toc={toc}>
        <title>{frontmatter.title}</title>
        <meta name="description" content={frontmatter.description} />
        <DocsTitle>{frontmatter.title}</DocsTitle>
        <DocsDescription>{frontmatter.description}</DocsDescription>
        <div className="flex flex-row gap-2 items-center border-b -mt-4 pb-6">
          <MarkdownCopyButton markdownUrl={markdownUrl} />
          <ViewOptionsPopover
            markdownUrl={markdownUrl}
            githubUrl={`https://github.com/${gitConfig.user}/${gitConfig.repo}/blob/${gitConfig.branch}/apps/docs-site/content/docs/${path}`}
          />
        </div>
        <DocsBody>
          <Mdx components={useMDXComponents()} />
        </DocsBody>
      </DocsPage>
    );
  },
});

export default function Page({ loaderData }: Route.ComponentProps) {
  const { pageTree, path, markdownUrl } = useFumadocsLoader(loaderData);

  return (
    <DocsLayout {...baseOptions()} {...docsLayoutOptions()} tree={pageTree}>
      {clientLoader.useContent(loaderData.path, {
        markdownUrl,
        path,
      })}
    </DocsLayout>
  );
}
