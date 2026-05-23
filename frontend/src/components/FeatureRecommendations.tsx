"use client";

import React from "react";
import { Sparkles, Info } from "lucide-react";

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
    <div className="space-y-6 animate-in fade-in duration-300 font-sans">
      {/* Control panel and summary statistics */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-[#f8f9fa] border border-[#e5e7eb] rounded-[8px] gap-4">
        <div className="space-y-1">
          <span className="text-[10px] font-medium text-[#6b7280] uppercase tracking-wider block font-sans">Selection statistics</span>
          <p className="text-xs text-[#374151] font-semibold leading-none font-sans">
            Selected <span className="font-mono text-[#2563eb] font-bold">{selectedFeatureIds.length}</span> of <span className="font-mono text-[#111111]">{recommendations.length}</span> available features
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto self-end sm:self-center shrink-0">
          <button
            type="button"
            onClick={handleSelectAllRecommended}
            className="btn-secondary text-xs py-1.5 px-3 flex items-center justify-center gap-1.5"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" /> Select recommended
          </button>

          <button
            type="button"
            onClick={handleToggleAll}
            className="btn-secondary text-xs py-1.5 px-3"
          >
            {selectedFeatureIds.length === recommendations.length ? "Deselect all" : "Select all"}
          </button>
        </div>
      </div>

      {/* Feature relevance rows directory */}
      <div className="w-full overflow-x-auto">
        <table className="dev-table">
          <thead>
            <tr>
              <th className="p-4 w-12 text-center font-sans">Include</th>
              <th className="p-4 font-sans">Feature details</th>
              <th className="p-4 w-44 font-sans">Relevance score</th>
              <th className="p-4 font-sans">Semantic explanation</th>
            </tr>
          </thead>
          <tbody>
            {recommendations.map((rec) => {
              const isSelected = selectedFeatureIds.includes(rec.feature_id);
              const isRecommended = rec.recommended;

              return (
                <tr
                  key={rec.feature_id}
                  onClick={() => handleToggleFeature(rec.feature_id)}
                  className={`hover:bg-[#f9fafb] cursor-pointer ${
                    isSelected ? "bg-emerald-500/5" : ""
                  }`}
                >
                  {/* Checkbox select column */}
                  <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleFeature(rec.feature_id)}
                      className="rounded border-[#e5e7eb] text-[#111111] focus:ring-[#111111] h-4 w-4 cursor-pointer"
                    />
                  </td>

                  {/* Name and recommendation status */}
                  <td className="p-4 space-y-1.5 max-w-[200px]">
                    <span className="font-semibold text-[#111111] font-sans text-sm block truncate">
                      {rec.feature_name}
                    </span>
                    {isRecommended && (
                      <span className="tag-pill bg-emerald-500/10 text-emerald-600 font-sans text-[10px]">
                        High value
                      </span>
                    )}
                  </td>

                  {/* Relevance progress indicators */}
                  <td className="p-4 space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-bold font-mono">
                      <span className={isSelected ? "text-emerald-600" : "text-[#6b7280]"}>Score</span>
                      <span className={isSelected ? "text-emerald-600" : "text-[#111111]"}>
                        {(rec.relevance_score * 100).toFixed(0)}%
                      </span>
                    </div>

                    <div className="w-full bg-[#f5f5f5] h-1.5 rounded-full overflow-hidden border border-[#e5e7eb]">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isRecommended ? "bg-emerald-500" : "bg-[#9ca3af]"
                        }`}
                        style={{ width: `${rec.relevance_score * 100}%` }}
                      />
                    </div>
                  </td>

                  {/* Relevance explanation details */}
                  <td className="p-4 leading-relaxed text-[#6b7280] text-[12px] max-w-[320px]">
                    <div className="flex items-start gap-2">
                      <Info className="h-3.5 w-3.5 text-[#9ca3af] shrink-0 mt-0.5" />
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
  );
}
