import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Slop Detector — Is Your Website AI Slop?",
  description:
    "Paste a URL and get an instant AI slop score. Detect generic AI-generated design patterns, copy clichés, and template fatigue.",
  openGraph: {
    title: "Slop Detector — Is Your Website AI Slop?",
    description:
      "Paste a URL and get an instant AI slop score. Detect generic AI-generated design patterns, copy clichés, and template fatigue.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
