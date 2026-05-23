"use client";

import React from "react";
import Dashboard from "../components/Dashboard";

export default function Home() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col rounded-2xl glass-panel p-8 glow-indigo relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 h-32 w-32 rounded-full bg-violet-500/10 blur-2xl" />
        <div className="space-y-2 relative z-10">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Intelligent Feature Store Dashboard
          </h1>
          <p className="text-slate-400 text-sm max-w-xl">
            Real-time telemetry showing live database metrics, Upstash serving speeds, active drift indicators, and streaming audit events.
          </p>
        </div>
      </div>
      <Dashboard />
    </div>
  );
}
