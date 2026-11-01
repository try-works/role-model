import { Schema } from "effect";

import {
  defineDispatchControl,
  defineDispatchStudio,
  defineReadDiagnostics,
  defineSaveRuntimeConfig,
} from "../../src/commands";
import { type ControlClient, emptyControls } from "../../src/control";
import { idleDiagnostics } from "../../src/diagnostics";
import { Model } from "../../src/model";
import { idleObservability } from "../../src/observability";
import { emptyReadbacks } from "../../src/readback";
import { initialRuntimeRefreshState } from "../../src/refresh";
import type { RuntimeConfigClient } from "../../src/runtime-config";
import type { StudioClient } from "../../src/studio";
import { createUpdate } from "../../src/update";

/**
 * S260: the typed harness for the update/scene tests.
 *
 * Every collaborator is a real Command definition built by the same `define*` factories
 * production uses, so a reducer command assertion reads the instance update returned, not a
 * test-owned fake. Tests then inspect `command.name`/`command.args` for the production
 * identity (`DispatchControl`, `DispatchStudio`, `SaveRuntimeConfig`). The clients are typed
 * stubs that only matter if something executes a Command; scene and reducer tests do not.
 */

const controlClient: ControlClient = {
  dispatch: async () => ({ body: {}, status: 200 }),
  read: async () => ({ body: {}, status: 200 }),
};

const studioClient: StudioClient = async () => ({ contentType: "", status: 500, text: "" });

const runtimeConfigClient: RuntimeConfigClient = {
  patchReplayAutoQueue: async () => ({ body: { config: {} }, status: 200 }),
  read: async () => ({ body: { config: {} }, status: 200 }),
  save: async () => ({ body: { config: {} }, status: 200 }),
};

const readDiagnostics = defineReadDiagnostics(async () => ({
  body: { records: [], state: "empty" },
  status: 200,
}));

/**
 * The reducer under test. Its command slots are the production definitions, so a signature or
 * argument change fails this module's typecheck instead of hiding behind a cast.
 */
export const shellUpdate = createUpdate(
  readDiagnostics,
  undefined,
  undefined,
  undefined,
  undefined,
  defineDispatchControl(controlClient),
  defineDispatchStudio(studioClient),
  defineSaveRuntimeConfig(runtimeConfigClient),
);

const idleModel: Model = {
  clicks: 0,
  controls: emptyControls(),
  diagnostics: idleDiagnostics(),
  observability: idleObservability(),
  readbacks: emptyReadbacks(),
  refresh: initialRuntimeRefreshState(),
  route: { _tag: "Index" },
  theme: "dark",
};

/** A schema-decoded `Model` with the repo's idle defaults; overrides are validated too. */
export const shellModel = (overrides: Partial<Model> = {}): Model =>
  Schema.decodeUnknownSync(Model)({ ...idleModel, ...overrides });
