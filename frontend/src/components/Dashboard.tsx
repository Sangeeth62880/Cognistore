"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Sparkles,
  Layers,
  Brain,
  AlertTriangle,
  ChevronRight,
  Gauge,
} from "lucide-react";
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
          // Attempt automatic reconnection every 5 seconds
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

  // Format Recharts Latency Timeline curves
  const chartData = (metrics.recent_latencies || []).map((lat: number, idx: number) => ({
    query: idx + 1,
    "Latency (ms)": Number(lat.toFixed(2)),
  }));

  const quickActions = [
    {
      label: "Define NL Feature",
      description: "Generate features using plain English.",
      href: "/features/new",
      icon: <Sparkles className="h-4.5 w-4.5 text-cyan-400" />,
      borderHover: "hover:border-cyan-500/30",
    },
    {
      label: "Upload Offline Dataset",
      description: "Analyze schema correlations and nulls.",
      href: "/datasets",
      icon: <Layers className="h-4.5 w-4.5 text-violet-400" />,
      borderHover: "hover:border-violet-500/30",
    },
    {
      label: "Log Model Deployments",
      description: "Audit schemas and link features to models.",
      href: "/models",
      icon: <Brain className="h-4.5 w-4.5 text-emerald-400" />,
      borderHover: "hover:border-emerald-500/30",
    },
    {
      label: "Audit Statistical Drift",
      description: "Examine PSI curves and AI remedies.",
      href: "/alerts",
      icon: <AlertTriangle className="h-4.5 w-4.5 text-rose-450" />,
      borderHover: "hover:border-rose-500/30",
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto">
      
      {/* Metrics Card Row */}
      <MetricsCards metrics={metrics} />

      {/* Analytics timeline and live feed split grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: WebSocket Event Feed */}
        <LiveFeed events={events} connectionStatus={connectionStatus} />

        {/* Right Column: Recharts Serving Latency Graph */}
        <div className="lg:col-span-2 rounded-2xl glass-panel p-5 space-y-4 hover:border-slate-800/80 transition-colors flex flex-col h-[380px]">
          <div className="flex justify-between items-center border-b border-slate-900 pb-3 shrink-0">
            <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <Gauge className="h-4 w-4 text-cyan-400" /> Serving Latency Timeline
            </h3>
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
              Last {chartData.length} serve requests
            </span>
          </div>

          <div className="flex-1 w-full min-h-0 pt-2">
            {chartData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 text-[11px]">
                No recent serving latencies recorded. Trigger some GET /serve requests.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                  <XAxis
                    dataKey="query"
                    stroke="#64748b"
                    fontSize={9}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={9}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#020617",
                      borderColor: "#1e293b",
                      borderRadius: "8px",
                      fontSize: "10px",
                    }}
                    itemStyle={{ fontSize: "10px" }}
                    labelStyle={{ fontSize: "10px", fontWeight: "bold", color: "#94a3b8" }}
                    labelFormatter={(value) => `Query Index: ${value}`}
                  />
                  <Area
                    type="monotone"
                    dataKey="Latency (ms)"
                    stroke="#06b6d4"
                    strokeWidth={1.5}
                    fillOpacity={1}
                    fill="url(#colorLatency)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions bottom panel */}
      <div className="space-y-4">
        <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
          Feature Store Quick Actions
        </h4>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action, idx) => (
            <Link
              key={idx}
              href={action.href}
              className={`rounded-2xl glass-panel p-5 space-y-2 border border-slate-850 bg-slate-950/20 block hover:bg-slate-900/10 cursor-pointer transition-all duration-300 ${action.borderHover}`}
            >
              <div className="flex justify-between items-center">
                <div className="p-2 bg-slate-900 border border-slate-800 rounded-xl">
                  {action.icon}
                </div>
                <ChevronRight className="h-4 w-4 text-slate-600 shrink-0" />
              </div>
              <div className="space-y-1 pt-1">
                <h4 className="text-xs font-bold text-slate-200">{action.label}</h4>
                <p className="text-[10px] text-slate-500 leading-normal">{action.description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
