"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import MetricsCards from "./MetricsCards";
import LiveFeed from "./LiveFeed";

export default function Dashboard() {
  const [metrics, setMetrics] = useState<any>({
    total_features: 0,
    total_models: 0,
    total_feature_values: 0,
    avg_serving_latency_ms: 0.0,
    active_alerts_count: 0,
    features_computed_last_24h: 0,
    cache_hit_rate: 100.0,
    recent_latencies: [],
  });

  const [events, setEvents] = useState<any[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<"connected" | "connecting" | "disconnected">("connecting");

  useEffect(() => {
    let socket: WebSocket | null = null;
    let reconnectTimer: any = null;

    const connectWebSocket = () => {
      setConnectionStatus("connecting");
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        const wsUrl = apiUrl.replace("http://", "ws://").replace("https://", "wss://") + "/metrics/ws";
        
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          setConnectionStatus("connected");
          if (reconnectTimer) {
            clearInterval(reconnectTimer);
            reconnectTimer = null;
          }
        };

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.metrics) {
              setMetrics(data.metrics);
            }
            if (data.events) {
              setEvents(data.events);
            }
          } catch (jsonErr) {
            console.error("Failed to parse WebSocket telemetry JSON payload:", jsonErr);
          }
        };

        socket.onclose = () => {
          setConnectionStatus("disconnected");
          if (!reconnectTimer) {
            reconnectTimer = setInterval(connectWebSocket, 5000);
          }
        };

        socket.onerror = () => {
          setConnectionStatus("disconnected");
          if (socket) socket.close();
        };

      } catch (wsErr) {
        console.error("WebSocket initialization failed:", wsErr);
        setConnectionStatus("disconnected");
        if (!reconnectTimer) {
          reconnectTimer = setInterval(connectWebSocket, 5000);
        }
      }
    };

    connectWebSocket();

    return () => {
      if (socket) {
        socket.close();
      }
      if (reconnectTimer) {
        clearInterval(reconnectTimer);
      }
    };
  }, []);

  // Format Recharts Latency curves: flat solid blue line, no filled area, no gradients
  const chartData = (metrics.recent_latencies || []).map((lat: number, idx: number) => ({
    query: idx + 1,
    latency: Number(lat.toFixed(2)),
  }));

  const quickActions = [
    { label: "Define NL Feature", href: "/features/new" },
    { label: "Upload Offline Dataset", href: "/datasets" },
    { label: "Log Model Deployments", href: "/models" },
    { label: "Audit Statistical Drift", href: "/alerts" },
  ];

  return (
    <div className="space-y-6 max-w-full mx-auto">
      
      {/* 1. Metrics Card Row */}
      <MetricsCards metrics={metrics} />

      {/* 2. Live Feed & Latency Chart Grid (40% / 60%) */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-6">
        
        {/* Left Column: WS live feed (40% / Col-span 4) */}
        <div className="lg:col-span-4">
          <LiveFeed events={events} connectionStatus={connectionStatus} />
        </div>

        {/* Right Column: Latency Chart (60% / Col-span 6) */}
        <div className="lg:col-span-6 bg-white border border-[#e5e7eb] rounded-[12px] p-4 flex flex-col h-[350px]">
          <div className="flex justify-between items-center border-b border-[#e5e7eb] pb-2 shrink-0">
            <span className="text-[11px] font-medium text-[#6b7280] tracking-widest uppercase font-sans">
              Latency Timeline
            </span>
            <span className="text-[10px] font-mono text-[#9ca3af] uppercase tracking-wider">
              {chartData.length} serving samples
            </span>
          </div>

          <div className="flex-1 w-full min-h-0 pt-3">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-center text-[#9ca3af] text-[11px] font-mono">
                NO SERVING TRAFFIC RECORDED
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="query"
                    stroke="#9ca3af"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    className="font-mono"
                  />
                  <YAxis
                    stroke="#9ca3af"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    className="font-mono"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#ffffff",
                      borderColor: "#e5e7eb",
                      borderRadius: "8px",
                      fontSize: "12px",
                      fontFamily: "sans-serif",
                      boxShadow: "none",
                    }}
                    itemStyle={{ color: "#111111" }}
                    labelStyle={{ color: "#6b7280", fontWeight: 500 }}
                    labelFormatter={(label) => `Sample: ${label}`}
                  />
                  <Line
                    type="monotone"
                    dataKey="latency"
                    stroke="#2563eb"
                    strokeWidth={1.5}
                    dot={false}
                    activeDot={{ r: 4, fill: "#2563eb", stroke: "#ffffff", strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* 3. Quick Actions Plain Text List Row */}
      <div className="pt-4 border-t border-[#e5e7eb] flex flex-col sm:flex-row sm:items-center gap-4">
        <span className="text-[11px] font-medium text-[#6b7280] tracking-widest uppercase font-sans">
          Quick Actions:
        </span>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {quickActions.map((action, idx) => (
            <Link
              key={idx}
              href={action.href}
              className="text-[13px] font-medium text-[#2563eb] hover:text-[#111111] transition-colors duration-150"
            >
              {action.label} &rarr;
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

