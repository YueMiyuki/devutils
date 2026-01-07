import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SpinResult {
  id: string;
  timestamp: string;
  result: "deploy" | "rickroll";
  survived: boolean;
}

interface DeployStats {
  deploys: number;
  rickrolls: number;
}

interface DeployStatsStore {
  history: SpinResult[];
  stats: DeployStats;
  directory: string;
  deployCommand: string;
  addResult: (result: "deploy" | "rickroll") => void;
  setDirectory: (directory: string) => void;
  setDeployCommand: (command: string) => void;
  clearHistory: () => void;
  resetStats: () => void;
}

export const useDeployStatsStore = create<DeployStatsStore>(
  // @ts-expect-error - Zustand persist middleware type inference issue
  persist(
    (set) => ({
      history: [],
      stats: { deploys: 0, rickrolls: 0 },
      directory: "./",
      deployCommand: "npm run deploy:staging",
      addResult: (result: "deploy" | "rickroll") => {
        const newResult: SpinResult = {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleTimeString(),
          result,
          survived: result === "deploy",
        };
        set((state) => ({
          history: [newResult, ...state.history.slice(0, 9)],
          stats: {
            deploys: state.stats.deploys + (result === "deploy" ? 1 : 0),
            rickrolls: state.stats.rickrolls + (result === "rickroll" ? 1 : 0),
          },
        }));
      },
      setDirectory: (directory: string) => set({ directory }),
      setDeployCommand: (command: string) => set({ deployCommand: command }),
      clearHistory: () => set({ history: [] }),
      resetStats: () =>
        set({ stats: { deploys: 0, rickrolls: 0 }, history: [] }),
    }),
    {
      name: "deploy-roulette-stats",
    },
  ),
);
