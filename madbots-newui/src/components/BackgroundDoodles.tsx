export function BackgroundDoodles() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-45 dark:opacity-25 select-none"
    >
      {/* Pink diagonal slash */}
      <svg
        className="absolute top-[18%] right-8 lg:right-[14%] w-8 h-8 text-[#FF2B85] stroke-current fill-none stroke-[3]"
        strokeLinecap="round"
        viewBox="0 0 24 24"
      >
        <line x1="5" x2="19" y1="19" y2="5" />
      </svg>

      {/* Curved arrow */}
      <svg
        className="absolute bottom-12 right-4 lg:right-[12%] w-14 h-14 text-zinc-400 dark:text-zinc-500 stroke-current fill-none stroke-[1.5] rotate-12"
        viewBox="0 0 40 40"
      >
        <path
          d="M8 32 C 16 30, 24 24, 28 12 M20 10 L29 11 L28 20"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Hand-drawn robot character */}
      <svg
        className="absolute bottom-[28%] left-6 lg:left-[8%] w-20 h-20 text-zinc-400 dark:text-zinc-500 stroke-current fill-none -rotate-6"
        viewBox="0 0 64 64"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M32 10 L32 18" />
        <circle cx="32" cy="8" r="2.5" />
        <rect x="18" y="18" width="28" height="24" rx="6" ry="6" />
        <circle cx="26" cy="28" r="2.5" fill="currentColor" />
        <circle cx="38" cy="28" r="2.5" fill="currentColor" />
        <path d="M27 35 Q32 39 37 35" />
        <path d="M13 28 L18 28" />
        <path d="M46 28 L51 28" />
        <path d="M24 42 L24 48 L40 48 L40 42" />
      </svg>

      {/* Curly braces */}
      <svg
        className="absolute bottom-[36%] right-10 lg:right-[10%] w-12 h-12 text-zinc-400 dark:text-zinc-500 stroke-current fill-none rotate-12"
        viewBox="0 0 40 40"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 8 C10 8 9 12 9 15 C9 18 6 19 4 20 C6 21 9 22 9 25 C9 28 10 32 14 32" />
        <path d="M26 8 C30 8 31 12 31 15 C31 18 34 19 36 20 C34 21 31 22 31 25 C31 28 30 32 26 32" />
      </svg>

      {/* Speech bubble */}
      <svg
        className="absolute bottom-[16%] left-14 lg:left-[18%] w-16 h-16 text-zinc-400 dark:text-zinc-500 stroke-current fill-none rotate-3"
        viewBox="0 0 48 48"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M10 14 C10 9 14 6 24 6 C34 6 38 9 38 18 C38 27 34 30 24 30 C20 30 17 31 12 34 C13 31 13 29 12 28 C10 25 10 20 10 14 Z" />
        <circle cx="19" cy="18" r="1.5" fill="currentColor" />
        <circle cx="24" cy="18" r="1.5" fill="currentColor" />
        <circle cx="29" cy="18" r="1.5" fill="currentColor" />
      </svg>

      {/* Code tag brackets */}
      <svg
        className="absolute bottom-[9%] left-[44%] w-14 h-10 text-zinc-400 dark:text-zinc-500 stroke-current fill-none -rotate-12"
        viewBox="0 0 48 32"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 6 L4 16 L14 26" />
        <path d="M20 28 L28 4" />
        <path d="M34 6 L44 16 L34 26" />
      </svg>

      {/* Pink asterisk star */}
      <svg
        className="absolute bottom-[24%] right-[26%] w-7 h-7 text-[#FF2B85] stroke-current fill-none stroke-[2]"
        strokeLinecap="round"
        viewBox="0 0 24 24"
      >
        <path d="M12 2 L12 22 M2 12 L22 12 M5 5 L19 19 M5 19 L19 5" />
      </svg>

      {/* Four-point sparkle diamond */}
      <svg
        className="absolute bottom-[44%] left-[20%] w-5 h-5 text-zinc-400 dark:text-zinc-500 stroke-current fill-none stroke-[1.8]"
        strokeLinecap="round"
        viewBox="0 0 24 24"
      >
        <path d="M12 3 Q12 12 3 12 Q12 12 12 21 Q12 12 21 12 Q12 12 12 3 Z" />
      </svg>
    </div>
  );
}
