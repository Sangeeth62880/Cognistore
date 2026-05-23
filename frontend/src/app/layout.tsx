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
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0a0a0a] min-h-screen text-[#e8e8e8] font-sans`}
      >
        <div className="flex min-h-screen">
          {/* Sidebar */}
          <Sidebar />

          {/* Main Layout Area */}
          <div className="flex-1 pl-[220px] flex flex-col">
            {/* Topbar/Header */}
            <header className="sticky top-0 z-10 flex h-12 items-center justify-between border-b border-[#1f1f1f] px-6 bg-[#0a0a0a]">
              <div className="flex items-center gap-4">
                <span className="text-[11px] font-mono text-[#666666] uppercase tracking-wider">
                  Cluster ID: default-us-east
                </span>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#16a34a]" />
                  <span className="text-[11px] text-[#666666] font-mono uppercase tracking-wider">Operational</span>
                </div>
              </div>
            </header>

            {/* Content Container */}
            <main className="flex-1 p-6">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
