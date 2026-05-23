"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface SidebarProps {}

export default function Sidebar({}: SidebarProps) {
  const pathname = usePathname();

  const navigation = [
    { name: "Dashboard", href: "/" },
    { name: "Features", href: "/features" },
    { name: "Datasets", href: "/datasets" },
    { name: "Models", href: "/models" },
    { name: "Alerts", href: "/alerts" },
    { name: "Health Status", href: "/health" },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-[220px] flex-col bg-[#0a0a0a] border-r border-[#1f1f1f]">
      {/* Brand Header */}
      <div className="flex h-12 items-center px-6 border-b border-[#1f1f1f]">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#e8e8e8]">
            NEUROSTORE
          </span>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 space-y-[2px]">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`relative flex items-center h-9 px-6 text-[13px] font-medium transition-colors duration-150 ${
                isActive
                  ? "text-[#e8e8e8] bg-[#111111]"
                  : "text-[#666666] hover:text-[#e8e8e8] hover:bg-[#111111]/30"
              }`}
            >
              {/* 2px left accent bar on active state */}
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#2563eb]" />
              )}
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-[#1f1f1f]">
        <div className="flex items-center gap-2 px-3 py-2 rounded-[4px] bg-[#111111] border border-[#1f1f1f]">
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-mono font-semibold text-[#e8e8e8] truncate">
              ADMINISTRATOR
            </span>
            <span className="text-[9px] font-mono text-[#444444] truncate">
              V1.0.0 (STABLE)
            </span>
          </div>
        </div>
      </div>
    </aside>
  );
}
