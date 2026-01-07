import { create } from "zustand";
import { persist } from "zustand/middleware";

interface BossModeSettings {
  isActive: boolean;
  panicKey: string;
}

interface SettingsStore {
  sidebarCollapsed: boolean;
  bossMode: BossModeSettings;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setBossModeActive: (isActive: boolean) => void;
  setBossModePanicKey: (panicKey: string) => void;
}

export const useSettingsStore = create<SettingsStore>(
  // @ts-expect-error - Zustand persist middleware type inference issue
  persist(
    (set) => ({
      sidebarCollapsed: false,
      bossMode: {
        isActive: false,
        panicKey: "Escape",
      },
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
      setBossModeActive: (isActive) =>
        set((state) => ({ bossMode: { ...state.bossMode, isActive } })),
      setBossModePanicKey: (panicKey) =>
        set((state) => ({ bossMode: { ...state.bossMode, panicKey } })),
    }),
    {
      name: "swiss-blade-settings",
    },
  ),
);
