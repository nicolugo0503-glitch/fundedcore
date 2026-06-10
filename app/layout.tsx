import type { Metadata, Viewport } from "next";
import "./globals.css";
import { CardSpotlight } from "../components/CardSpotlight";
import { ParticleField } from "../components/ParticleField";

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
        <script dangerouslySetInnerHTML={{ __html: "(function(){try{var t=localStorage.getItem('fc-theme')||'light';document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();" }} />
      </head>
      <body>
        <div className="grid-bg" />
        <ParticleField />
        <div className="aura"><span className="a1" /><span className="a2" /><span className="a3" /><span className="a4" /></div>
        <CardSpotlight />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
