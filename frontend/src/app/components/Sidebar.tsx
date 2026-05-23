"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Cpu,
  Database,
  Brain,
  AlertTriangle,
  HeartPulse,
} from "lucide-react";

interface SidebarProps {}

export default function Sidebar({}: SidebarProps) {
  const pathname = usePathname();

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Features", href: "/features", icon: Cpu },
    { name: "Datasets", href: "/datasets", icon: Database },
    { name: "Models", href: "/models", icon: Brain },
    { name: "Alerts", href: "/alerts", icon: AlertTriangle },
    { name: "Health Status", href: "/health", icon: HeartPulse },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-72 flex-col glass-panel border-r border-slate-800">
      {/* Brand Logo Header */}
      <div className="flex h-16 items-center px-6 border-b border-slate-800/80">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600 text-white shadow-md shadow-violet-500/20">
            <Brain className="h-5 w-5" />
          </div>
          <span className="font-semibold text-lg tracking-wider text-slate-100 font-sans">
            NeuroStore
          </span>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1.5 px-4 py-6">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group ${
                isActive
                  ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20"
                  : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100"
              }`}
            >
              <Icon
                className={`h-5 w-5 transition-colors duration-200 ${
                  isActive ? "text-white" : "text-slate-400 group-hover:text-slate-100"
                }`}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800/80">
        <div className="flex items-center gap-3 px-2 py-1.5 rounded-xl bg-slate-900/50 border border-slate-800/30">
          <div className="relative flex h-8 w-8 shrink-0 rounded-full bg-slate-800 items-center justify-center text-xs font-semibold text-violet-400">
            IFS
            <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-slate-900" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold text-slate-200 truncate">
              Feature Store Admin
            </span>
            <span className="text-[10px] text-slate-500 truncate">
              v1.0.0 (Production)
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
