import type { Metadata, Viewport } from "next";
import "./globals.css";
import { SettingsProvider } from "@/lib/settings";
import { SplashScreen } from "@/components/SplashScreen";

export const metadata: Metadata = {
  title: "MaDbotS",
  description: "Your personal AI chatbots",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MaDbotS",
  },
  icons: {
    icon: "/icon-512.jpg",
    apple: "/icon-512.jpg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#141618" },
  ],
};

// Applies the saved theme & background color before first paint so refresh/load matches UI mode
const themeScript = `try{var s=JSON.parse(localStorage.getItem("madbots:settings")||"null");var d=s?s.theme==="dark":matchMedia("(prefers-color-scheme: dark)").matches;document.documentElement.classList.toggle("dark",d);document.documentElement.style.backgroundColor=d?"#141618":"#ffffff";var metas=document.querySelectorAll('meta[name="theme-color"]');metas.forEach(function(m){m.setAttribute("content",d?"#1c1f24":"#ffffff")})}catch(e){}`;

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
      <body className="bg-[var(--ui-bg)] text-[var(--ui-text)] flex flex-col min-h-dvh antialiased select-none font-sans">
        <SettingsProvider>
          <SplashScreen />
          {children}
        </SettingsProvider>
      </body>
    </html>
  );
}
