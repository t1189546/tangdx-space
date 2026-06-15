import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://tangdx.space"),
  title: {
    default: "Tang's Space",
    template: "%s | Tang's Space",
  },
  description:
    "A personal archive of real journeys, imaginary worlds, images, memories, and fragments of thought.",
  openGraph: {
    title: "Tang's Space",
    description:
      "A personal archive of real journeys, imaginary worlds, images, memories, and fragments of thought.",
    url: "https://tangdx.space",
    siteName: "Tang's Space",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}