"use client";

import type React from "react";
import { useRef, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useTabStore } from "@/lib/tab-store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Terminal, X, Plus, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  FUN_TOOLS,
  TOOL_ICONS,
  TOOL_TRANSLATIONS,
  ToolId,
  UTILITY_TOOLS,
} from "@/lib/tools-meta";

export function TabBar() {
  const { t } = useTranslation();
  const { tabs, activeTabId, addTab, removeTab, setActiveTab } = useTabStore();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [closingTabId, setClosingTabId] = useState<string | null>(null);

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

  useEffect(() => {
    if (activeTabId && scrollContainerRef.current) {
      const activeElement = scrollContainerRef.current.querySelector(
        `[data-tab-id="${activeTabId}"]`,
      );
      activeElement?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [activeTabId]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > 0) {
        e.preventDefault();
        scrollContainer.scrollLeft += e.deltaY;
      }
    };

    scrollContainer.addEventListener("wheel", handleWheel, { passive: false });
    return () => scrollContainer.removeEventListener("wheel", handleWheel);
  }, []);

  const handleAddTab = (toolId: string) => {
    const name = t(TOOL_TRANSLATIONS[toolId as ToolId] ?? toolId);
    addTab(toolId, name);
  };

  const handleRemoveTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    setClosingTabId(tabId);
    setTimeout(() => {
      removeTab(tabId);
      setClosingTabId(null);
    }, 150);
  };

  return (
    <div
      className="
      relative flex items-center border-b border-border/50 bg-muted/30
    "
    >
      {/* Top subtle glow */}
      <div
        className="
        absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent
        via-foreground/5 to-transparent
      "
      />

      <div
        ref={scrollContainerRef}
        className="
          scrollbar-thin scrollbar-thumb-foreground/10
          scrollbar-track-transparent flex-1 overflow-x-auto
        "
        style={{ scrollbarWidth: "thin" }}
      >
        <div className="flex h-11 min-w-max items-center px-1">
          {tabs.map((tab, index) => {
            const Icon = TOOL_ICONS[tab.toolId as ToolId] || Terminal;
            const isActive = tab.id === activeTabId;
            const isClosing = tab.id === closingTabId;
            const translatedTitle =
              t(TOOL_TRANSLATIONS[tab.toolId as ToolId] ?? tab.title) ||
              tab.title;
            return (
              <div
                key={tab.id}
                data-tab-id={tab.id}
                className={cn(
                  `
                    group relative my-1 flex h-9 cursor-pointer items-center
                    gap-2.5 rounded-lg px-4
                  `,
                  "whitespace-nowrap transition-all duration-200",
                  "animate-tab-in",
                  isActive
                    ? `
                      border border-foreground/5 bg-background/80
                      text-foreground shadow-sm
                    `
                    : `
                      text-muted-foreground
                      hover:bg-foreground/3 hover:text-foreground
                    `,
                  isClosing && "-translate-x-2 scale-95 opacity-0",
                )}
                style={{ animationDelay: `${index * 30}ms` }}
                onClick={() => setActiveTab(tab.id)}
              >
                {/* Active indicator glow */}
                {isActive && (
                  <div
                    className="
                    absolute inset-0 rounded-lg bg-foreground/5
                  "
                  />
                )}

                <div
                  className={cn(
                    `
                      relative flex size-6 items-center justify-center
                      rounded-md
                    `,
                    "transition-all duration-200",
                    isActive
                      ? "bg-foreground/5"
                      : "group-hover:bg-foreground/3",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-3.5 shrink-0 transition-transform duration-200",
                      "group-hover:scale-110",
                    )}
                  />
                </div>

                <span className="relative max-w-32 truncate text-sm font-medium">
                  {translatedTitle}
                </span>

                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "relative ml-1 size-5 rounded-md",
                    `
                      opacity-0 transition-all duration-200
                      group-hover:opacity-100
                    `,
                    "hover:bg-destructive/10 hover:text-destructive",
                    isActive && "opacity-50",
                  )}
                  onClick={(e) => handleRemoveTab(e, tab.id)}
                >
                  <X className="size-3" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* New Tab Button */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "mr-2 size-9 shrink-0 rounded-lg",
              `
                border border-transparent
                hover:bg-foreground/5
              `,
              "hover:border-foreground/10",
              "transition-all duration-200",
            )}
          >
            <Plus className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-64 border-foreground/10 bg-popover/95 backdrop-blur-xl"
        >
          <DropdownMenuLabel
            className="
            text-xs tracking-wider text-muted-foreground/60 uppercase
          "
          >
            {t("tabBar.utilities")}
          </DropdownMenuLabel>
          {sortedUtility.map((toolId, index) => {
            const Icon = TOOL_ICONS[toolId] || Terminal;
            const toolName = t(TOOL_TRANSLATIONS[toolId]);
            return (
              <DropdownMenuItem
                key={toolId}
                onClick={() => handleAddTab(toolId)}
                className={cn(
                  "cursor-pointer gap-3 rounded-lg py-2.5",
                  "hover:bg-foreground/5",
                  "transition-all duration-150",
                  "animate-item-in",
                )}
                style={{ animationDelay: `${index * 15}ms` }}
              >
                <div
                  className="
                  flex size-7 items-center justify-center rounded-md border
                  border-foreground/5 bg-foreground/3
                "
                >
                  <Icon className="size-4" />
                </div>
                <span className="text-sm">{toolName}</span>
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator className="bg-foreground/5" />
          <DropdownMenuLabel
            className="
            flex items-center gap-2 text-xs tracking-wider
            text-muted-foreground/60 uppercase
          "
          >
            {t("tabBar.funStuff")}
            <Sparkles className="size-3" />
          </DropdownMenuLabel>
          {sortedFun.map((toolId, index) => {
            const Icon = TOOL_ICONS[toolId] || Terminal;
            const toolName = t(TOOL_TRANSLATIONS[toolId]);
            return (
              <DropdownMenuItem
                key={toolId}
                onClick={() => handleAddTab(toolId)}
                className={cn(
                  "cursor-pointer gap-3 rounded-lg py-2.5",
                  "hover:bg-foreground/5",
                  "transition-all duration-150",
                  "animate-item-in",
                )}
                style={{
                  animationDelay: `${(sortedUtility.length + index) * 15}ms`,
                }}
              >
                <div
                  className="
                  flex size-7 items-center justify-center rounded-md border
                  border-foreground/5 bg-foreground/3
                "
                >
                  <Icon className="size-4" />
                </div>
                <span className="text-sm">{toolName}</span>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
