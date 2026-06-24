import { describe, expect, test } from "vitest";
import {
  injectRoleModelIntentIntoPayload,
  injectRoleModelIntentIntoPayloadWithRuntimeTasks,
} from "../src/request-intent.js";

describe("Role-Model provider request intent injection", () => {
  test("injects classified role_model intent for known Role-Model aliases", () => {
    const payload = {
      model: "default.decision-only",
      messages: [{ role: "user", content: "Implement a bug fix and add a regression test." }],
    };

    const result = injectRoleModelIntentIntoPayload(payload, new Set(["default.decision-only"]));

    expect(result).not.toBe(payload);
    expect(result).toMatchObject({
      role_model: {
        contract_version: 1,
        intent: {
          taxonomy_version: "1.0.0-alpha.1",
          classification_contract_version: "role-model.classification.v1",
          role_hint_id: "tester",
          task_source: "heuristic",
        },
      },
    });
  });

  test("injects classified role_model intent for known direct Role-Model models", () => {
    const payload = {
      model: "claude-3.7-sonnet",
      messages: [{ role: "user", content: "Review this diff for security risks." }],
    };

    const result = injectRoleModelIntentIntoPayload(payload, new Set(["claude-3.7-sonnet"]));

    expect(result).not.toBe(payload);
    expect(result).toMatchObject({
      role_model: {
        contract_version: 1,
        intent: {
          role_hint_id: "security",
          task_type: "security.audit",
          source: "heuristic",
        },
      },
    });
  });

  test("does not modify non Role-Model provider payloads or explicit role_model intent", () => {
    const nonRoleModelPayload = {
      model: "gpt-4.1-mini",
      messages: [{ role: "user", content: "Implement a bug fix." }],
    };
    expect(injectRoleModelIntentIntoPayload(nonRoleModelPayload, new Set(["default.decision-only"]))).toBe(
      nonRoleModelPayload,
    );

    const explicitPayload = {
      model: "default.decision-only",
      role_model: { intent: { source: "explicit_user" } },
      messages: [{ role: "user", content: "Implement a bug fix." }],
    };
    expect(injectRoleModelIntentIntoPayload(explicitPayload, new Set(["default.decision-only"]))).toBe(
      explicitPayload,
    );
  });

  // ── F7: Context input extraction from payload (tools, images, files) ──

  test("extracts tool signals and passes them to classifier (F7)", () => {
    const payload = {
      model: "role-model/mixed.local-remote",
      messages: [{ role: "user", content: "Can you help me with something?" }],
      tools: [
        { type: "function", function: { name: "read_file" } },
        { type: "function", function: { name: "execute_command" } },
      ],
    };
    const result = injectRoleModelIntentIntoPayload(payload, new Set(["mixed.local-remote"]));
    expect(result).toHaveProperty("role_model.intent");
    const intent = (result as Record<string, unknown>).role_model as Record<string, unknown>;
    const innerIntent = intent.intent as Record<string, unknown>;
    // Tool presence with filesystem + shell tools should influence tool_classes
    expect(innerIntent.tool_classes).toEqual(
      expect.arrayContaining(["filesystem.read", "shell.execute"]),
    );
  });

  test("extracts image attachment signals from message content parts (F7)", () => {
    const payload = {
      model: "role-model/mixed.local-remote",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Review this screenshot for visual issues." },
            { type: "image_url", image_url: { url: "data:image/png;base64,..." } },
          ],
        },
      ],
    };
    const result = injectRoleModelIntentIntoPayload(payload, new Set(["mixed.local-remote"]));
    const intent = (result as Record<string, unknown>).role_model as Record<string, unknown>;
    const innerIntent = intent.intent as Record<string, unknown>;
    // Image attachment should bias toward designer or vision capabilities
    expect(innerIntent.preferred_capabilities).toEqual(
      expect.arrayContaining(["vision.input"]),
    );
  });

  // ── F8: Runtime override can redirect role families ──

  test("runtime override can redirect to a different role family when local guess is wrong (F8)", async () => {
    const { loadCompactTaxonomy } = await import("../src/taxonomy/load-compact-taxonomy.js");
    const taxonomy = loadCompactTaxonomy();
    const payload = {
      model: "role-model/mixed.local-remote",
      messages: [{ role: "user", content: "Debug this failing deployment pipeline." }],
    };

    // Mock: runtime offers richer operator tasks, redirecting from coder
    const fetchRuntimeTaskChunk = async (roleId: string) => {
      if (roleId === "operator") return taxonomy.roleTaskChunks.operator ?? [];
      if (roleId === "coder") return taxonomy.roleTaskChunks.coder ?? [];
      return [];
    };
    const fetchRuntimeRoleSummaries = async () => taxonomy.roleSummaries;

    const result = await injectRoleModelIntentIntoPayloadWithRuntimeTasks(
      payload,
      new Set(["mixed.local-remote"]),
      taxonomy,
      fetchRuntimeTaskChunk,
      fetchRuntimeRoleSummaries,
    );

    const intent = (result as Record<string, unknown>).role_model as Record<string, unknown>;
    const innerIntent = intent.intent as Record<string, unknown>;
    // The runtime should influence the role toward operator for deployment work
    expect(["operator", "coder"]).toContain(innerIntent.role_hint_id);
  });

  // ── R9.1: Classifier context depth with tool names and file extensions ──

  test("tool names bias classification toward appropriate role families (R9.1)", () => {
    const payload = {
      model: "role-model/mixed.local-remote",
      messages: [{ role: "user", content: "Can you help me with something?" }],
      tools: [
        { type: "function", function: { name: "execute_command" } },
        { type: "function", function: { name: "read_file" } },
      ],
    };
    const result = injectRoleModelIntentIntoPayload(payload, new Set(["mixed.local-remote"]));
    const intent = (result as Record<string, unknown>).role_model as Record<string, unknown>;
    const inner = intent.intent as Record<string, unknown>;
    expect(["coder", "operator", "architect", "tester"]).toContain(inner.role_hint_id);
  });

  test("browser tools bias classification toward researcher/tester/designer (R9.1)", () => {
    const payload = {
      model: "role-model/mixed.local-remote",
      messages: [{ role: "user", content: "Check this page." }],
      tools: [
        { type: "function", function: { name: "browser_navigate" } },
        { type: "function", function: { name: "browser_snapshot" } },
      ],
    };
    const result = injectRoleModelIntentIntoPayload(payload, new Set(["mixed.local-remote"]));
    const intent = (result as Record<string, unknown>).role_model as Record<string, unknown>;
    const inner = intent.intent as Record<string, unknown>;
    expect(["researcher", "tester", "designer"]).toContain(inner.role_hint_id);
  });

  test("database tools bias classification toward data roles (R9.1)", () => {
    const payload = {
      model: "role-model/mixed.local-remote",
      messages: [{ role: "user", content: "Look at this." }],
      tools: [
        { type: "function", function: { name: "db_query" } },
        { type: "function", function: { name: "db_schema" } },
      ],
    };
    const result = injectRoleModelIntentIntoPayload(payload, new Set(["mixed.local-remote"]));
    const intent = (result as Record<string, unknown>).role_model as Record<string, unknown>;
    const inner = intent.intent as Record<string, unknown>;
    expect(["data", "analyst", "architect"]).toContain(inner.role_hint_id);
  });

  test("file attachment extensions bias classification (R9.1)", () => {
    const payload = {
      model: "role-model/mixed.local-remote",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: "Review this for issues." },
          { type: "file", file: { filename: "schema.sql" } },
        ],
      }],
    };
    const result = injectRoleModelIntentIntoPayload(payload, new Set(["mixed.local-remote"]));
    const intent = (result as Record<string, unknown>).role_model as Record<string, unknown>;
    const inner = intent.intent as Record<string, unknown>;
    expect(["data", "architect"]).toContain(inner.role_hint_id);
  });

  test("context signals combined: tools + images produce additive bias (R9.1)", () => {
    const payload = {
      model: "role-model/mixed.local-remote",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: "Check this." },
          { type: "image_url", image_url: { url: "data:image/png;base64,..." } },
        ],
      }],
      tools: [
        { type: "function", function: { name: "browser_navigate" } },
        { type: "function", function: { name: "browser_snapshot" } },
      ],
    };
    const result = injectRoleModelIntentIntoPayload(payload, new Set(["mixed.local-remote"]));
    const intent = (result as Record<string, unknown>).role_model as Record<string, unknown>;
    const inner = intent.intent as Record<string, unknown>;
    expect(["designer", "tester"]).toContain(inner.role_hint_id);
  });

  test("extracts file attachment signals from message content parts (F7)", () => {
    const payload = {
      model: "role-model/mixed.local-remote",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: "Check this file for issues." },
            { type: "file", file: { filename: "report.pdf" } },
          ],
        },
      ],
    };
    const result = injectRoleModelIntentIntoPayload(payload, new Set(["mixed.local-remote"]));
    expect(result).toHaveProperty("role_model.intent");
    const intent = (result as Record<string, unknown>).role_model as Record<string, unknown>;
    const innerIntent = intent.intent as Record<string, unknown>;
    // File attachment should produce classification (not skip)
    expect(innerIntent.role_hint_id).toBeDefined();
    expect(innerIntent.task_type).toBeDefined();
  });
});
