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
import { RegexTester } from "@/components/tools/regex-tester";
import { ColorPicker } from "@/components/tools/color-picker";
import { TimestampConverter } from "@/components/tools/timestamp-converter";
import { CronGenerator } from "@/components/tools/cron-generator";
import { HashGenerator } from "@/components/tools/hash-generator";
import { QRCodeTool } from "@/components/tools/qr-code-tool";
import { PortDetective } from "@/components/tools/port-detective";
import { SSLToothbrush } from "@/components/tools/ssl-toothbrush";
import { WebSocketFishScaler } from "@/components/tools/websocket-fish-scaler";
import { LoremTweezers } from "@/components/tools/lorem-ipsum-tweezers";
import { ASCIIArtCork } from "@/components/tools/ascii-art-cork";
import { ClickSaver } from "@/components/tools/click-saver";
import { JwtToothpick } from "@/components/tools/jwt-toothpick";
import { TcpUdpWhistle } from "@/components/tools/tcp-udp-whistle";
import { Wrench, Command, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const toolComponents: Record<string, React.ComponentType<{ tabId: string }>> = {
  "curl-converter": CurlConverter,
  "jwt-decoder": JwtDecoder,
  base64: Base64Tool,
  "json-csv": DataConverter,
  "blame-intern": BlameIntern,
  "deploy-roulette": DeployRoulette,
  "boss-mode": BossMode,
  "regex-tester": RegexTester,
  "color-picker": ColorPicker,
  "timestamp-converter": TimestampConverter,
  "cron-generator": CronGenerator,
  "hash-generator": HashGenerator,
  "qr-code": QRCodeTool,
  "port-detective": PortDetective,
  "ssl-toothbrush": SSLToothbrush,
  "websocket-fish": WebSocketFishScaler,
  "lorem-tweezers": LoremTweezers,
  "ascii-cork": ASCIIArtCork,
  "click-saver": ClickSaver,
  "jwt-toothpick": JwtToothpick,
  "tcp-whistle": TcpUdpWhistle,
};

export function ToolContent() {
  const { tabs, activeTabId } = useTabStore();
  const activeTab = tabs.find((t) => t.id === activeTabId);

  if (!activeTab) {
    return (
      <div
        className="
        relative flex h-full flex-col items-center justify-center gap-6
        overflow-hidden text-muted-foreground
      "
      >
        {/* Background pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage: `radial-gradient(circle at center, hsl(var(--foreground) / 0.03) 1px, transparent 1px)`,
            backgroundSize: "32px 32px",
          }}
        />

        {/* Radial gradient glow */}
        <div
          className="
          bg-linear-radial pointer-events-none absolute inset-0
          from-foreground/2 via-transparent to-transparent
        "
        />

        {/* Content */}
        <div
          className={cn(
            "relative flex flex-col items-center gap-6",
            "animate-content-fade-in",
          )}
        >
          {/* Icon container */}
          <div className="relative">
            <div
              className={cn(
                "size-24 rounded-3xl",
                "border border-foreground/5 bg-foreground/3",
                "flex items-center justify-center",
                "shadow-lg shadow-foreground/5",
              )}
            >
              <Wrench className="size-10 text-foreground/30" />
            </div>
            {/* Decorative rings */}
            <div
              className="
              pointer-events-none absolute -inset-4 rounded-4xl border
              border-foreground/3
            "
            />
            <div
              className="
              pointer-events-none absolute -inset-8 rounded-[2.5rem] border
              border-foreground/2
            "
            />
          </div>

          {/* Text */}
          <div className="space-y-2 text-center">
            <h2 className="text-xl font-semibold text-foreground/80">
              No tool selected
            </h2>
            <p className="max-w-sm text-sm text-muted-foreground/60">
              Select a tool from the sidebar or use the quick search
            </p>
          </div>

          {/* Keyboard hint */}
          <button
            type="button"
            onClick={() => {
              const event = new KeyboardEvent("keydown", {
                key: "k",
                metaKey: true,
                bubbles: true,
              });
              window.dispatchEvent(event);
            }}
            className={cn(
              "flex items-center gap-3 rounded-xl px-5 py-3",
              "border border-foreground/5 bg-foreground/3",
              "hover:border-foreground/10 hover:bg-foreground/5",
              "group cursor-pointer transition-all duration-200",
            )}
          >
            <div
              className="
              flex size-8 items-center justify-center rounded-lg bg-foreground/5
            "
            >
              <Command className="size-4 text-foreground/50" />
            </div>
            <span
              className="
              text-sm text-foreground/60 transition-colors
              group-hover:text-foreground/80
            "
            >
              Press{" "}
              <kbd
                className="
                mx-1 rounded-sm border border-foreground/10 bg-foreground/5
                px-1.5 py-0.5 font-mono text-[11px]
              "
              >
                K
              </kbd>{" "}
              to search
            </span>
            <ArrowRight
              className="
              size-4 text-foreground/30 transition-all
              group-hover:translate-x-1 group-hover:text-foreground/50
            "
            />
          </button>
        </div>
      </div>
    );
  }

  const ToolComponent = toolComponents[activeTab.toolId];

  if (!ToolComponent) {
    return (
      <div
        className="
        animate-content-fade-in flex h-full flex-col items-center justify-center
        gap-4 text-muted-foreground
      "
      >
        <div
          className="
          flex size-16 items-center justify-center rounded-2xl border
          border-foreground/5 bg-foreground/3
        "
        >
          <Wrench className="size-8 text-foreground/30" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground/60">
            Tool not found
          </p>
          <p className="mt-1 text-xs text-muted-foreground/50">
            {activeTab.toolId}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-content-fade-in h-full">
      <ToolComponent key={activeTab.id} tabId={activeTab.id} />
    </div>
  );
}
