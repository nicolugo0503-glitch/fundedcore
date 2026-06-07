import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FundedCore — The AI-Native Prop Firm",
  description:
    "No challenge fees. No $500 upfront. Connect your trading history, get a verified Trader Score, and get funded directly. Keep up to 90% of profits — you only pay when you win.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = { themeColor: "#020817" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "(function(){try{var t=localStorage.getItem('fc-theme');if(!t){t=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();" }} />
      </head>
      <body>
        <div className="grid-bg" />
        <div className="glow glow-1" />
        <div className="glow glow-2" />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
