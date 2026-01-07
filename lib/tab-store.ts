import { create } from "zustand";
import { persist } from "zustand/middleware";

interface Tab {
  id: string;
  toolId: string;
  title: string;
  state?: Record<string, unknown>;
}

interface TabStore {
  tabs: Tab[];
  activeTabId: string | null;
  addTab: (toolId: string, title: string) => string;
  openOrFocusTab: (toolId: string, title: string) => string;
  removeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  updateTabState: (id: string, state: Record<string, unknown>) => void;
  updateTabTitle: (id: string, title: string) => void;
}

export const useTabStore = create<TabStore>()(
  persist(
    (set, get) => ({
      tabs: [],
      activeTabId: null,
      addTab: (toolId: string, title: string) => {
        const id = `${toolId}-${Date.now()}`;
        set((state) => ({
          tabs: [...state.tabs, { id, toolId, title }],
          activeTabId: id,
        }));
        return id;
      },
      openOrFocusTab: (toolId: string, title: string) => {
        const { tabs, setActiveTab, addTab } = get();
        const existingTab = tabs.find((t) => t.toolId === toolId);
        if (existingTab) {
          setActiveTab(existingTab.id);
          return existingTab.id;
        }
        return addTab(toolId, title);
      },
      removeTab: (id: string) => {
        set((state) => {
          const newTabs = state.tabs.filter((t) => t.id !== id);
          let newActiveId = state.activeTabId;
          if (state.activeTabId === id) {
            const idx = state.tabs.findIndex((t) => t.id === id);
            newActiveId = newTabs[idx]?.id || newTabs[idx - 1]?.id || null;
          }
          return { tabs: newTabs, activeTabId: newActiveId };
        });
      },
      setActiveTab: (id: string) => {
        set({ activeTabId: id });
      },
      updateTabState: (id: string, newState: Record<string, unknown>) => {
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === id ? { ...t, state: { ...t.state, ...newState } } : t,
          ),
        }));
      },
      updateTabTitle: (id: string, title: string) => {
        set((state) => ({
          tabs: state.tabs.map((t) => (t.id === id ? { ...t, title } : t)),
        }));
      },
    }),
    {
      name: "swiss-blade-tabs",
    },
  ),
);
