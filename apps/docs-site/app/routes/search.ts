import { source } from "@/lib/source";

function formatSegment(segment: string) {
  return segment
    .split("-")
    .filter((part) => part.length > 0)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

const searchIndex = Promise.all(
  source.getPages().map(async (page) => ({
    title: page.data.title,
    description: page.data.description ?? "",
    breadcrumbs: page.slugs.slice(0, -1).map(formatSegment),
    url: page.url,
    keywords: [page.data.title, page.url, ...page.slugs.map(formatSegment)].join(" "),
  })),
);

export async function loader() {
  return Response.json((await searchIndex).sort((a, b) => a.title.localeCompare(b.title, "en")));
}
