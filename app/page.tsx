"use client";

import { useState, useEffect, useRef } from "react";
import { ToolSidebar } from "@/components/tool-sidebar";
import { TabBar } from "@/components/tab-bar";
import { ToolContent } from "@/components/tool-content";
import { SettingsDialog } from "@/components/settings-dialog";
import { useTabStore } from "@/lib/tab-store";
import { incrementClicks } from "@/lib/click-tracker";
import { CommandPalette } from "@/components/command-palette";
import { cn } from "@/lib/utils";

export default function Home() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { activeTabId, removeTab } = useTabStore();
  const mainRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const mainEl = mainRef.current;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest?.("[data-ignore-click-saver]")) return;
      incrementClicks(1);
    };
    mainEl?.addEventListener("click", handleClick);

    return () => {
      mainEl?.removeEventListener("click", handleClick);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isTauri = typeof window !== "undefined" && "__TAURI__" in window;
      if ((e.ctrlKey || e.metaKey) && e.key === "w") {
        if (isTauri) {
          e.preventDefault();
          if (activeTabId) {
            removeTab(activeTabId);
          }
        }
      }
    };

    // Close handler
    let unlisten: (() => void) | undefined;
    let isCleanedUp = false;

    const setupTauriCloseHandler = async () => {
      const tauriAvailable =
        typeof window !== "undefined" && "__TAURI__" in window;

      if (!tauriAvailable) return;

      try {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        const { ask } = await import("@tauri-apps/plugin-dialog");

        const appWindow = getCurrentWindow();

        const listener = await appWindow.onCloseRequested(async (event) => {
          event.preventDefault();
          const confirmed = await ask("Are you sure you want to quit?", {
            title: "Confirm Exit",
            kind: "warning",
          });

          if (confirmed) {
            appWindow.close();
          }
        });

        // Only set unlisten if component not cleaned up
        if (!isCleanedUp) {
          unlisten = listener;
        } else {
          listener();
        }
      } catch (error) {
        console.error("Failed to setup Tauri close handler:", error);
      }
    };

    setupTauriCloseHandler();

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      isCleanedUp = true;
      window.removeEventListener("keydown", handleKeyDown);
      if (unlisten) {
        unlisten();
      }
    };
  }, [activeTabId, removeTab]);

  return (
    <div
      className={cn(
        "flex h-screen overflow-hidden bg-background",
        "transition-opacity duration-500",
        mounted ? "opacity-100" : "opacity-0",
      )}
    >
      {/* Subtle background pattern */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-50"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--foreground) / 0.015) 1px, transparent 0)`,
          backgroundSize: "40px 40px",
        }}
      />

      {/* Left Sidebar */}
      <div className="relative z-10">
        <ToolSidebar onOpenSettings={() => setSettingsOpen(true)} />
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-1 flex-col overflow-hidden">
        {/* Tab Bar */}
        <TabBar />
        <CommandPalette />

        {/* Tool Content Area */}
        <main
          ref={mainRef}
          className="flex-1 overflow-auto bg-background/50 backdrop-blur-sm"
        >
          <ToolContent />
        </main>
      </div>

      {/* Settings Dialog */}
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
