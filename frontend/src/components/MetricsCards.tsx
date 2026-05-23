"use client";

import React from "react";
import {
  Database,
  Brain,
  Zap,
  TrendingUp,
  AlertTriangle,
  Clock,
} from "lucide-react";

interface MetricsData {
  total_features: number;
  total_models: number;
  total_feature_values: number;
  avg_serving_latency_ms: number;
  active_alerts_count: number;
  features_computed_last_24h: number;
  cache_hit_rate: number;
}

interface MetricsCardsProps {
  metrics: MetricsData;
}

export default function MetricsCards({ metrics }: MetricsCardsProps) {
  
  const cards = [
    {
      title: "Total Features",
      value: metrics.total_features,
      unit: "registered",
      description: "Active columns in store registry.",
      icon: <Database className="h-5 w-5 text-cyan-400" />,
      trend: "Up to date",
      trendColor: "text-slate-400",
    },
    {
      title: "Total Models",
      value: metrics.total_models,
      unit: "registered",
      description: "Logged deployment pipelines.",
      icon: <Brain className="h-5 w-5 text-emerald-400" />,
      trend: "MLflow active",
      trendColor: "text-emerald-400",
    },
    {
      title: "Serving Latency",
      value: metrics.avg_serving_latency_ms,
      unit: "ms avg",
      description: "Computed from the last 1,000 requests.",
      icon: <Zap className="h-5 w-5 text-amber-400" />,
      trend: metrics.avg_serving_latency_ms <= 1.0 ? "Cache speed" : "DB query speed",
      trendColor: metrics.avg_serving_latency_ms <= 1.0 ? "text-cyan-400 animate-pulse" : "text-amber-400",
    },
    {
      title: "Cache Hit Rate",
      value: metrics.cache_hit_rate,
      unit: "%",
      description: "Telemetry caching efficiency.",
      icon: <TrendingUp className="h-5 w-5 text-violet-400" />,
      trend: `${metrics.cache_hit_rate >= 80.0 ? "Excellent" : "Needs warmup"}`,
      trendColor: metrics.cache_hit_rate >= 80.0 ? "text-violet-400 font-bold" : "text-slate-500",
    },
    {
      title: "Active Alerts",
      value: metrics.active_alerts_count,
      unit: "active",
      description: "Statistical drift alarms triggered.",
      icon: <AlertTriangle className="h-5 w-5 text-rose-500" />,
      trend: metrics.active_alerts_count > 0 ? "Drift detected" : "All healthy",
      trendColor: metrics.active_alerts_count > 0 ? "text-rose-450 animate-pulse font-bold" : "text-emerald-400",
    },
    {
      title: "Computed (24h)",
      value: metrics.features_computed_last_24h,
      unit: "values",
      description: "Aggregations parsed last 24h.",
      icon: <Clock className="h-5 w-5 text-indigo-400" />,
      trend: "Pipeline health",
      trendColor: "text-slate-400",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {cards.map((card, index) => (
        <div
          key={index}
          className={`rounded-2xl glass-panel p-5 space-y-4 hover:border-slate-700/60 transition-all duration-300 ${
            card.title === "Active Alerts" && metrics.active_alerts_count > 0
              ? "border-rose-500/20 shadow shadow-rose-950/20"
              : ""
          }`}
        >
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                {card.title}
              </span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-100 font-mono">
                  {card.value}
                </span>
                <span className="text-[10px] font-bold text-slate-450 uppercase font-mono">
                  {card.unit}
                </span>
              </div>
            </div>
            
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 shadow-sm shrink-0">
              {card.icon}
            </div>
          </div>

          <div className="flex justify-between items-center text-[10px] font-bold border-t border-slate-900 pt-3">
            <span className="text-slate-500 font-normal leading-normal max-w-[150px]">
              {card.description}
            </span>
            <span className={`uppercase tracking-wider ${card.trendColor}`}>
              {card.trend}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
