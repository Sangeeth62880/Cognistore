"use client";

import React from "react";
import Dashboard from "../../components/Dashboard";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white hidden">
          Dashboard
        </h1>
      </div>
      <Dashboard />
    </div>
  );
}
