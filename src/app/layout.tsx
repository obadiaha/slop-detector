import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "InstaReach — Managed Instagram Creator Outreach",
  description:
    "API-first, HeyReach-style Instagram DM outreach. Submit targets and a message; the platform handles sending, dedup, rate limits, replies, and reporting.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 min-w-0 px-6 py-8 md:px-10">{children}</main>
        </div>
      </body>
    </html>
  );
}
