import type { Metadata } from "next";
import { Rajdhani, Oxanium } from "next/font/google";
import { Providers } from "@/components/layout/Providers";
import { AppShell } from "@/components/layout/AppShell";
import "./globals.css";

const rajdhani = Rajdhani({
  variable: "--font-rajdhani",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  display: "swap",
});

const oxanium = Oxanium({
  variable: "--font-oxanium",
  weight: ["500", "600", "700", "800"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ValoPicks — Valorant Fantasy League",
  description:
    "Draft your Valorant squad, compete in T1 & T2 fantasy leagues, climb the global leaderboard and challenge friends in community tournaments.",
  keywords: ["valorant", "fantasy", "esports", "VCT", "T1", "T2", "league"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${rajdhani.variable} ${oxanium.variable} antialiased`}>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
