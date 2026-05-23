"use client";

import React, { useState, useEffect, useRef } from "react";

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

  useEffect(() => {
    if (!hovered && containerRef.current) {
      containerRef.current.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }, [events, hovered]);

  const connectionIndicator = () => {
    const statuses: Record<string, { label: string; bg: string }> = {
      connected: { label: "CONNECTED", bg: "bg-[#16a34a]" },
      connecting: { label: "CONNECTING", bg: "bg-[#d97706]" },
      disconnected: { label: "OFFLINE", bg: "bg-[#dc2626]" },
    };
    const current = statuses[connectionStatus] || statuses.disconnected;

    return (
      <div className="flex items-center gap-1.5 font-mono text-[9px] text-[#666666] tracking-wider">
        <span className={`h-1.5 w-1.5 rounded-full ${current.bg}`} />
        <span>{current.label}</span>
      </div>
    );
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="bg-[#111111] border border-[#1f1f1f] rounded-[4px] p-4 flex flex-col h-[350px] font-mono"
    >
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[#1f1f1f] pb-2 shrink-0">
        <span className="text-[11px] font-bold text-[#666666] tracking-widest">
          LIVE SERVE TELEMETRY
        </span>
        {connectionIndicator()}
      </div>

      {/* Events Streams Console */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto pr-1 py-2 space-y-[4px] text-[12px] leading-relaxed scrollbar-thin scrollbar-thumb-slate-800"
      >
        {events.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-[#444444] text-[11px]">
            {connectionStatus === "connecting"
              ? "CONNECTING TO SERVING WEBSOCKET..."
              : "NO SYSTEM TRAFFIC DETECTED."}
          </div>
        ) : (
          events.map((evt, idx) => {
            const isCache = evt.source.toLowerCase() === "cache";
            
            // Format time as hh:mm:ss
            let timeStr = "";
            try {
              const dt = new Date(evt.timestamp);
              timeStr = dt.toTimeString().split(" ")[0];
            } catch (_) {
              timeStr = "--:--:--";
            }

            return (
              <div
                key={idx}
                className="py-1.5 px-2 hover:bg-[#161616] border-b border-[#1f1f1f]/50 flex justify-between items-center text-[11px]"
              >
                <div className="flex items-center gap-2 truncate min-w-0">
                  <span className="text-[#444444] shrink-0 font-semibold">{timeStr}</span>
                  <span className="text-[#e8e8e8] font-semibold truncate">
                    {evt.feature_name}
                  </span>
                  <span className="text-[#444444] shrink-0">
                    id:{evt.entity_id}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0 pl-2">
                  <span className={`text-[10px] uppercase font-bold ${isCache ? "text-[#16a34a]" : "text-[#d97706]"}`}>
                    {isCache ? "CACHE" : "DB"}
                  </span>
                  <span className="text-[#a3e635] font-semibold">
                    {evt.latency_ms.toFixed(1)}ms
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {hovered && events.length > 0 && (
        <div className="text-[9px] text-[#444444] text-center pt-2 border-t border-[#1f1f1f] tracking-widest font-semibold">
          CONSOLE STREAM PAUSED
        </div>
      )}
    </div>
  );
}
