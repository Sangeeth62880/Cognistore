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
    <aside className="fixed inset-y-0 left-0 z-20 flex w-[220px] flex-col bg-white border-r border-[#e5e7eb]">
      {/* Brand Header Logo */}
      <div className="pt-6 pb-4 px-6 flex items-center shrink-0">
        <Link href="/" className="flex items-center">
          <span className="font-sans text-[18px] font-bold tracking-tight text-[#111111]">
            Cognistore
          </span>
        </Link>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 space-y-[2px] shrink-0">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`relative flex items-center h-10 px-6 text-[14px] font-medium transition-colors duration-150 ${
                isActive
                  ? "text-[#111111] bg-[#f5f5f5] font-semibold"
                  : "text-[#374151] hover:text-[#111111] hover:bg-[#f8f9fa]"
              }`}
            >
              {/* 2px left solid accent border on active state */}
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-[#111111]" />
              )}
              {item.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
