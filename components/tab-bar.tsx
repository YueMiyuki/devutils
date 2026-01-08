"use client";

import type React from "react";
import { useRef, useEffect } from "react";
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
import {
  Terminal,
  Key,
  Binary,
  FileJson,
  X,
  Plus,
  GitBranch,
  Rocket,
  TableProperties,
} from "lucide-react";

const toolIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "curl-converter": Terminal,
  "jwt-decoder": Key,
  base64: Binary,
  "json-csv": FileJson,
  "blame-intern": GitBranch,
  "deploy-roulette": Rocket,
  "boss-mode": TableProperties,
};

const utilityTools = [
  { id: "curl-converter", name: "cURL Converter" },
  { id: "jwt-decoder", name: "JWT Can Opener" },
  { id: "base64", name: "Base64 Screwdriver" },
  { id: "json-csv", name: "JSON/CSV Swivel Knife" },
];

const funTools = [
  { id: "blame-intern", name: "Blame The Intern" },
  { id: "deploy-roulette", name: "Deploy Roulette" },
  { id: "boss-mode", name: "Boss Mode Decoy" },
];

/**
 * Renders the horizontal tab bar used to display, switch between, add, and remove tool tabs.
 *
 * The tab bar syncs with tab state from the store, auto-scrolls the active tab into view,
 * and enables horizontal scrolling via the mouse wheel. Each tab shows an icon, title,
 * and a close control; a dropdown provides options to add new tabs.
 *
 * @returns The rendered tab bar element.
 */
export function TabBar() {
  const { tabs, activeTabId, addTab, removeTab, setActiveTab } = useTabStore();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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

  // Attach non-passive wheel listener for horizontal scrolling
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

  const handleAddTab = (toolId: string, name: string) => {
    addTab(toolId, name);
  };

  return (
    <div className="flex items-center bg-muted/50 border-b border-border">
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-x-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
        style={{ scrollbarWidth: "thin" }}
      >
        <div className="flex items-center h-10 min-w-max">
          {tabs.map((tab) => {
            const Icon = toolIcons[tab.toolId] || Terminal;
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                data-tab-id={tab.id}
                className={cn(
                  "group flex items-center gap-2 px-4 h-full border-r border-border cursor-pointer transition-colors whitespace-nowrap",
                  isActive
                    ? "bg-background text-foreground"
                    : "bg-muted/30 text-muted-foreground hover:bg-muted/60",
                )}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="text-sm truncate max-w-32">{tab.title}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "w-5 h-5 rounded-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/20",
                    isActive && "opacity-60",
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTab(tab.id);
                  }}
                >
                  <X className="w-3 h-3" />
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
            className="h-10 w-10 shrink-0 rounded-none border-l border-border hover:bg-muted/60"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Utilities</DropdownMenuLabel>
          {utilityTools.map((tool) => {
            const Icon = toolIcons[tool.id] || Terminal;
            return (
              <DropdownMenuItem
                key={tool.id}
                onClick={() => handleAddTab(tool.id, tool.name)}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tool.name}
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Fun Stuff</DropdownMenuLabel>
          {funTools.map((tool) => {
            const Icon = toolIcons[tool.id] || Terminal;
            return (
              <DropdownMenuItem
                key={tool.id}
                onClick={() => handleAddTab(tool.id, tool.name)}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tool.name}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}