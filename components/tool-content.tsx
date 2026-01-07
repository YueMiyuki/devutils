"use client";

import type React from "react";

import { useTabStore } from "@/lib/tab-store";
import { CurlConverter } from "@/components/tools/curl-converter";
import { JwtDecoder } from "@/components/tools/jwt-decoder";
import { Base64Tool } from "@/components/tools/base64-tool";
import { DataConverter } from "@/components/tools/data-converter";
import { BlameIntern } from "@/components/tools/blame-intern";
import { DeployRoulette } from "@/components/tools/deploy-roulette";
import { BossMode } from "@/components/tools/boss-mode";
import { Wrench } from "lucide-react";

const toolComponents: Record<string, React.ComponentType<{ tabId: string }>> = {
  "curl-converter": CurlConverter,
  "jwt-decoder": JwtDecoder,
  base64: Base64Tool,
  "json-csv": DataConverter,
  "blame-intern": BlameIntern,
  "deploy-roulette": DeployRoulette,
  "boss-mode": BossMode,
};

export function ToolContent() {
  const { tabs, activeTabId } = useTabStore();
  const activeTab = tabs.find((t) => t.id === activeTabId);

  if (!activeTab) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
        <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center">
          <Wrench className="w-10 h-10" />
        </div>
        <div className="text-center">
          <h2 className="text-lg font-semibold text-foreground mb-1">
            No tool selected
          </h2>
          <p className="text-sm">
            Select a tool from the sidebar or open a new tab to get started
          </p>
        </div>
      </div>
    );
  }

  const ToolComponent = toolComponents[activeTab.toolId];

  if (!ToolComponent) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Tool not found: {activeTab.toolId}
      </div>
    );
  }

  return <ToolComponent tabId={activeTab.id} />;
}
