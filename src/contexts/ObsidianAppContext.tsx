import { createContext, useContext, type ReactNode } from "react";
import type { App } from "obsidian";

const ObsidianAppContext = createContext<App | null>(null);

export function ObsidianAppProvider({ app, children }: { app: App; children: ReactNode }) {
  return <ObsidianAppContext.Provider value={app}>{children}</ObsidianAppContext.Provider>;
}

export function useObsidianApp(): App {
  const app = useContext(ObsidianAppContext);
  if (!app) throw new Error("useObsidianApp must be used within ObsidianAppProvider");
  return app;
}
