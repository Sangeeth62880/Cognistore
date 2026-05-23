import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";

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
  title: "Cognistore - Intelligent Feature Store",
  description: "Production-grade platform for real-time machine learning features and model drift monitoring",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-white min-h-screen text-[#111111] font-sans`}
      >
        <div className="flex min-h-screen bg-white">
          {/* Sidebar */}
          <Sidebar />

          {/* Main Layout Area */}
          <div className="flex-1 pl-[220px] flex flex-col bg-white">
            {/* Topbar/Header */}
            <TopBar />

            {/* Content Container */}
            <main className="flex-1 p-6 bg-white">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
