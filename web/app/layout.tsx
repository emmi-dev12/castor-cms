import type { Metadata } from "next";
import { Alfa_Slab_One, Archivo, Caveat, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Marketing-only faces (the editor and client sites keep Geist). Self-hosted
// by next/font — no runtime request to Google. Alfa Slab One carries the
// landing page's sign-painted, stencil-cut headline voice; Caveat is the
// grease-pencil hand for short tape labels only, never body copy; Archivo is
// the workshop order-form body face.
const displayFace = Alfa_Slab_One({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400"],
});

const handFace = Caveat({
  variable: "--font-hand",
  subsets: ["latin"],
  weight: ["500", "700"],
});

const bodyFace = Archivo({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
      className={`${geistSans.variable} ${geistMono.variable} ${displayFace.variable} ${handFace.variable} ${bodyFace.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
