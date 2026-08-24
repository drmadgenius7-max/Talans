"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="top-center"
      dir="rtl"
      richColors
      toastOptions={{
        classNames: {
          toast: "font-sans rounded-xl",
        },
      }}
    />
  );
}

export { toast } from "sonner";
