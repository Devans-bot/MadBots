"use client";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const splashRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = splashRef.current;
    if (!el) return;

    const timer = setTimeout(() => {
      gsap.to(el, {
        opacity: 0,
        duration: 0.35,
        ease: "power2.out",
        onComplete: () => setVisible(false),
      });
    }, 380);

    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      ref={splashRef}
      aria-hidden="true"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[var(--ui-bg)] text-[var(--ui-text)] select-none pointer-events-auto"
    >
      <div className="flex items-center gap-0.5 animate-pulse">
        <span className="font-black text-3xl tracking-tighter font-headline">
          MaDbotS<span className="text-[#FF2B85] font-black">*</span>
        </span>
      </div>
    </div>
  );
}
