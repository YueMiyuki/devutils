"use client";

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
  Terminal,
  Key,
  Binary,
  FileJson,
  Settings,
  ChevronLeft,
  ChevronRight,
  Wrench,
  GitBranch,
  Rocket,
  TableProperties,
} from "lucide-react";

const utilityToolIds = ["curl-converter", "jwt-decoder", "base64", "json-csv"];
const funToolIds = ["blame-intern", "deploy-roulette", "boss-mode"];

// Map tool IDs to translation keys
const toolKeyMap: Record<string, string> = {
  "curl-converter": "curlConverter",
  "jwt-decoder": "jwtDecoder",
  base64: "base64",
  "json-csv": "jsonCsv",
  "blame-intern": "blameIntern",
  "deploy-roulette": "deployRoulette",
  "boss-mode": "bossMode",
};

const toolIcons = {
  "curl-converter": Terminal,
  "jwt-decoder": Key,
  base64: Binary,
  "json-csv": FileJson,
  "blame-intern": GitBranch,
  "deploy-roulette": Rocket,
  "boss-mode": TableProperties,
};

interface ToolSidebarProps {
  onOpenSettings: () => void;
}

export function ToolSidebar({ onOpenSettings }: ToolSidebarProps) {
  const { t } = useTranslation();
  const { openOrFocusTab } = useTabStore();
  const { sidebarCollapsed, setSidebarCollapsed } = useSettingsStore();

  const getToolInfo = (id: string) => {
    const toolKey = toolKeyMap[id] || id;
    return {
      id,
      name: t(`tools.${toolKey}.name`),
      shortName: t(`tools.${toolKey}.shortName`),
      description: t(`tools.${toolKey}.description`),
      icon: toolIcons[id as keyof typeof toolIcons] || Wrench,
    };
  };

  const handleToolClick = (toolId: string, toolName: string) => {
    openOrFocusTab(toolId, toolName);
  };

  const renderToolButton = (toolId: string) => {
    const tool = getToolInfo(toolId);
    return (
      <Tooltip key={tool.id}>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              sidebarCollapsed && "justify-center px-2",
            )}
            onClick={() => handleToolClick(tool.id, tool.name)}
          >
            <tool.icon className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span className="truncate">{tool.name}</span>}
          </Button>
        </TooltipTrigger>
        {sidebarCollapsed && (
          <TooltipContent side="right">
            <p>{tool.name}</p>
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
          "flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-200",
          sidebarCollapsed ? "w-16" : "w-60",
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            "flex items-center gap-2 p-4 border-b border-sidebar-border",
            sidebarCollapsed && "justify-center",
          )}
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
            <Wrench className="w-4 h-4" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-sidebar-foreground">
                {t("sidebar.title")}
              </span>
              <span className="text-xs text-muted-foreground">Dev Tools</span>
            </div>
          )}
        </div>

        {/* Tools List */}
        <ScrollArea className="flex-1 py-2">
          <div className="px-2 space-y-1">
            {!sidebarCollapsed && (
              <span className="px-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t("sidebar.utilityTools")}
              </span>
            )}
            {utilityToolIds.map(renderToolButton)}

            {/* Separator and Fun Tools Section */}
            <Separator className="my-3" />

            {!sidebarCollapsed && (
              <div className="flex items-center gap-2 px-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {t("sidebar.funTools")}
                </span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  NEW
                </Badge>
              </div>
            )}
            {funToolIds.map(renderToolButton)}
          </div>
        </ScrollArea>

        {/* Bottom Actions */}
        <div className="p-2 border-t border-sidebar-border space-y-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  sidebarCollapsed && "justify-center px-2",
                )}
                onClick={onOpenSettings}
              >
                <Settings className="w-4 h-4 shrink-0" />
                {!sidebarCollapsed && <span>{t("sidebar.settings")}</span>}
              </Button>
            </TooltipTrigger>
            {sidebarCollapsed && (
              <TooltipContent side="right">
                {t("sidebar.settings")}
              </TooltipContent>
            )}
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-full text-muted-foreground hover:text-sidebar-foreground"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="w-4 h-4" />
                ) : (
                  <ChevronLeft className="w-4 h-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {sidebarCollapsed ? t("sidebar.expand") : t("sidebar.collapse")}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}
