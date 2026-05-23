"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Zap,
  Info,
  BarChart2,
} from "lucide-react";
import DriftChart from "./DriftChart";

interface AlertData {
  id: string;
  feature_id: string;
  feature_name: string;
  detected_at: string;
  severity: string;
  explanation: string;
  upstream_correlation: any;
  suggested_fix: string;
  is_resolved: boolean;
}

interface AlertCardProps {
  alert: AlertData;
  onResolveSuccess: (alertId: string) => void;
  apiKey?: string;
}

export default function AlertCard({
  alert,
  onResolveSuccess,
  apiKey = "supersecretkeyreplaceinproduction",
}: AlertCardProps) {
  const [expanded, setExpanded] = useState<boolean>(false);
  const [resolving, setResolving] = useState<boolean>(false);

  const getHeaders = () => {
    return {
      "X-API-Key": apiKey,
    };
  };

  const handleResolve = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering accordion toggle
    if (alert.is_resolved || resolving) return;

    setResolving(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/alerts/${alert.id}/resolve`, {
        method: "PATCH",
        headers: getHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to mark alert as resolved.");
      }

      onResolveSuccess(alert.id);
    } catch (err) {
      console.error("Failed to resolve alert:", err);
      window.alert("Failed to resolve the alert. Please verify your connection status.");
    } finally {
      setResolving(false);
    }
  };

  // Color mappings based on severity
  const severityColors: Record<string, string> = {
    high: "bg-rose-500/10 text-rose-400 border-rose-500/20 glow-red",
    medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    low: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  };

  const severityBadge = (sev: string) => {
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase border tracking-wider ${
          severityColors[sev.toLowerCase()] || "bg-slate-800 text-slate-400 border-slate-700"
        }`}
      >
        <AlertTriangle className="h-3 w-3 shrink-0" /> {sev}
      </span>
    );
  };

  const corr = alert.upstream_correlation || {};
  const psi = corr.psi ?? 0.0;
  const klDiv = corr.kl_divergence ?? 0.0;
  const baselineStats = corr.baseline_stats || {};
  const currentStats = corr.current_stats || {};
  const driftType = corr.drift_type || "Covariate Drift";

  return (
    <div
      onClick={() => setExpanded(!expanded)}
      className={`rounded-2xl glass-panel p-5 border cursor-pointer transition-all duration-300 ${
        alert.is_resolved
          ? "border-slate-800 bg-slate-900/10 opacity-70"
          : expanded
          ? "border-slate-700 bg-slate-900/25 shadow-lg scale-[1.002]"
          : "border-slate-850 bg-slate-950/20 hover:border-slate-700/60"
      }`}
    >
      {/* Alert Header Summary */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {severityBadge(alert.severity)}
            
            {alert.is_resolved ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[9px] font-bold text-emerald-400 uppercase tracking-wider">
                <CheckCircle className="h-3 w-3" /> Resolved
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 text-[9px] font-bold text-rose-400 uppercase tracking-wider animate-pulse">
                Active Drift
              </span>
            )}

            <span className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
              <Clock className="h-3 w-3 shrink-0" /> {new Date(alert.detected_at).toLocaleString()}
            </span>
          </div>

          <h3 className="text-md font-bold text-slate-100 font-mono tracking-tight truncate">
            {alert.feature_name}
          </h3>
          
          <p className="text-xs text-slate-400 leading-normal truncate max-w-xl">
            {alert.explanation || "No description computed for this shift."}
          </p>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
          {!alert.is_resolved && (
            <button
              onClick={handleResolve}
              disabled={resolving}
              className="px-4 py-2 text-[10px] font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white shadow shadow-emerald-500/20 transition flex items-center gap-1"
            >
              {resolving ? (
                <RefreshCw className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="h-3.5 w-3.5" /> Resolve Alert
                </>
              )}
            </button>
          )}
          
          <button className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-500 transition-colors">
            {expanded ? <ChevronUp className="h-4 w-4 text-slate-350" /> : <ChevronDown className="h-4 w-4 text-slate-350" />}
          </button>
        </div>
      </div>

      {/* Accordion Expand Sheet details */}
      {expanded && (
        <div
          onClick={(e) => e.stopPropagation()} // Stop accordion toggle when clicking inside sheet
          className="mt-6 pt-6 border-t border-slate-850/80 space-y-6 animate-in slide-in-from-top-2 duration-300"
        >
          {/* AI Covariate explanation details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Descriptive block */}
            <div className="space-y-4 text-xs leading-relaxed text-slate-350">
              <div className="space-y-1">
                <span className="font-bold text-slate-400 flex items-center gap-1 text-[11px] uppercase tracking-wider">
                  <Info className="h-3.5 w-3.5 text-cyan-400 shrink-0" /> Detailed Explanation
                </span>
                <p className="leading-relaxed">{alert.explanation}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-900/40 border border-slate-850 rounded-xl">
                  <span className="font-semibold text-slate-500 block mb-0.5 text-[10px]">Drift Type</span>
                  <span className="font-bold text-slate-200 text-xs">{driftType}</span>
                </div>
                <div className="p-3 bg-slate-900/40 border border-slate-850 rounded-xl">
                  <span className="font-semibold text-slate-500 block mb-0.5 text-[10px]">KL Divergence</span>
                  <span className="font-mono font-bold text-slate-200 text-xs">{klDiv.toFixed(4)}</span>
                </div>
              </div>

              <div className="p-4 bg-slate-900/30 border border-slate-850 rounded-xl space-y-1">
                <span className="font-bold text-slate-400 block text-[11px] uppercase tracking-wider">Likely Root Cause</span>
                <p className="text-slate-400 text-[11px] leading-normal">{corr.likely_cause || "Analyzing shift logs."}</p>
              </div>

              <div className="p-4 bg-cyan-600/5 border border-cyan-500/10 rounded-xl space-y-1">
                <span className="font-bold text-cyan-400 block text-[11px] uppercase tracking-wider flex items-center gap-1">
                  <Zap className="h-3.5 w-3.5 text-amber-300" /> Recommended Actions
                </span>
                <p className="text-slate-350 text-[11px] leading-normal">{alert.suggested_fix || "Recalculate features over stable timelines."}</p>
              </div>
            </div>

            {/* Overlapping Distribution Density Recharts Graph */}
            {baselineStats && currentStats && Object.keys(baselineStats).length > 0 && (
              <div className="space-y-2">
                <span className="font-bold text-slate-400 flex items-center gap-1 text-[11px] uppercase tracking-wider">
                  <BarChart2 className="h-3.5 w-3.5 text-cyan-400" /> Probability Density Curves
                </span>
                <DriftChart
                  baselineStats={baselineStats}
                  currentStats={currentStats}
                  psi={psi}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
