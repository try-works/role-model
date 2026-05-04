"use client";

import { gitConfig } from "@/lib/shared";
import Link from "fumadocs-core/link";
import { buttonVariants } from "fumadocs-ui/components/ui/button";
import { useDocsLayout } from "fumadocs-ui/layouts/docs";
import { SidebarIcon, SquareArrowOutUpRight } from "lucide-react";

export function DocsHeader() {
  const {
    isNavTransparent,
    slots,
    props: { nav },
  } = useDocsLayout();

  return (
    <header
      data-transparent={isNavTransparent}
      className="role-model-docs-header sticky top-(--fd-docs-row-1) z-30 [grid-area:header] flex h-(--fd-header-height) items-center gap-3 border-b px-4 transition-colors backdrop-blur-sm md:px-6 data-[transparent=false]:bg-fd-background/80"
      id="nd-subnav"
    >
      {slots.navTitle ? (
        <slots.navTitle className="inline-flex items-center gap-2.5 font-semibold md:hidden" />
      ) : null}

      <div className="flex-1">{nav?.children}</div>

      <div className="role-model-docs-header-actions hidden items-center gap-2 md:flex">
        {slots.searchTrigger ? (
          <slots.searchTrigger.full
            className="w-[min(24rem,36vw)] justify-start"
            hideIfDisabled={true}
          />
        ) : null}

        {slots.themeSwitch ? <slots.themeSwitch className="shrink-0" /> : null}

        <Link
          className={buttonVariants({
            color: "outline",
            size: "sm",
            className: "gap-2",
          })}
          external={true}
          href={`https://github.com/${gitConfig.user}/${gitConfig.repo}`}
        >
          <SquareArrowOutUpRight className="size-4" />
          GitHub
        </Link>
      </div>

      {slots.searchTrigger ? (
        <slots.searchTrigger.sm className="p-2 md:hidden" hideIfDisabled={true} />
      ) : null}

      {slots.sidebar ? (
        <slots.sidebar.trigger
          className={buttonVariants({
            color: "ghost",
            size: "icon-sm",
            className: "p-2 md:hidden",
          })}
        >
          <SidebarIcon />
        </slots.sidebar.trigger>
      ) : null}
    </header>
  );
}
