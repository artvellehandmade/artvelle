"use client";

import { createContext, useContext } from "react";
import type { SettingsDTO } from "@/lib/types";

const SettingsContext = createContext<SettingsDTO | null>(null);

export function SettingsProvider({
  value,
  children,
}: {
  value: SettingsDTO;
  children: React.ReactNode;
}) {
  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsDTO {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
