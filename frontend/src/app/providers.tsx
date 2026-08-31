"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            className: "glass-strong",
            style: { background: "hsl(var(--card))", color: "hsl(var(--card-foreground))" },
            duration: 4000,
          }}
        />
      </ThemeProvider>
    </SessionProvider>
  );
}