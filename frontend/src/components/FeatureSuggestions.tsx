"use client";

import React, { useState } from "react";
import {
  CheckCircle,
  RefreshCw,
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
    <div className="space-y-6 animate-in fade-in duration-500 font-sans">
      {/* Filters & Bulk Register Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e5e7eb] pb-4">
        <div className="flex flex-wrap gap-1.5">
          {categories.map((cat) => {
            const isActive = activeFilter === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-150 ${
                  isActive
                    ? "bg-[#111111] text-white"
                    : "bg-[#f5f5f5] text-[#475569] hover:bg-[#e5e7eb]"
                }`}
              >
                {cat.replace("_", " ")}
              </button>
            );
          })}
        </div>

        <button
          onClick={handleRegisterAll}
          disabled={globalRegistering || suggestions.length === 0}
          className="btn-primary flex items-center justify-center gap-1.5 shrink-0 transition"
        >
          {globalRegistering ? (
            <>
              <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Registering features...
            </>
          ) : (
            "Register all suggestions"
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
              className={`rounded-[12px] bg-white border p-6 space-y-4 transition-all duration-300 ${
                isReg ? "border-emerald-500 bg-emerald-500/5" : "border-[#e5e7eb] hover:border-[#9ca3af]"
              }`}
            >
              {/* Header and Type badge */}
              <div className="flex justify-between items-start gap-4">
                <div className="space-y-1 flex-1 min-w-0">
                  <span className="tag-pill uppercase text-[10px] tracking-wider">
                    {item.feature_type}
                  </span>
                  <h4 className="text-sm font-semibold text-[#111111] font-sans mt-1 truncate">
                    {isReg ? regInfo.name : item.feature_name}
                  </h4>
                </div>

                {isReg ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 font-sans">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-600" /> Ingested
                  </span>
                ) : (
                  <button
                    onClick={() => handleRegister(item)}
                    disabled={loading}
                    className="btn-secondary text-xs py-1.5 px-3 shrink-0"
                  >
                    {loading ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      "Register"
                    )}
                  </button>
                )}
              </div>

              <hr className="border-[#e5e7eb]" />

              {/* description and ML value details */}
              <div className="space-y-3 text-xs leading-relaxed text-[#374151] font-sans">
                <p className="text-sm">{item.description}</p>

                <div className="p-3 bg-[#f8f9fa] border border-[#e5e7eb] rounded-[8px] space-y-1">
                  <span className="font-semibold text-[#6b7280] block font-sans">
                    ML value explanation:
                  </span>
                  <p className="text-[11px] text-[#6b7280]">{item.ml_value_explanation}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1 font-sans">
                  <span className="text-[10px] text-[#6b7280]">
                    Required inputs:
                  </span>
                  {item.required_columns.map((c) => (
                    <span
                      key={c}
                      className="px-1.5 py-0.5 rounded bg-[#f5f5f5] text-[10px] font-mono text-[#374151] border border-[#e5e7eb]"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </div>

              {/* Code drawer collapsible block */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={() => toggleCodeExpansion(item.feature_name)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-[#f8f9fa] border border-[#e5e7eb] hover:bg-[#e5e7eb]/35 rounded-[8px] text-xs font-semibold text-[#374151] transition"
                >
                  <span className="font-sans">Python Pandas logic</span>
                  <span className="text-[10px] text-[#6b7280] font-normal">
                    {expanded ? "Hide logic" : "Expand logic"}
                  </span>
                </button>

                {expanded && (
                  <pre className="p-4 rounded-[8px] border border-[#e5e7eb] bg-[#f8f9fa] text-[10px] font-mono text-[#111111] overflow-x-auto leading-relaxed shadow-none">
                    <code>{item.computation_code}</code>
                  </pre>
                )}
              </div>

              {isReg && (
                <div className="text-[10px] text-[#6b7280] flex justify-between pt-1 font-mono">
                  <span>DB UUID:</span>
                  <span className="text-[#374151] select-all">{regInfo.id}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
