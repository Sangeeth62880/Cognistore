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
      connected: { label: "CONNECTED", bg: "bg-[#10b981]" },
      connecting: { label: "CONNECTING", bg: "bg-[#f59e0b]" },
      disconnected: { label: "OFFLINE", bg: "bg-[#ef4444]" },
    };
    const current = statuses[connectionStatus] || statuses.disconnected;

    return (
      <div className="flex items-center gap-1.5 font-sans text-[11px] text-[#6b7280]">
        <span className={`h-1.5 w-1.5 rounded-full ${current.bg}`} />
        <span>{current.label}</span>
      </div>
    );
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="bg-white border border-[#e5e7eb] rounded-[12px] p-4 flex flex-col h-[350px] font-sans shadow-none"
    >
      {/* Header */}
      <div className="flex justify-between items-center border-b border-[#e5e7eb] pb-2 shrink-0">
        <span className="text-[11px] font-medium text-[#6b7280] tracking-widest uppercase font-sans">
          Live Serve Feed
        </span>
        {connectionIndicator()}
      </div>

      {/* Events Streams Console */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto pr-1 py-2 space-y-[4px] scrollbar-thin scrollbar-thumb-slate-200"
      >
        {events.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-[#6b7280] text-[12px]">
            {connectionStatus === "connecting"
              ? "Connecting to serving websocket..."
              : "No system serving traffic recorded."}
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
                className="py-1.5 px-2 hover:bg-[#f9fafb] border-b border-[#f3f4f6] flex justify-between items-center text-[13px]"
              >
                <div className="flex items-center gap-2 truncate min-w-0">
                  <span className="text-[#6b7280] shrink-0 font-sans text-xs">{timeStr}</span>
                  <span className="text-[#111111] font-medium font-sans truncate text-[14px]">
                    {evt.feature_name}
                  </span>
                  <span className="text-[#6b7280] shrink-0 text-xs font-mono">
                    id:{evt.entity_id}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0 pl-2">
                  <span className="bg-[#f1f5f9] text-[#475569] rounded-full px-2 py-0.5 text-[10px] font-medium font-sans uppercase tracking-wider">
                    {isCache ? "CACHE" : "DB"}
                  </span>
                  <span className="text-[#2563eb] font-mono text-[13px] font-semibold">
                    {evt.latency_ms.toFixed(1)}ms
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>


      {hovered && events.length > 0 && (
        <div className="text-[10px] text-[#6b7280] text-center pt-2 border-t border-[#e5e7eb] tracking-widest font-medium shrink-0">
          STREAM PAUSED
        </div>
      )}
    </div>
  );
}
