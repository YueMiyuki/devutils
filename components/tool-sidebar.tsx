"use client";

import React from "react";

import { cn } from "@/lib/utils";
import { useTabStore } from "@/lib/tab-store";
import { useSettingsStore } from "@/lib/settings-store";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  Settings,
  Wrench,
  MousePointerClick,
  Command,
  Sparkles,
} from "lucide-react";
import {
  FUN_TOOLS,
  TOOL_ICONS,
  TOOL_TRANSLATIONS,
  ToolId,
  UTILITY_TOOLS,
} from "@/lib/tools-meta";
import { useMemo } from "react";

interface ToolSidebarProps {
  onOpenSettings: () => void;
}

export function ToolSidebar({
  onOpenSettings,
}: ToolSidebarProps): React.JSX.Element {
  const { t } = useTranslation();
  const { openOrFocusTab } = useTabStore();
  const { sidebarCollapsed, setSidebarCollapsed } = useSettingsStore();
  const sortedUtility = useMemo(
    () =>
      [...UTILITY_TOOLS].sort((a, b) =>
        t(TOOL_TRANSLATIONS[a] ?? a).localeCompare(
          t(TOOL_TRANSLATIONS[b] ?? b),
        ),
      ),
    [t],
  );
  const sortedFun = useMemo(
    () =>
      [...FUN_TOOLS].sort((a, b) =>
        t(TOOL_TRANSLATIONS[a] ?? a).localeCompare(
          t(TOOL_TRANSLATIONS[b] ?? b),
        ),
      ),
    [t],
  );

  const getToolInfo = (id: string) => {
    const toolKey = TOOL_TRANSLATIONS[id as ToolId];
    const baseKey = toolKey ?? id;
    return {
      id,
      name: t(baseKey),
      shortName: toolKey
        ? t(toolKey.replace(".name", ".shortName"))
        : t(baseKey),
      description: toolKey
        ? t(toolKey.replace(".name", ".description"))
        : t(baseKey),
      icon: TOOL_ICONS[id as ToolId] || Wrench,
    };
  };

  const handleToolClick = (toolId: string, toolName: string) => {
    openOrFocusTab(toolId, toolName);
  };

  const renderToolButton = (toolId: string, index: number) => {
    const tool = getToolInfo(toolId);
    return (
      <Tooltip key={tool.id}>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "group h-10 w-full rounded-xl",
              `
                text-sidebar-foreground/70
                hover:text-sidebar-foreground
              `,
              `
                hover:bg-foreground/5
                active:bg-foreground/8
              `,
              "cursor-pointer transition-all duration-200",
              "animate-slide-in-left",
              sidebarCollapsed ? "justify-center" : "justify-start gap-3 px-3",
            )}
            style={{ animationDelay: `${index * 20}ms` }}
            onClick={() => handleToolClick(tool.id, tool.name)}
          >
            <tool.icon className="size-4 shrink-0" />
            {!sidebarCollapsed && (
              <span className="truncate text-sm">{tool.name}</span>
            )}
          </Button>
        </TooltipTrigger>
        {sidebarCollapsed && (
          <TooltipContent
            side="right"
            className="border-foreground/10 bg-popover/95 backdrop-blur-xl"
          >
            <p className="font-medium">{tool.name}</p>
            <p className="text-xs text-muted-foreground">{tool.description}</p>
          </TooltipContent>
        )}
      </Tooltip>
    );
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          "flex h-full flex-col border-r border-sidebar-border bg-sidebar",
          "overflow-hidden",
          sidebarCollapsed ? "w-16" : "w-64",
        )}
        style={{
          transition: "width 300ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {/* Logo */}
        <div
          className={cn(
            `
              relative flex shrink-0 items-center border-b border-sidebar-border
              p-4
            `,
            sidebarCollapsed ? "justify-center px-2" : "gap-3",
          )}
        >
          {/* Subtle top glow */}
          <div
            className="
            absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent
            via-foreground/10 to-transparent
          "
          />

          <div
            className={cn(
              "flex shrink-0 items-center justify-center",
              sidebarCollapsed ? "size-8" : "size-9",
              "rounded-xl border border-foreground/10 bg-foreground/5 shadow-sm",
              "transition-all duration-200",
            )}
          >
            <Wrench
              className={cn(
                "text-foreground/70",
                sidebarCollapsed
                  ? `
              size-4
            `
                  : `size-5`,
              )}
            />
          </div>

          {!sidebarCollapsed && (
            <div className="flex min-w-0 flex-1 flex-col">
              <span
                className="
                  truncate text-sm font-semibold text-sidebar-foreground
                "
                suppressHydrationWarning
              >
                {t("sidebar.title")}
              </span>
              <span className="text-xs text-muted-foreground/60">
                {t("sidebar.subtitle")}
              </span>
            </div>
          )}

          {!sidebarCollapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  data-ignore-click-saver
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "size-8 shrink-0 rounded-lg",
                    "hover:bg-foreground/5",
                    "transition-all duration-200",
                  )}
                  onClick={() =>
                    handleToolClick("click-saver", t("tools.clickSaver.name"))
                  }
                  title={t("tools.clickSaver.name")}
                >
                  <MousePointerClick className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="border-foreground/10 bg-popover/95 backdrop-blur-xl"
              >
                {t("tools.clickSaver.name")}
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Keyboard shortcut hint */}
        {!sidebarCollapsed && (
          <div className="border-b border-sidebar-border/50 px-4 py-2.5">
            <button
              type="button"
              onClick={() => {
                const event = new KeyboardEvent("keydown", {
                  key: "k",
                  metaKey: true,
                  ctrlKey: true,
                  bubbles: true,
                });
                window.dispatchEvent(event);
              }}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-3 py-2",
                "border border-foreground/5 bg-foreground/2",
                "hover:border-foreground/10 hover:bg-foreground/5",
                "group cursor-pointer transition-all duration-200",
              )}
            >
              <Command
                className="
                size-3.5 text-muted-foreground/60 transition-colors
                group-hover:text-foreground/60
              "
              />
              <span
                className="
                text-xs text-muted-foreground/60 transition-colors
                group-hover:text-foreground/60
              "
              >
                {t("sidebar.quickSearch")}
              </span>
              <kbd
                className="
                ml-auto rounded-sm border border-foreground/10 bg-foreground/5
                px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground/60
              "
              >
                K
              </kbd>
            </button>
          </div>
        )}

        {/* Tools List */}
        <ScrollArea className="min-h-0 flex-1 py-3">
          <div className="space-y-1 px-2">
            {!sidebarCollapsed && (
              <div className="flex items-center gap-2 px-3 pb-2">
                <span
                  className="
                  text-[10px] font-semibold tracking-widest
                  text-muted-foreground/50 uppercase
                "
                >
                  {t("sidebar.utilityTools")}
                </span>
                <div
                  className="
                  h-px flex-1 bg-linear-to-r from-foreground/5 to-transparent
                "
                />
              </div>
            )}
            {sortedUtility.map((id, i) => renderToolButton(id, i))}

            {/* Separator and Fun Tools Section */}
            <div className="py-3">
              <Separator className="bg-foreground/5" />
            </div>

            {!sidebarCollapsed && (
              <div className="flex items-center gap-2 px-3 pb-2">
                <span
                  className="
                  text-[10px] font-semibold tracking-widest
                  text-muted-foreground/50 uppercase
                "
                >
                  {t("sidebar.funTools")}
                </span>
                <Badge
                  variant="secondary"
                  className={cn(
                    "h-4 rounded-md px-1.5 py-0 text-[9px]",
                    "border-foreground/10 bg-foreground/5 text-foreground/50",
                  )}
                >
                  <Sparkles className="mr-0.5 size-2.5" />
                  NEW
                </Badge>
                <div
                  className="
                  h-px flex-1 bg-linear-to-r from-foreground/5 to-transparent
                "
                />
              </div>
            )}
            {sortedFun.map((id, i) =>
              renderToolButton(id, sortedUtility.length + i),
            )}
          </div>
        </ScrollArea>

        {/* Bottom Actions */}
        <div
          className="
          relative shrink-0 space-y-1 border-t border-sidebar-border p-2
        "
        >
          {/* Top glow line */}
          <div
            className="
            absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent
            via-foreground/5 to-transparent
          "
          />

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "h-10 w-full rounded-xl",
                  `
                    text-sidebar-foreground/70
                    hover:text-sidebar-foreground
                  `,
                  "hover:bg-foreground/5",
                  "cursor-pointer transition-all duration-200",
                  sidebarCollapsed
                    ? "justify-center"
                    : `
                    justify-start gap-3 px-3
                  `,
                )}
                onClick={onOpenSettings}
              >
                <Settings className="size-4 shrink-0" />
                {!sidebarCollapsed && (
                  <span className="text-sm">{t("sidebar.settings")}</span>
                )}
              </Button>
            </TooltipTrigger>
            {sidebarCollapsed && (
              <TooltipContent
                side="right"
                className="border-foreground/10 bg-popover/95 backdrop-blur-xl"
              >
                {t("sidebar.settings")}
              </TooltipContent>
            )}
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-full rounded-lg",
                  `
                    text-muted-foreground/50
                    hover:text-sidebar-foreground
                  `,
                  "hover:bg-foreground/5",
                  "cursor-pointer transition-all duration-200",
                )}
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="size-4" />
                ) : (
                  <ChevronLeft className="size-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side="right"
              className="border-foreground/10 bg-popover/95 backdrop-blur-xl"
            >
              {sidebarCollapsed ? t("sidebar.expand") : t("sidebar.collapse")}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
