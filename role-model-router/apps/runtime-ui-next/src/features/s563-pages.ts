import type { Html, HtmlBuilder } from "@role-model-router/foldkit/html";

import type { Message } from "../message";
import { READBACK_SPECS, type ReadbackState, renderReadbackPage } from "../readback";
import { card, filterBar, table } from "./s563-layout";

type H = HtmlBuilder<Message>;

const page = (route: string, title: string, children: ReadonlyArray<Html>, h: H): Html =>
  h.section(
    [h.Class("rm3-next-route mt-4 flex flex-col gap-4"), h.DataAttribute("route", route)],
    [...children],
  );

const rowTable = (state: ReadbackState, h: H): Html =>
  table(
    ["Key", "Value", "Detail"],
    state.rows.map((row) => [row.label, row.value, row.meta]),
    "No rows recorded by the host.",
    h,
  );

/** S563: downstream integration in the shipped reference layout. */
export const integrationsDownstreamRoute = (
  readback: ReadbackState,
  models: ReadbackState,
  h: H,
): Html => {
  const fact = (label: string): string =>
    readback.rows.find((row) => row.label.toLowerCase() === label.toLowerCase())?.value ?? "—";
  const baseUrl = fact("baseUrl");
  const tile = (label: string, value: string) =>
    h.div(
      [h.Class("flex flex-col gap-2 rounded-md border border-border p-4")],
      [
        h.span(
          [
            h.Class(
              "font-mono text-[11px] font-normal uppercase tracking-[0.04em] text-muted-foreground",
            ),
          ],
          [label],
        ),
        h.span(
          [h.Class("break-all font-mono text-[12px] font-semibold leading-4 text-foreground")],
          [value],
        ),
      ],
    );
  return page(
    "integrations-downstream",
    "Downstream integration",
    [
      ...(readback.status === "loading"
        ? [
            h.p(
              [h.Class("font-sans text-[13px] leading-5 text-muted-foreground")],
              ["Loading downstream contract…"],
            ),
          ]
        : []),
      ...(readback.status === "error"
        ? [
            h.p(
              [h.Role("alert"), h.Class("font-sans text-[13px] leading-5 text-[var(--rm-error)]")],
              [readback.message ?? "Downstream OpenAI configuration read failed."],
            ),
          ]
        : []),
      ...(readback.status === "empty"
        ? [
            h.p(
              [h.Class("font-sans text-[13px] leading-5 text-muted-foreground")],
              ["No downstream OpenAI configuration available."],
            ),
          ]
        : readback.status === "ok" && fact("displayName") !== "—"
          ? [
              h.p(
                [h.Class("font-sans text-[13px] leading-5 text-muted-foreground")],
                [`Runtime: ${fact("displayName")}`],
              ),
            ]
          : []),
      card(
        "Connection contract",
        "OpenAI-compatible base URLs, endpoints, and auth header for clients calling this runtime.",
        [
          h.div(
            [h.Class("grid gap-3 md:grid-cols-3")],
            [
              tile("Provider type", "OpenAI-compatible"),
              tile("Base URL (standard)", baseUrl),
              tile("Base URL (/v1 suffix)", baseUrl === "—" ? "—" : `${baseUrl}/v1`),
              tile("Models endpoint", baseUrl === "—" ? "—" : `${baseUrl}/v1/models`),
              tile("Chat endpoint", baseUrl === "—" ? "—" : `${baseUrl}/v1/chat/completions`),
              tile("Auth header", "Authorization: Bearer <operator token>"),
            ],
          ),
        ],
        h,
      ),
      card(
        "Consumer setup",
        "Steps, model inventory, and example requests for OpenAI-compatible clients.",
        [
          h.div(
            [h.Class("grid gap-6 xl:grid-cols-2")],
            [
              h.div(
                [h.Class("space-y-4")],
                [
                  h.p(
                    [h.Class("font-sans text-[13px] font-semibold leading-5 text-foreground")],
                    ["Setup steps"],
                  ),
                  h.ol(
                    [
                      h.Class(
                        "list-decimal space-y-2 pl-5 font-sans text-[13px] leading-5 text-muted-foreground",
                      ),
                    ],
                    [
                      h.li(
                        [],
                        ["Choose an OpenAI-compatible provider entry in the downstream client."],
                      ),
                      h.li(
                        [],
                        [
                          "Set the base URL to the runtime origin (most clients) or the origin plus /v1 (clients that expect /v1 in the base URL).",
                        ],
                      ),
                      h.li(
                        [],
                        [
                          "If the client requires an API key, use the operator token as the bearer token.",
                        ],
                      ),
                      h.li([], ["Select a model returned by the /v1/models endpoint."]),
                    ],
                  ),
                  h.p(
                    [h.Class("font-sans text-[13px] leading-5 text-muted-foreground")],
                    [
                      "Inbound bearer validation is not enforced yet. If a downstream client requires a token field, use a placeholder value.",
                    ],
                  ),
                  h.p(
                    [h.Class("font-sans text-[13px] font-semibold leading-5 text-foreground")],
                    ["Compatibility notes"],
                  ),
                  h.ul(
                    [
                      h.Class(
                        "list-disc space-y-2 pl-5 font-sans text-[13px] leading-5 text-muted-foreground",
                      ),
                    ],
                    [
                      h.li([], ["Configure downstream tooling as an OpenAI-compatible provider."]),
                      h.li(
                        [],
                        ["Use /api/role-model/downstream/openai for alias capability metadata."],
                      ),
                      h.li(
                        [],
                        ["Use GET /v1/models for the compact OpenAI-compatible model list."],
                      ),
                      h.li(
                        [],
                        [
                          "Use conservative piMapping limits unless the request is routed with explicit conditional capability support.",
                        ],
                      ),
                    ],
                  ),
                ],
              ),
              h.div(
                [h.Class("space-y-4")],
                [
                  h.p(
                    [h.Class("font-sans text-[13px] font-semibold leading-5 text-foreground")],
                    ["Available models"],
                  ),
                  models.rows.length === 0
                    ? h.p(
                        [h.Class("font-sans text-[13px] leading-5 text-muted-foreground")],
                        ["No downstream models are exposed yet."],
                      )
                    : h.div(
                        [h.Class("flex flex-wrap gap-2")],
                        models.rows.map((row) =>
                          h.span(
                            [
                              h.Class(
                                "inline-flex items-center rounded-[6px] border border-border px-2.5 py-1 font-sans text-[12px] text-foreground",
                              ),
                            ],
                            [row.label],
                          ),
                        ),
                      ),
                  h.p(
                    [h.Class("font-sans text-[13px] font-semibold leading-5 text-foreground")],
                    ["Example commands"],
                  ),
                  h.pre(
                    [
                      h.Class(
                        "overflow-auto rounded-md border border-border bg-secondary p-3 font-mono text-[12px] leading-5 text-foreground",
                      ),
                    ],
                    [
                      `curl ${baseUrl === "—" ? "http://127.0.0.1:3456" : baseUrl}/v1/models\ncurl ${baseUrl === "—" ? "http://127.0.0.1:3456" : baseUrl}/v1/chat/completions`,
                    ],
                  ),
                ],
              ),
            ],
          ),
        ],
        h,
      ),
    ],
    h,
  );
};

