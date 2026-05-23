"use client";

import React from "react";
import { Sparkles, Check, CheckSquare, Square, Info } from "lucide-react";

interface Recommendation {
  feature_id: string;
  feature_name: string;
  relevance_score: number;
  relevance_explanation: string;
  recommended: boolean;
}

interface FeatureRecommendationsProps {
  recommendations: Recommendation[];
  selectedFeatureIds: string[];
  onChangeSelection: (selectedIds: string[]) => void;
}

export default function FeatureRecommendations({
  recommendations,
  selectedFeatureIds,
  onChangeSelection,
}: FeatureRecommendationsProps) {
  
  const handleToggleFeature = (featureId: string) => {
    if (selectedFeatureIds.includes(featureId)) {
      onChangeSelection(selectedFeatureIds.filter((id) => id !== featureId));
    } else {
      onChangeSelection([...selectedFeatureIds, featureId]);
    }
  };

  const handleSelectAllRecommended = () => {
    const recommendedIds = recommendations
      .filter((r) => r.recommended)
      .map((r) => r.feature_id);
    
    // Union existing selections with recommended IDs
    const newSelection = Array.from(new Set([...selectedFeatureIds, ...recommendedIds]));
    onChangeSelection(newSelection);
  };

  const handleToggleAll = () => {
    if (selectedFeatureIds.length === recommendations.length) {
      onChangeSelection([]);
    } else {
      onChangeSelection(recommendations.map((r) => r.feature_id));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Control panel and summary statistics */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-slate-900/40 border border-slate-800 rounded-xl gap-4">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Selection Statistics</span>
          <p className="text-xs text-slate-350 font-semibold leading-none">
            Selected <span className="font-mono text-cyan-400 font-bold">{selectedFeatureIds.length}</span> of <span className="font-mono text-slate-200">{recommendations.length}</span> available features
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto self-end sm:self-center shrink-0">
          <button
            type="button"
            onClick={handleSelectAllRecommended}
            className="flex-1 sm:flex-none px-4 py-2 text-[10px] font-bold uppercase rounded-lg bg-cyan-600/10 text-cyan-400 hover:bg-cyan-600/25 border border-cyan-500/20 shadow-inner flex items-center justify-center gap-1.5 transition-all duration-300"
          >
            <Sparkles className="h-3.5 w-3.5" /> Select Recommended
          </button>
          
          <button
            type="button"
            onClick={handleToggleAll}
            className="flex-1 sm:flex-none px-4 py-2 text-[10px] font-bold uppercase rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-350 hover:text-slate-100 border border-slate-700 transition"
          >
            {selectedFeatureIds.length === recommendations.length ? "Deselect All" : "Select All"}
          </button>
        </div>
      </div>

      {/* Feature relevance rows directory */}
      <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/40">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/60 font-semibold text-slate-400">
                <th className="p-4 w-12 text-center">Include</th>
                <th className="p-4">Feature Details</th>
                <th className="p-4 w-44">Relevance Score</th>
                <th className="p-4">Semantic Explanation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {recommendations.map((rec) => {
                const isSelected = selectedFeatureIds.includes(rec.feature_id);
                const isRecommended = rec.recommended;

                return (
                  <tr
                    key={rec.feature_id}
                    onClick={() => handleToggleFeature(rec.feature_id)}
                    className={`hover:bg-slate-900/20 transition-all duration-300 cursor-pointer ${
                      isSelected
                        ? "bg-cyan-950/5"
                        : isRecommended
                        ? "bg-emerald-950/5 border-l-2 border-l-emerald-500/40"
                        : ""
                    }`}
                  >
                    {/* Checkbox select column */}
                    <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleToggleFeature(rec.feature_id)}
                        className={`p-1.5 rounded-lg border transition ${
                          isSelected
                            ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400 shadow-sm"
                            : "bg-slate-900 border-slate-800 text-slate-600 hover:text-slate-400 hover:border-slate-700"
                        }`}
                      >
                        {isSelected ? (
                          <CheckSquare className="h-4 w-4" />
                        ) : (
                          <Square className="h-4 w-4" />
                        )}
                      </button>
                    </td>

                    {/* Name and recommendation status */}
                    <td className="p-4 space-y-1.5 max-w-[200px]">
                      <span className="font-bold text-slate-200 font-mono text-[11px] block truncate">
                        {rec.feature_name}
                      </span>
                      {isRecommended && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-400 uppercase tracking-wider">
                          <Sparkles className="h-2.5 w-2.5" /> High Predictive Value
                        </span>
                      )}
                    </td>

                    {/* Relevance progress indicators */}
                    <td className="p-4 space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-bold font-mono">
                        <span className={isSelected ? "text-cyan-400" : "text-slate-500"}>Score</span>
                        <span className={isSelected ? "text-cyan-400" : "text-slate-300"}>
                          {(rec.relevance_score * 100).toFixed(0)}%
                        </span>
                      </div>
                      
                      <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isRecommended
                              ? "bg-emerald-500 shadow-sm shadow-emerald-500/20"
                              : "bg-slate-650"
                          }`}
                          style={{ width: `${rec.relevance_score * 100}%` }}
                        />
                      </div>
                    </td>

                    {/* Relevance explanation details */}
                    <td className="p-4 leading-relaxed text-slate-350 text-[11px] max-w-[320px]">
                      <div className="flex items-start gap-2">
                        <Info className="h-3.5 w-3.5 text-slate-500 shrink-0 mt-0.5" />
                        <span className="line-clamp-2 hover:line-clamp-none transition-all">{rec.relevance_explanation}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
