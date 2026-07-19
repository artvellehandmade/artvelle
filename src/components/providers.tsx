"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { CartProvider } from "@/context/cart";
import { SettingsProvider } from "@/context/settings";
import type { SettingsDTO } from "@/lib/types";

export function Providers({
  settings,
  children,
}: {
  settings: SettingsDTO;
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      <SettingsProvider value={settings}>
        <CartProvider>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "var(--card)",
                color: "var(--foreground)",
                border: "1px solid var(--border)",
              },
            }}
          />
        </CartProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}
