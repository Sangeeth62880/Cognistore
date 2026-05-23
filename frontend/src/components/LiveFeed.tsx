"use client";

import React, { useState, useEffect, useRef } from "react";
import { RefreshCw, Radio, CheckCircle, Database, Zap } from "lucide-react";

interface ServingEvent {
  timestamp: string;
  feature_id: string;
  feature_name: string;
  entity_id: string;
  latency_ms: number;
  status_code: number;
  source: string;
}

interface LiveFeedProps {
  events: ServingEvent[];
  connectionStatus: "connected" | "connecting" | "disconnected";
}

export default function LiveFeed({ events, connectionStatus }: LiveFeedProps) {
  const [hovered, setHovered] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logic: scroll to top since newest are loaded at index 0
  useEffect(() => {
    if (!hovered && containerRef.current) {
      containerRef.current.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }, [events, hovered]);

  const connectionBadge = () => {
    const configs: Record<string, { label: string; color: string; dotClass: string }> = {
      connected: {
        label: "Connected",
        color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        dotClass: "bg-emerald-400 animate-ping",
      },
      connecting: {
        label: "Syncing",
        color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        dotClass: "bg-amber-400 animate-pulse",
      },
      disconnected: {
        label: "Offline",
        color: "bg-rose-500/10 text-rose-400 border-rose-500/20",
        dotClass: "bg-rose-400",
      },
    };

    const cfg = configs[connectionStatus] || configs.disconnected;

    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase border tracking-wider transition ${cfg.color}`}
      >
        <span className="relative flex h-2 w-2">
          <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${cfg.dotClass}`}></span>
          <span className={`relative inline-flex rounded-full h-2 w-2 ${cfg.dotClass.split(" ")[0]}`}></span>
        </span>
        {cfg.label}
      </span>
    );
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="rounded-2xl glass-panel p-5 space-y-4 flex flex-col h-[380px] hover:border-slate-800/80 transition-colors"
    >
      {/* Title block */}
      <div className="flex justify-between items-center border-b border-slate-900 pb-3 shrink-0">
        <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
          <Radio className="h-4 w-4 text-rose-500 animate-pulse" /> Live Telemetry Feed
        </h3>
        {connectionBadge()}
      </div>

      {/* Auto-scrolling Timeline area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto pr-1 space-y-3 scrollbar-thin scrollbar-thumb-slate-800"
      >
        {events.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 text-[11px]">
            {connectionStatus === "connecting" ? (
              <>
                <RefreshCw className="h-5 w-5 animate-spin text-amber-500 mb-2" />
                Listening for microservice serve traffic...
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5 text-slate-700 mb-1" />
                No serving requests detected yet.
              </>
            )}
          </div>
        ) : (
          events.map((evt, idx) => {
            const isCache = evt.source.toLowerCase() === "cache";
            return (
              <div
                key={idx}
                className="p-3 bg-slate-950/40 hover:bg-slate-900/30 border border-slate-900 hover:border-slate-850 rounded-xl text-[11px] leading-relaxed transition-all duration-300 flex justify-between items-center gap-4 animate-in slide-in-from-top-2 duration-300"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Database className="h-3 w-3 text-cyan-400 shrink-0" />
                    <span className="font-bold text-slate-200 font-mono truncate block">
                      {evt.feature_name}
                    </span>
                  </div>
                  <div className="text-slate-500 flex items-center gap-1 font-mono text-[9px]">
                    entity: <span className="text-slate-400">{evt.entity_id}</span>
                  </div>
                </div>

                <div className="text-right shrink-0 space-y-1">
                  <span
                    className={`inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold font-mono border ${
                      isCache
                        ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/15"
                        : "bg-amber-500/10 text-amber-450 border-amber-500/15"
                    }`}
                  >
                    {isCache ? (
                      <>
                        <CheckCircle className="h-2.5 w-2.5" /> cache
                      </>
                    ) : (
                      <>
                        <Zap className="h-2.5 w-2.5" /> db
                      </>
                    )}
                  </span>
                  
                  <div className="text-[10px] font-bold text-slate-300 font-mono">
                    {evt.latency_ms.toFixed(1)} ms
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {hovered && events.length > 0 && (
        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 text-center shrink-0 animate-pulse">
          Timeline Paused (Release hover to resume scrolling)
        </span>
      )}
    </div>
  );
}
