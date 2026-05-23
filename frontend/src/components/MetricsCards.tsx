"use client";

import React from "react";

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
      title: "TOTAL FEATURES",
      value: metrics.total_features,
      unit: "REG",
      description: "Active registry definitions.",
    },
    {
      title: "TOTAL MODELS",
      value: metrics.total_models,
      unit: "REG",
      description: "Bound serving pipelines.",
    },
    {
      title: "SERVING LATENCY",
      value: metrics.avg_serving_latency_ms.toFixed(2),
      unit: "MS AVG",
      description: "Calculated over last 1,000 queries.",
      highlight: metrics.avg_serving_latency_ms > 10.0 ? "text-[#d97706]" : "text-[#a3e635]",
    },
    {
      title: "CACHE HIT RATE",
      value: metrics.cache_hit_rate.toFixed(1),
      unit: "%",
      description: "Upstash caching execution ratio.",
      highlight: metrics.cache_hit_rate >= 80.0 ? "text-[#a3e635]" : "text-[#dc2626]",
    },
    {
      title: "ACTIVE ALERTS",
      value: metrics.active_alerts_count,
      unit: "DRIFT",
      description: "Active statistical shifts alarm count.",
      highlight: metrics.active_alerts_count > 0 ? "text-[#dc2626]" : "text-[#16a34a]",
    },
    {
      title: "COMPUTED (24H)",
      value: metrics.features_computed_last_24h,
      unit: "VALS",
      description: "Aggregations parsed last 24 hours.",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card, index) => (
        <div
          key={index}
          className="bg-[#111111] border border-[#1f1f1f] rounded-[4px] p-5 flex flex-col justify-between h-[120px]"
        >
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-[#666666] tracking-widest block">
              {card.title}
            </span>
            <div className="flex items-baseline gap-1.5 pt-1">
              <span className={`text-3xl font-bold font-mono tracking-tight ${card.highlight || "text-[#e8e8e8]"}`}>
                {card.value}
              </span>
              <span className="text-[10px] font-mono text-[#444444] font-semibold">
                {card.unit}
              </span>
            </div>
          </div>
          <div className="text-[10px] text-[#444444] border-t border-[#1f1f1f]/50 pt-2 font-mono">
            {card.description}
          </div>
        </div>
      ))}
    </div>
  );
}
