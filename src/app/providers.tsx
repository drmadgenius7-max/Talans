"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { RegisterServiceWorker } from "./register-sw";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <RegisterServiceWorker />
      {children}
      <Toaster />
    </ThemeProvider>
  );
}
