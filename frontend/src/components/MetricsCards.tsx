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
      description: "Active registry definitions",
    },
    {
      title: "TOTAL MODELS",
      value: metrics.total_models,
      description: "Bound serving pipelines",
    },
    {
      title: "SERVING LATENCY",
      value: `${metrics.avg_serving_latency_ms.toFixed(2)} ms`,
      description: "Calculated over last 1,000 queries",
    },
    {
      title: "CACHE HIT RATE",
      value: `${metrics.cache_hit_rate.toFixed(1)}%`,
      description: "Upstash caching execution ratio",
    },
    {
      title: "ACTIVE ALERTS",
      value: metrics.active_alerts_count,
      description: "Active statistical shifts count",
    },
    {
      title: "COMPUTED (24H)",
      value: metrics.features_computed_last_24h,
      description: "Aggregations parsed last 24h",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card, index) => (
        <div
          key={index}
          className="bg-[#f5f5f5] border border-[#e5e7eb] rounded-[12px] p-5 flex flex-col justify-between h-[120px] shadow-none"
        >
          <div className="space-y-1">
            <span className="text-[11px] font-medium text-[#6b7280] tracking-widest block font-sans">
              {card.title}
            </span>
            <div className="pt-1">
              <span className="text-3xl font-semibold text-[#111111] tracking-tight font-sans">
                {card.value}
              </span>
            </div>
          </div>
          <div className="text-[13px] text-[#9ca3af] font-sans">
            {card.description}
          </div>
        </div>
      ))}
    </div>
  );
}
