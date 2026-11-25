"use client";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

const TAGLINE = "A Enviroment of Creative-Bots";

export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [typedCount, setTypedCount] = useState(0);
  const splashRef = useRef<HTMLDivElement>(null);
  const brandRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = splashRef.current;
    const brand = brandRef.current;
    if (!el || !brand) return;

    // Fade in the app icon & MaDbotS logo
    gsap.fromTo(
      brand,
      { opacity: 0, scale: 0.94 },
      { opacity: 1, scale: 1, duration: 0.55, ease: "power2.out" }
    );

    // Typewriter effect for the pixel-font tagline
    let index = 0;
    let typeTimer: ReturnType<typeof setInterval> | null = null;
    let closeTimer: ReturnType<typeof setTimeout> | null = null;

    const startDelay = setTimeout(() => {
      typeTimer = setInterval(() => {
        index += 1;
        setTypedCount(index);
        if (index >= TAGLINE.length) {
          if (typeTimer) clearInterval(typeTimer);
          closeTimer = setTimeout(() => {
            gsap.to(el, {
              opacity: 0,
              duration: 0.4,
              ease: "power2.out",
              onComplete: () => setVisible(false),
            });
          }, 550);
        }
      }, 38);
    }, 280);

    return () => {
      clearTimeout(startDelay);
      if (typeTimer) clearInterval(typeTimer);
      if (closeTimer) clearTimeout(closeTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      ref={splashRef}
      aria-hidden="true"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[var(--ui-bg)] px-6 select-none pointer-events-auto"
    >
      <div
        ref={brandRef}
        className="flex flex-col items-center gap-3 opacity-0"
      >
        <img
          src="/icon-512.jpg"
          alt="MaDbotS"
          className="w-24 h-24 rounded-[26px] object-cover shadow-md border border-zinc-300 dark:border-zinc-700"
        />
        <span
          className="font-black text-3xl tracking-tighter font-headline text-[#22439E] dark:text-[#5b82e8]"
        >
          MaDbotS<span className="text-[#FF2B85] font-black">*</span>
        </span>
      </div>

      <p
        className="mt-3 text-[12px] sm:text-[13px] tracking-tight text-center min-h-[20px] text-[#22439E]/90 dark:text-[#5b82e8]"
        style={{ fontFamily: "'Silkscreen', monospace" }}
      >
        {TAGLINE.slice(0, typedCount)}
        <span className="inline-block w-2 ml-0.5 animate-pulse">_</span>
      </p>
    </div>
  );
}
