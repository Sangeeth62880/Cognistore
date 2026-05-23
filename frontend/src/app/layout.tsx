import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Sidebar from "./components/Sidebar";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
  fallback: ["Inter", "system-ui", "sans-serif"],
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
  fallback: ["Courier New", "monospace"],
});

export const metadata: Metadata = {
  title: "NeuroStore - Intelligent Feature Store",
  description: "Production-grade platform for real-time machine learning features and model drift monitoring",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gradient-animate min-h-screen text-slate-100 font-sans`}
      >
        <div className="flex min-h-screen">
          {/* Sidebar */}
          <Sidebar />

          {/* Main Layout Area */}
          <div className="flex-1 pl-72 flex flex-col">
            {/* Topbar/Header */}
            <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-800/80 px-8 glass-panel backdrop-blur-md">
              <div className="flex items-center gap-4">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                  Cluster ID: default-us-east
                </span>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-xs text-slate-400 font-medium">System operational</span>
                </div>
              </div>
            </header>

            {/* Content Container */}
            <main className="flex-1 p-8">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
