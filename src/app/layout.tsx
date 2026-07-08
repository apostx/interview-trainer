import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { BottomNav, SidebarNav } from "@/components/Nav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Interview Trainer",
  description:
    "Local-first, speech-driven technical interview simulator for developer and architect interviews.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
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
      <head>
        {/* Injects COOP/COEP via a service worker so crossOriginIsolated
            holds on static hosting — unlocking multithreaded WASM, which
            makes local Whisper several times faster. Production only: the
            COEP headers break the dev server's HMR socket and cause a
            reload loop. */}
        {process.env.NODE_ENV === "production" && (
          // eslint-disable-next-line @next/next/no-sync-scripts
          <script src="/coi-serviceworker.min.js" />
        )}
      </head>
      <body className="min-h-dvh">
        <div className="flex min-h-dvh">
          <SidebarNav />
          <main className="min-w-0 flex-1 pb-24 md:pb-10 print:pb-0">{children}</main>
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
