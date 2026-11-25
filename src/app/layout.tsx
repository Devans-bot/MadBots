import type { Metadata } from "next";
import "./globals.css";
import { SettingsProvider } from "@/lib/settings";

export const metadata: Metadata = {
  title: "MaDbotS",
  description: "MaDbotS Prototyping Platform",
};

// Applies the saved theme before first paint
const themeScript = `try{var s=JSON.parse(localStorage.getItem("madbots:settings")||"null");var d=s?s.theme==="dark":matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.classList.add("dark")}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=Inter:wght@400;500;600;700&family=Poppins:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-white text-zinc-950 flex flex-col min-h-screen antialiased select-none font-sans">
        <SettingsProvider>{children}</SettingsProvider>
      </body>
    </html>
  );
}
