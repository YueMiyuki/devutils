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
  Scissors,
  Pipette,
  Clock,
  Calendar,
  Hash,
  QrCode,
  Activity,
  Shield,
  Fish,
  FileText,
  Braces,
} from "lucide-react";
import { useTranslation } from "react-i18next";

const toolIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "curl-converter": Terminal,
  "jwt-decoder": Key,
  base64: Binary,
  "json-csv": FileJson,
  "blame-intern": GitBranch,
  "deploy-roulette": Rocket,
  "boss-mode": TableProperties,
  "regex-tester": Scissors,
  "color-picker": Pipette,
  "timestamp-converter": Clock,
  "cron-generator": Calendar,
  "hash-generator": Hash,
  "qr-code": QrCode,
  "port-detective": Activity,
  "ssl-toothbrush": Shield,
  "websocket-fish": Fish,
  "lorem-tweezers": FileText,
  "ascii-cork": Braces,
};

// Tool ID to translation key mapping
const toolTranslationKeys: Record<string, string> = {
  "curl-converter": "tools.curlConverter.name",
  "jwt-decoder": "tools.jwtDecoder.name",
  base64: "tools.base64.name",
  "json-csv": "tools.jsonCsv.name",
  "blame-intern": "tools.blameIntern.name",
  "deploy-roulette": "tools.deployRoulette.name",
  "boss-mode": "tools.bossMode.name",
  "regex-tester": "tools.regexTester.name",
  "color-picker": "tools.colorPicker.name",
  "timestamp-converter": "tools.timestampConverter.name",
  "cron-generator": "tools.cronGenerator.name",
  "hash-generator": "tools.hashGenerator.name",
  "qr-code": "tools.qrCode.name",
  "port-detective": "tools.portDetective.name",
  "ssl-toothbrush": "tools.sslToothbrush.name",
  "websocket-fish": "tools.websocketFish.name",
  "lorem-tweezers": "tools.loremTweezers.name",
  "ascii-cork": "tools.asciiCork.name",
};

const utilityToolIds = [
  "curl-converter",
  "jwt-decoder",
  "base64",
  "json-csv",
  "regex-tester",
  "color-picker",
  "timestamp-converter",
  "cron-generator",
  "hash-generator",
  "qr-code",
  "port-detective",
  "ssl-toothbrush",
  "websocket-fish",
  "lorem-tweezers",
  "ascii-cork",
];
const funToolIds = ["blame-intern", "deploy-roulette", "boss-mode"];

export function TabBar() {
  const { t } = useTranslation();
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

  const handleAddTab = (toolId: string) => {
    const name = t(toolTranslationKeys[toolId]);
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
            const translatedTitle =
              t(toolTranslationKeys[tab.toolId]) || tab.title;
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
                <span className="text-sm truncate max-w-32">
                  {translatedTitle}
                </span>
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
          <DropdownMenuLabel>{t("tabBar.utilities")}</DropdownMenuLabel>
          {utilityToolIds.map((toolId) => {
            const Icon = toolIcons[toolId] || Terminal;
            const toolName = t(toolTranslationKeys[toolId]);
            return (
              <DropdownMenuItem
                key={toolId}
                onClick={() => handleAddTab(toolId)}
              >
                <Icon className="w-4 h-4 mr-2" />
                {toolName}
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>{t("tabBar.funStuff")}</DropdownMenuLabel>
          {funToolIds.map((toolId) => {
            const Icon = toolIcons[toolId] || Terminal;
            const toolName = t(toolTranslationKeys[toolId]);
            return (
              <DropdownMenuItem
                key={toolId}
                onClick={() => handleAddTab(toolId)}
              >
                <Icon className="w-4 h-4 mr-2" />
                {toolName}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
