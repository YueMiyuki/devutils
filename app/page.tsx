"use client";

import { useState, useEffect } from "react";
import { ToolSidebar } from "@/components/tool-sidebar";
import { TabBar } from "@/components/tab-bar";
import { ToolContent } from "@/components/tool-content";
import { SettingsDialog } from "@/components/settings-dialog";
import { useTabStore } from "@/lib/tab-store";

export default function Home() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { activeTabId, removeTab } = useTabStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isTauri = typeof window !== "undefined" && "__TAURI__" in window;
      // Check for Ctrl+W (Windows/Linux) or Cmd+W (Mac)
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
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Left Sidebar */}
      <ToolSidebar onOpenSettings={() => setSettingsOpen(true)} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Tab Bar */}
        <TabBar />

        {/* Tool Content Area */}
        <main className="flex-1 overflow-auto">
          <ToolContent />
        </main>
      </div>

      {/* Settings Dialog */}
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
