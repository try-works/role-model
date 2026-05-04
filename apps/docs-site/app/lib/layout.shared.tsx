import { DocsHeader } from "@/components/docs-header";
import type { DocsLayoutProps } from "fumadocs-ui/layouts/docs";
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { appName, gitConfig } from "./shared";

const docsHeaderVariant: "default" | "top-right-actions" = "top-right-actions";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      // JSX supported
      title: appName,
    },
    ...(docsHeaderVariant === "default"
      ? { githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}` }
      : {}),
  };
}

export function docsLayoutOptions(): Pick<DocsLayoutProps, "containerProps" | "slots"> {
  if (docsHeaderVariant === "default") {
    return {};
  }

  return {
    containerProps: {
      className: "role-model-docs-layout [--fd-header-height:--spacing(14)]",
    },
    slots: {
      header: DocsHeader,
    },
  };
}
