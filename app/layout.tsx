import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FundedCore — The AI-Native Prop Firm",
  description:
    "No challenge fees. No $500 upfront. Connect your trading history, get a verified Trader Score, and get funded directly. Keep up to 90% of profits — you only pay when you win.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="grid-bg" />
        <div className="glow glow-1" />
        <div className="glow glow-2" />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
