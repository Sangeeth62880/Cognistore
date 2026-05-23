"use client";

import React, { useState } from "react";
import {
  Sparkles,
  CheckCircle,
  Code,
  Tag,
  BookOpen,
  ArrowRight,
  RefreshCw,
  Zap,
} from "lucide-react";

interface Suggestion {
  feature_name: string;
  description: string;
  computation_code: string;
  feature_type: string;
  ml_value_explanation: string;
  required_columns: string[];
}

interface FeatureSuggestionsProps {
  suggestions: Suggestion[];
  datasetId: string;
  apiKey?: string;
}

export default function FeatureSuggestions({
  suggestions,
  datasetId,
  apiKey = "supersecretkeyreplaceinproduction",
}: FeatureSuggestionsProps) {
  const [activeFilter, setActiveFilter] = useState<string>("all");
  
  // Stored state: mapping feature_name to registered details (like DB ID)
  const [registeredList, setRegisteredList] = useState<Record<string, { id: string; name: string }>>({});
  
  // Ingest state per suggestion
  const [registering, setRegistering] = useState<Record<string, boolean>>({});
  const [globalRegistering, setGlobalRegistering] = useState<boolean>(false);
  const [expandedCode, setExpandedCode] = useState<Record<string, boolean>>({});

  const getHeaders = () => {
    return {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    };
  };

  const handleRegister = async (item: Suggestion) => {
    if (registeredList[item.feature_name]) return;
    
    setRegistering((prev) => ({ ...prev, [item.feature_name]: true }));

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/datasets/${datasetId}/register-suggestion`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(item),
      });

      if (!response.ok) {
        throw new Error("Failed to register recommended feature.");
      }

      const res = await response.json();
      setRegisteredList((prev) => ({
        ...prev,
        [item.feature_name]: { id: res.feature_id, name: res.name },
      }));

    } catch (err) {
      console.error("Suggestion registration error:", err);
      alert("Failed to register the recommended feature. Please check API parameters.");
    } finally {
      setRegistering((prev) => ({ ...prev, [item.feature_name]: false }));
    }
  };

  const handleRegisterAll = async () => {
    const unregistered = suggestions.filter((s) => !registeredList[s.feature_name]);
    if (unregistered.length === 0) return;

    setGlobalRegistering(true);
    
    try {
      await Promise.all(
        unregistered.map(async (item) => {
          try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const response = await fetch(`${apiUrl}/datasets/${datasetId}/register-suggestion`, {
              method: "POST",
              headers: getHeaders(),
              body: JSON.stringify(item),
            });

            if (response.ok) {
              const res = await response.json();
              setRegisteredList((prev) => ({
                ...prev,
                [item.feature_name]: { id: res.feature_id, name: res.name },
              }));
            }
          } catch (err) {
            console.error(`Failed to register suggested feature: ${item.feature_name}`, err);
          }
        })
      );
    } finally {
      setGlobalRegistering(false);
    }
  };

  const toggleCodeExpansion = (name: string) => {
    setExpandedCode((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  // Filter Categories
  const categories = ["all", "ratio", "aggregation", "time_based", "interaction", "statistical", "encoding"];

  const filteredSuggestions = suggestions.filter((item) => {
    if (activeFilter === "all") return true;
    return item.feature_type.toLowerCase() === activeFilter.toLowerCase();
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Filters & Bulk Register Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition ${
                activeFilter === cat
                  ? "bg-cyan-600/10 text-cyan-400 border border-cyan-500/20"
                  : "bg-slate-900 border border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200"
              }`}
            >
              {cat.replace("_", " ")}
            </button>
          ))}
        </div>
        
        <button
          onClick={handleRegisterAll}
          disabled={globalRegistering || suggestions.length === 0}
          className="px-5 py-2.5 text-xs font-bold rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-1.5 shrink-0 transition"
        >
          {globalRegistering ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Registering features...
            </>
          ) : (
            <>
              <Zap className="h-3.5 w-3.5 text-amber-300" /> Register All Suggestions
            </>
          )}
        </button>
      </div>

      {/* suggestion Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredSuggestions.map((item) => {
          const regInfo = registeredList[item.feature_name];
          const isReg = !!regInfo;
          const loading = registering[item.feature_name];
          const expanded = expandedCode[item.feature_name];

          return (
            <div
              key={item.feature_name}
              className={`rounded-2xl glass-panel p-6 space-y-4 border transition-all duration-300 ${
                isReg
                  ? "border-emerald-500/30 bg-emerald-950/5 glow-green"
                  : "hover:border-slate-700/60"
              }`}
            >
              
              {/* Header and Type badge */}
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1 flex-1">
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 uppercase tracking-wider">
                    {item.feature_type}
                  </span>
                  <h4 className="text-sm font-bold text-slate-200 font-mono mt-1 truncate">
                    {isReg ? regInfo.name : item.feature_name}
                  </h4>
                </div>
                
                {isReg ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                    <CheckCircle className="h-3.5 w-3.5" /> Registered
                  </span>
                ) : (
                  <button
                    onClick={() => handleRegister(item)}
                    disabled={loading}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white transition flex items-center gap-1 shrink-0"
                  >
                    {loading ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        Register <ArrowRight className="h-3 w-3" />
                      </>
                    )}
                  </button>
                )}
              </div>

              <hr className="border-slate-800/80" />

              {/* description and ML value details */}
              <div className="space-y-3 text-xs leading-relaxed text-slate-350">
                <p>{item.description}</p>
                
                <div className="p-3 bg-slate-900/40 border border-slate-800/60 rounded-xl space-y-1">
                  <span className="font-semibold text-slate-400 flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5 text-cyan-400" /> ML Value explanation
                  </span>
                  <p className="text-[11px] text-slate-400">{item.ml_value_explanation}</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Tag className="h-3.5 w-3.5" /> Inputs:
                  </span>
                  {item.required_columns.map((c) => (
                    <span key={c} className="px-1.5 py-0.5 rounded bg-slate-950 text-[10px] font-mono text-slate-400 border border-slate-800/80">
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              {/* Code drawer collapsible block */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => toggleCodeExpansion(item.feature_name)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-slate-950/60 border border-slate-850 hover:border-slate-800 rounded-xl text-xs font-semibold text-slate-450 hover:text-slate-200 transition"
                >
                  <span className="flex items-center gap-1.5">
                    <Code className="h-4 w-4 text-cyan-400" /> Python Pandas Logic
                  </span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    {expanded ? "Hide Code" : "Expand Code"}
                  </span>
                </button>

                {expanded && (
                  <pre className="p-4 rounded-xl border border-slate-850 bg-slate-950/90 text-[10px] font-mono text-slate-300 overflow-x-auto leading-relaxed shadow-inner animate-in slide-in-from-top-2 duration-200">
                    <code>{item.computation_code}</code>
                  </pre>
                )}
              </div>

              {isReg && (
                <div className="text-[10px] text-slate-500 flex justify-between pt-1 font-mono">
                  <span>DB UUID:</span>
                  <span className="text-slate-400 select-all">{regInfo.id}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