/** S563: upstream integration in the shipped reference layout. */
export const integrationsUpstreamRoute = (
  readback: ReadbackState,
  models: ReadbackState,
  h: H,
): Html => {
  const groups = new Map<string, Array<{ method: string }>>();
  const servedProviders = new Set<string>();
  for (const modelRow of models.rows) {
    try {
      // SAFETY: configured model rows carry the runtime JSON record in meta.
      const meta = JSON.parse(modelRow.meta) as { readonly providerId?: string };
      if (meta.providerId !== undefined && meta.providerId !== "unknown")
        servedProviders.add(meta.providerId.toLowerCase());
    } catch {
      // A model without a readable provider record does not narrow the list.
    }
  }
  for (const row of readback.rows) {
    const provider = row.label.length > 0 ? row.label : "Provider";
    if (
      servedProviders.size > 0 &&
      ![...servedProviders].some((id) => provider.toLowerCase().includes(id))
    )
      continue;
    const entry = groups.get(provider) ?? [];
    entry.push({ method: row.value.length > 0 ? row.value : row.meta });
    groups.set(provider, entry);
  }
  const boundary = (title: string, body: string) =>
    h.div(
      [h.Class("flex flex-col gap-2 rounded-md border border-border p-4")],
      [
        h.p([h.Class("font-mono text-[13px] font-semibold leading-5 text-foreground")], [title]),
        h.p([h.Class("font-sans text-[13px] leading-5 text-muted-foreground")], [body]),
      ],
    );
  const slug = (value: string): string =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  return h.section(
    [
      h.Class("rm3-next-route flex flex-col gap-4"),
      h.DataAttribute("route", "integrations-upstream"),
    ],
    [
      h.div(
        [h.Class("grid gap-4 xl:grid-cols-[minmax(0,8fr)_minmax(0,4fr)] xl:items-start")],
        [
          card(
            "Provider accounts in scope",
            "Configured providers with at least one account feeding upstream access.",
            [
              readback.rows.length === 0
                ? h.p(
                    [h.Class("font-sans text-[13px] leading-5 text-muted-foreground")],
                    ["No upstream provider accounts are configured yet."],
                  )
                : h.div(
                    [h.Class("flex flex-col gap-3")],
                    [...groups.entries()].map(([provider, accounts]) =>
                      h.div(
                        [h.Class("flex flex-col gap-2 rounded-md border border-border p-4")],
                        [
                          h.div(
                            [h.Class("flex items-center justify-between gap-3")],
                            [
                              h.span(
                                [
                                  h.Class(
                                    "font-sans text-[13px] font-semibold leading-5 text-foreground",
                                  ),
                                ],
                                [provider],
                              ),
                              h.span(
                                [
                                  h.Class(
                                    "inline-flex items-center rounded-full border border-border px-2.5 py-0.5 font-sans text-[12px] text-foreground",
                                  ),
                                ],
                                [
                                  `${String(accounts.length)} account${accounts.length === 1 ? "" : "s"}`,
                                ],
                              ),
                            ],
                          ),
                          h.div(
                            [h.Class("flex flex-wrap gap-2")],
                            accounts.map((account) =>
                              h.span(
                                [h.Class("font-sans text-[12px] text-muted-foreground")],
                                [account.method],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
            ],
            h,
          ),
          h.div(
            [h.Class("flex flex-col gap-4")],
            [
              card(
                "Boundary guidance",
                "Raw escape hatch for provider-native behavior — not routed alias execution.",
                [
                  h.div(
                    [h.Class("flex flex-col gap-3")],
                    [
                      boundary(
                        "Raw passthrough only",
                        "Use the contextual /upstream/<models>/ doorway when you need direct provider-native behavior for a runtime-visible model instead of routed alias execution.",
                      ),
                      boundary(
                        "Live inventory",
                        `${String(models.rows.length)} upstream target${models.rows.length === 1 ? "" : "s"} are currently exposed from ${String(groups.size)} configured provider${groups.size === 1 ? "" : "s"}.`,
                      ),
                      boundary(
                        "Runtime boundary",
                        "Alias routing and telemetry stay on the runtime shell; this page preserves the raw escape hatch without replacing Router or Observe ownership.",
                      ),
                    ],
                  ),
                ],
                h,
              ),
              card(
                "Upstream target inventory",
                "Contextual /upstream/<model>/ doorways for provider-native access.",
                [
                  models.rows.length === 0
                    ? h.p(
                        [h.Class("font-sans text-[13px] leading-5 text-muted-foreground")],
                        ["No upstream targets are currently exposed."],
                      )
                    : h.div(
                        [h.Class("flex flex-col")],
                        models.rows.map((model) => {
                          let endpoints = 0;
                          try {
                            // SAFETY: configured model rows carry the runtime JSON record in meta.
                            const meta = JSON.parse(model.meta) as {
                              readonly endpoint_ids?: ReadonlyArray<string>;
                              readonly providerId?: string;
                            };
                            endpoints = (meta.endpoint_ids ?? []).length;
                          } catch {
                            endpoints = 0;
                          }
                          return h.div(
                            [
                              h.Class(
                                "flex flex-col gap-1 border-b border-border py-3 last:border-b-0",
                              ),
                            ],
                            [
                              h.div(
                                [h.Class("flex items-center justify-between gap-3")],
                                [
                                  h.span(
                                    [
                                      h.Class(
                                        "font-sans text-[13px] font-semibold leading-5 text-foreground",
                                      ),
                                    ],
                                    [model.label],
                                  ),
                                  h.span(
                                    [
                                      h.Class(
                                        "inline-flex items-center rounded-full border border-border px-2.5 py-0.5 font-sans text-[12px] text-foreground",
                                      ),
                                    ],
                                    [`${String(endpoints)} endpoint${endpoints === 1 ? "" : "s"}`],
                                  ),
                                ],
                              ),
                              h.span(
                                [h.Class("font-sans text-[12px] leading-4 text-muted-foreground")],
                                ["Owner role-model"],
                              ),
                              h.span(
                                [
                                  h.Class(
                                    "break-all font-mono text-[12px] leading-4 text-muted-foreground",
                                  ),
                                ],
                                [`/upstream/${slug(model.label)}/`],
                              ),
                            ],
                          );
                        }),
                      ),
                ],
                h,
              ),
            ],
          ),
        ],
      ),
    ],
  );
};

/** S563: queues page keeps the canonical queue readback hooks and the reference queue table. */
export const observeQueuesRoute = (readback: ReadbackState, h: H): Html =>
  h.section(
    [h.Class("rm3-next-route flex flex-col gap-6"), h.DataAttribute("route", "queues")],
    [
      h.div(
        [h.Class("flex flex-col gap-2")],
        [
          h.h2(
            [h.Class("font-sans text-[20px] font-semibold leading-7 text-foreground")],
            ["Queues"],
          ),
          h.p(
            [h.Class("font-sans text-[13px] leading-5 text-muted-foreground")],
            [
              "Queue truth from the shared store: depth, activity, retries and stalls per queue, with job drill-in.",
            ],
          ),
        ],
      ),
      table(
        [
          "Queue",
          "Mode",
          "Waiting",
          "Active",
          "Delayed",
          "Failed",
          "Stalled",
          "Oldest waiting",
          "p50",
          "p95",
          "Last error",
          "Drain",
        ],
        readback.rows.map((row) => [
          row.label,
          row.meta || "—",
          "—",
          row.value || "—",
          "—",
          "—",
          "—",
          "—",
          "—",
          "—",
          "—",
          "—",
        ]),
        "No queues configured yet.",
        h,
      ),
      ...(readback.status === "error"
        ? [
            h.p(
              [
                h.Role("alert"),
                h.DataAttribute("readback-state", "error"),
                h.Class("font-sans text-[13px] leading-5 text-[var(--rm-error)]"),
              ],
              [readback.message ?? "Queue store read failed."],
            ),
          ]
        : []),
    ],
  );
