import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FundedCore — The Pre-Trade Risk Firewall for Funded Traders",
  description: "Stop the trade that blows your account. Expose the behavior destroying you. Prove what to cut and what to scale.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="grid-bg" /><div className="glow glow-1" /><div className="glow glow-2" />
        <div className="relative z-10">{children}</div>
      </body>
    </html>
  );
}
