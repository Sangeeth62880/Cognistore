"use client";

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface Stats {
  mean: number;
  std: number;
  min: number;
  max: number;
}

interface DriftChartProps {
  baselineStats: Stats;
  currentStats: Stats;
  psi: number;
}

export default function DriftChart({ baselineStats, currentStats, psi }: DriftChartProps) {
  // Extract stats parameters
  const bMean = baselineStats.mean ?? 10.0;
  const bStd = baselineStats.std || 1.0;
  const bMin = baselineStats.min ?? 0.0;
  const bMax = baselineStats.max ?? 20.0;

  const cMean = currentStats.mean ?? 90.0;
  const cStd = currentStats.std || 1.0;
  const cMin = currentStats.min ?? 50.0;
  const cMax = currentStats.max ?? 120.0;

  // Determine global bounds for the X-axis
  const minVal = Math.min(bMin, cMin);
  const maxVal = Math.max(bMax, cMax);

  // Generate Gaussian normal distribution (PDF) curve points
  const generatePDFPoints = (mean: number, std: number, min: number, max: number, numPoints: number = 30) => {
    const points = [];
    const step = (max - min) / numPoints;
    const safeStd = std === 0 ? 0.1 : std;

    for (let i = 0; i <= numPoints; i++) {
      const x = min + i * step;
      // Normal Probability Density Function: f(x) = (1 / (std * sqrt(2 * pi))) * e^(-(x-mean)^2 / (2 * std^2))
      const exponent = -Math.pow(x - mean, 2) / (2 * Math.pow(safeStd, 2));
      const density = (1 / (safeStd * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
      
      points.push({
        x: Number(x.toFixed(2)),
        y: Number((density * 100).toFixed(4)), // Scaled for clean visibility
      });
    }
    return points;
  };

  const baselinePDF = generatePDFPoints(bMean, bStd, minVal, maxVal);
  const currentPDF = generatePDFPoints(cMean, cStd, minVal, maxVal);

  // Combine into single array for Recharts
  const chartData = baselinePDF.map((pt, idx) => ({
    valueBucket: pt.x,
    "Baseline (7d ago)": pt.y,
    "Current (24h)": currentPDF[idx]?.y ?? 0.0,
  }));

  return (
    <div className="space-y-4">
      {/* PSI Header Banner */}
      <div className="flex items-center justify-between p-4 bg-slate-950/60 rounded-xl border border-slate-850">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Stability Metric</span>
          <span className="text-sm font-bold text-slate-200">Population Stability Index (PSI)</span>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-400 font-mono block">PSI score</span>
          <span className={`text-md font-bold font-mono ${psi > 0.4 ? "text-rose-400" : "text-amber-400"}`}>
            {psi.toFixed(4)}
          </span>
        </div>
      </div>

      {/* Recharts Curve Container */}
      <div className="h-[220px] w-full bg-slate-950/20 border border-slate-900 rounded-xl p-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="colorBaseline" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0891b2" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#0891b2" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorCurrent" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
            <XAxis
              dataKey="valueBucket"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#020617",
                borderColor: "#1e293b",
                borderRadius: "8px",
                fontSize: "11px",
              }}
              itemStyle={{ fontSize: "11px" }}
              labelStyle={{ fontSize: "11px", fontWeight: "bold", color: "#94a3b8" }}
              labelFormatter={(value: any) => `Value bucket: ${value}`}
            />
            <Legend verticalAlign="top" height={36} iconSize={10} wrapperStyle={{ fontSize: "11px" }} />
            <Area
              type="monotone"
              dataKey="Baseline (7d ago)"
              stroke="#0891b2"
              strokeWidth={1.5}
              fillOpacity={1}
              fill="url(#colorBaseline)"
            />
            <Area
              type="monotone"
              dataKey="Current (24h)"
              stroke="#f43f5e"
              strokeWidth={1.5}
              fillOpacity={1}
              fill="url(#colorCurrent)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
