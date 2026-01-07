"use client";

import { useState } from "react";
import { ToolSidebar } from "@/components/tool-sidebar";
import { TabBar } from "@/components/tab-bar";
import { ToolContent } from "@/components/tool-content";
import { SettingsDialog } from "@/components/settings-dialog";

export default function Home() {
  const [settingsOpen, setSettingsOpen] = useState(false);

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
