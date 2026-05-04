"use client";
import { useDocsSearch } from "fumadocs-core/search/client";
import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
  type SharedProps,
} from "fumadocs-ui/components/dialog/search";
import { useMemo } from "react";

type SearchRecord = {
  title: string;
  description: string;
  breadcrumbs: string[];
  url: string;
  keywords: string;
};

const indexCache = new Map<string, Promise<SearchRecord[]>>();

function normalize(value: string) {
  return value.trim().toLowerCase();
}

function createSearchClient(from: string) {
  async function getIndex() {
    const cached = indexCache.get(from);
    if (cached) return cached;

    const indexPromise = (async () => {
      const response = await fetch(from);
      if (!response.ok) throw new Error(await response.text());
      return (await response.json()) as SearchRecord[];
    })();

    indexCache.set(from, indexPromise);
    return indexPromise;
  }

  return {
    deps: [from],
    async search(query: string) {
      const normalizedQuery = normalize(query);
      if (normalizedQuery.length === 0) return [];

      const tokens = normalizedQuery.split(/\s+/).filter((token) => token.length > 0);
      const records = await getIndex();

      return records
        .map((record) => {
          const title = normalize(record.title);
          const description = normalize(record.description);
          const breadcrumbs = normalize(record.breadcrumbs.join(" "));
          const keywords = normalize(record.keywords);
          const url = normalize(record.url);

          let score = 0;
          if (title.includes(normalizedQuery)) score += 100;
          if (url.includes(normalizedQuery.replace(/\s+/g, "-"))) score += 50;

          for (const token of tokens) {
            if (title.includes(token)) score += 30;
            if (breadcrumbs.includes(token)) score += 15;
            if (keywords.includes(token)) score += 10;
            if (description.includes(token)) score += 5;
          }

          if (score === 0) return null;

          return {
            score,
            item: {
              id: record.url,
              type: "page" as const,
              breadcrumbs: record.breadcrumbs,
              url: record.url,
              content: record.title,
            },
          };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null)
        .sort((a, b) => b.score - a.score || a.item.content.localeCompare(b.item.content, "en"))
        .slice(0, 20)
        .map((entry) => entry.item);
    },
  };
}

export default function DefaultSearchDialog(props: SharedProps) {
  const client = useMemo(() => createSearchClient("/api/search.json"), []);
  const { search, setSearch, query } = useDocsSearch({ client }, [client]);

  return (
    <SearchDialog search={search} onSearchChange={setSearch} isLoading={query.isLoading} {...props}>
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList items={query.data !== "empty" ? query.data : null} />
      </SearchDialogContent>
    </SearchDialog>
  );
}
