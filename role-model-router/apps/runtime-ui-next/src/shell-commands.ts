import { Command } from "@role-model-router/foldkit";
import { Effect, Schema } from "effect";

import { Message } from "./message";
import { type RuntimeTheme, applyDocumentTheme, persistTheme } from "./theme";

/** S26b: shell facts applied at the host boundary after the pure update decides. */
export const applyThemeCommand = Command.define("ApplyTheme", {
  args: { theme: Schema.Literals(["light", "dark"]) },
  messages: [Message.ThemeApplied],
  execute: ({ theme }: { readonly theme: RuntimeTheme }) =>
    Effect.sync(() => {
      applyDocumentTheme(theme);
      persistTheme(theme);
      return Message.ThemeApplied();
    }),
});

export const scrollShellToTopCommand = Command.define("ScrollShellToTop", {
  messages: [Message.NavigationCompleted],
  execute: Effect.sync(() => {
    globalThis.window?.scrollTo({ behavior: "auto", top: 0 });
    return Message.NavigationCompleted();
  }),
});
