import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  route("api/search", "routes/search.ts"),

  // LLM integration:
  route("llms.txt", "llms/index.ts"),
  route("llms-full.txt", "llms/full.ts"),
  route("llms.mdx/docs/*", "llms/mdx.ts"),

  index("routes/docs.tsx", { id: "routes/docs-index" }),
  route("*", "routes/docs.tsx", { id: "routes/docs-splat" }),
] satisfies RouteConfig;
