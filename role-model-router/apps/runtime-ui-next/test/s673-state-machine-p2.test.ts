import assert from "node:assert/strict";
import { Option } from "effect";
import { describe, it } from "vitest";

import { Url } from "@role-model-router/foldkit";

import { emptyControls } from "../src/control";
import { Message } from "../src/message";
import { shellModel, shellUpdate } from "./support/runtime-shell";

/**
 * S673: remaining S671 P2 state-machine findings.
 * Route-change run cancellation, benchmark selection fencing, control-route revision gap,
 * localPolicy read failure, control action generation, provider activation generation.
 */
const urlOf = (href: string) => Option.getOrThrow(Url.fromString(`http://localhost${href}`));

const benchmarkModel = () => {
  const base = shellModel({ route: { _tag: "Benchmark" } });
  return shellModel({
    modelsView: {
      ...base.modelsView,
      benchmarkAction: { status: "saving" },
      benchmarkProgress: { runId: "run-A", status: "running" },
      benchmarkRunToken: 1,
      benchmarkSelectedEndpointIds: ["ep-a"],
    },
    route: { _tag: "Benchmark" },
  });
};

describe("S673 M1/M4 route change cancels off-route benchmark mutation", () => {
  it("clears transient run state when leaving Benchmark", () => {
    const away = shellUpdate(benchmarkModel(), Message.ChangedUrl({ url: urlOf("/models") }));
    assert.equal(away.model.route._tag, "Models");
    assert.equal(away.model.modelsView?.benchmarkProgress, undefined);
    assert.equal(away.model.modelsView?.benchmarkAction, undefined);
  });

  it("ignores a poll that arrives after leaving Benchmark", () => {
    const away = shellUpdate(benchmarkModel(), Message.ChangedUrl({ url: urlOf("/models") }));
    const polled = shellUpdate(
      away.model,
      Message.BenchmarkRunPolled({
        progressJson: JSON.stringify({ runId: "run-A", status: "running" }),
        token: 1,
      }),
    );
    assert.equal(polled.model.modelsView?.benchmarkProgress, undefined);
  });
});

describe("S673 M4 benchmark selection is frozen while a run is in flight", () => {
  it("ignores selecting another endpoint during the run", () => {
    const selected = shellUpdate(
      benchmarkModel(),
      Message.BenchmarkEndpointSelected({ endpointId: "ep-b", selected: true }),
    );
    assert.deepEqual(selected.model.modelsView?.benchmarkSelectedEndpointIds, ["ep-a"]);
  });
});

describe("S673 M9 control-route revision gap re-reads the control", () => {
  it("issues ReadControl and clears stale when the control loads", () => {
    const base = shellModel({ route: { _tag: "Providers" } });
    const model = shellModel({
      refresh: { lastAppliedRevision: 1, resyncToken: 0, status: "live" },
      route: { _tag: "Providers" },
    });
    const gap = shellUpdate(model, Message.RuntimeRevisionReceived({ revision: 3 }));
    const command = (gap.commands ?? [])[0] as unknown as { readonly name: string; readonly args?: { readonly key?: string } };
    assert.equal(command?.name, "ReadControl");
    assert.equal(command?.args?.key, "providers");
    assert.equal(gap.model.controls.providers.status, "loading");
    assert.equal(gap.model.refresh.status, "stale");

    const token = gap.model.controls.providers.token;
    const loaded = shellUpdate(
      gap.model,
      Message.ControlLoaded({
        key: "providers",
        snapshot: { actionStatus: "idle", rows: [], status: "ok", token },
        token,
      }),
    );
    assert.equal(loaded.model.refresh.status, "live");
    assert.equal(loaded.model.refresh.message, undefined);
  });
});

describe("S673 M2 localPolicy read failure keeps the error state", () => {
  it("does not rewrite a failed read with prior rows to ok", () => {
    const base = shellModel({ route: { _tag: "LocalPolicy" } });
    const model = shellModel({
      route: { _tag: "LocalPolicy" },
      readbacks: {
        ...base.readbacks,
        localPolicy: {
          rows: [{ id: "ttl", label: "TTL", meta: "", value: "5" }],
          status: "ok",
          token: 1,
        },
      },
    });
    const failed = shellUpdate(
      model,
      Message.ReadbackFailed({ key: "localPolicy", message: "refresh failed", token: 1 }),
    );
    assert.equal(failed.model.readbacks.localPolicy.status, "error");
    assert.equal(failed.model.readbacks.localPolicy.message, "refresh failed");
  });
});

describe("S673 M3 control action generation survives a read", () => {
  it("a control load does not clear a pending action", () => {
    const base = shellModel();
    const model = shellModel({
      controls: {
        ...base.controls,
        providers: { ...base.controls.providers, actionStatus: "pending", status: "ok", token: 3 },
      },
    });
    const loaded = shellUpdate(
      model,
      Message.ControlLoaded({
        key: "providers",
        snapshot: { actionStatus: "idle", rows: [], status: "ok", token: 3 },
        token: 3,
      }),
    );
    assert.equal(loaded.model.controls.providers.actionStatus, "pending");
  });
});

describe("S673 M5 provider activation is generation-fenced", () => {
  it("ignores an activation result older than the current generation", () => {
    const base = shellModel({ route: { _tag: "Providers" } });
    const model = shellModel({
      providerAccount: {
        draft: {
          apiKey: "",
          authMode: "api-key-static",
          baseUrlOverride: "",
          credentialRef: "",
          existingHealthStatus: "",
          existingRotationState: "",
          existingStatus: "",
          oauthConnected: "false",
          providerAccountId: "acct",
          providerId: "p",
          providerKind: "direct",
          roleIdsInput: "",
          modelInput: "m",
          selectedModelIds: [],
          variantId: "",
        },
        pendingAction: "create",
        status: "saving",
        token: 2,
      },
      route: { _tag: "Providers" },
    });
    const stale = shellUpdate(model, Message.ProviderAccountEndpointsActivated({ token: 1 }));
    assert.equal(stale.model.providerAccount?.status, "saving");
    assert.equal(stale.model.providerAccount?.pendingAction, "create");
    assert.equal(stale.model.providerAccount?.token, 2);
  });
});
