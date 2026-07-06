import type { Metadata } from "next";
import { Fraunces, Instrument_Sans } from "next/font/google";
import "./globals.css";
import { SessionProviderWrapper } from "./SessionProviderWrapper";

// Display face: variable, with quirky optical-size personality axes (SOFT).
// Set variation-settings in CSS where used.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

// Body face: variable sans, slightly more character than Inter.
const instrument = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Taste-Trip — a discovery map for listeners the algorithm has stopped surprising",
  description:
    "A discovery agent that reads your taste, marks the gaps, and finds real Spotify tracks to fill them.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${instrument.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <SessionProviderWrapper>{children}</SessionProviderWrapper>
      </body>
    </html>
  );
}
