"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Screen {
  emoji: string;
  title: string;
  body: string;
}

export function OnboardingCarousel({ screens }: { screens: Screen[] }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const isLast = step === screens.length - 1;
  const screen = screens[step]!;

  return (
    <div className="w-full max-w-sm text-center">
      <div className="mb-8 text-7xl">{screen.emoji}</div>
      <h1 className="text-2xl font-black">{screen.title}</h1>
      <p className="mt-3 text-muted-foreground">{screen.body}</p>

      <div className="mt-8 flex items-center justify-center gap-1.5">
        {screens.map((_, i) => (
          <span key={i} className={cn("h-1.5 rounded-full transition-all", i === step ? "w-6 bg-primary" : "w-1.5 bg-muted")} />
        ))}
      </div>

      <div className="mt-8 space-y-2">
        {isLast ? (
          <Button size="lg" className="w-full" onClick={() => router.push("/dashboard")}>
            ابدأ الآن
          </Button>
        ) : (
          <Button size="lg" className="w-full" onClick={() => setStep((s) => s + 1)}>
            التالي
          </Button>
        )}
        {!isLast && (
          <button onClick={() => router.push("/dashboard")} className="text-sm text-muted-foreground underline">
            تخطي
          </button>
        )}
      </div>
    </div>
  );
}
