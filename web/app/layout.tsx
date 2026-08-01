import type { Metadata } from "next";
import { Bricolage_Grotesque, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Display face for the marketing landing page only (the editor and client
// sites keep Geist). Self-hosted by next/font — no runtime request to Google.
const bricolage = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["800"],
});

export const metadata: Metadata = {
  // Resolves relative canonical/OpenGraph URLs (from per-page generateMetadata)
  // to absolute ones. Override with SITE_URL for a different deployment.
  metadataBase: new URL(process.env.SITE_URL ?? "https://castorcms.vercel.app"),
  title: "Castor",
  description: "Castor — hand clients the keys to their site, not the code.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
