"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

export default function TopBar() {
  const pathname = usePathname();

  // Generate clean breadcrumb crumbs from url pathname
  const getBreadcrumbs = () => {
    const paths = pathname.split("/").filter((p) => p);
    if (paths.length === 0) {
      return (
        <span className="text-sm font-medium text-[#6b7280]">
          Cognistore <span className="mx-1 text-[#e5e7eb] font-normal">/</span> <span className="text-[#111111]">Dashboard</span>
        </span>
      );
    }

    return (
      <span className="text-sm font-medium text-[#6b7280] flex items-center">
        <Link href="/" className="hover:text-[#111111]">Cognistore</Link>
        {paths.map((p, idx) => {
          const href = "/" + paths.slice(0, idx + 1).join("/");
          const isLast = idx === paths.length - 1;
          const label = p.charAt(0).toUpperCase() + p.slice(1);
          return (
            <React.Fragment key={idx}>
              <span className="mx-1.5 text-[#e5e7eb] font-normal">/</span>
              {isLast ? (
                <span className="text-[#111111] font-semibold">{label}</span>
              ) : (
                <Link href={href} className="hover:text-[#111111]">{label}</Link>
              )}
            </React.Fragment>
          );
        })}
      </span>
    );
  };

  return (
    <header className="sticky top-0 z-10 flex h-12 items-center justify-between border-b border-[#e5e7eb] px-6 bg-white shrink-0">
      {/* Dynamic Breadcrumbs */}
      <div className="flex items-center">
        {getBreadcrumbs()}
      </div>

      {/* Operational Status Dot & Text */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#10b981]" />
          <span className="text-xs text-[#6b7280] font-normal font-sans">
            Operational
          </span>
        </div>
      </div>
    </header>
  );
}
