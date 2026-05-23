"use client";

import React, { useState } from "react";
import {
  RefreshCw,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import FeatureRecommendations from "./FeatureRecommendations";

interface ModelRegistrationProps {
  onRegistrationSuccess: () => void;
  apiKey?: string;
}

interface Recommendation {
  feature_id: string;
  feature_name: string;
  relevance_score: number;
  relevance_explanation: string;
  recommended: boolean;
}

export default function ModelRegistration({
  onRegistrationSuccess,
  apiKey = "supersecretkeyreplaceinproduction",
}: ModelRegistrationProps) {
  // Stepper state: 1 = Form Input, 2 = Recommendations, 3 = Success
  const [step, setStep] = useState<number>(1);

  // Form values
  const [modelName, setModelName] = useState<string>("");
  const [version, setVersion] = useState<string>("v1.0");
  const [modelTask, setModelTask] = useState<string>("classification");
  const [modelDescription, setModelDescription] = useState<string>("");

  // Recommendations and selections
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [selectedFeatureIds, setSelectedFeatureIds] = useState<string[]>([]);

  // Loading & Ingestion States
  const [loading, setLoading] = useState<boolean>(false);
  const [registering, setRegistering] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Final payload
  const [registeredModel, setRegisteredModel] = useState<any>(null);

  const getHeaders = () => {
    return {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    };
  };

  const handleGetRecommendations = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelName || !modelDescription) {
      setError("Please fill out all required fields before requesting feature suggestions.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/models/recommend`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          model_name: modelName,
          model_description: modelDescription,
          model_task: modelTask,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.detail || "Recommendations calculation failed.");
      }

      const data = await response.json();

      if (data.status === "insufficient_features") {
        setError(data.message);
        setStep(1);
      } else {
        setRecommendations(data.recommendations);
        // Pre-select features that are recommended (score > 0.6)
        const recommendedIds = data.recommendations
          .filter((r: Recommendation) => r.recommended)
          .map((r: Recommendation) => r.feature_id);
        setSelectedFeatureIds(recommendedIds);
        setStep(2);
      }
    } catch (err: any) {
      console.error("Failed to fetch recommendations:", err);
      setError(err.message || "An unexpected network error occurred while querying suggestions.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterModel = async () => {
    if (selectedFeatureIds.length === 0) {
      setError("At least one feature must be selected to register the model configuration.");
      return;
    }

    setRegistering(true);
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

      const response = await fetch(`${apiUrl}/models/register-with-recommendations`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          model_name: modelName,
          model_description: modelDescription,
          model_task: modelTask,
          version: version,
          selected_feature_ids: selectedFeatureIds,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json();
        throw new Error(errJson.detail || "Model registration failed.");
      }

      const modelData = await response.json();
      setRegisteredModel(modelData);
      setStep(3);
      onRegistrationSuccess();
    } catch (err: any) {
      console.error("Failed to register model:", err);
      setError(err.message || "An unexpected error occurred during database registry write.");
    } finally {
      setRegistering(false);
    }
  };

  const handleReset = () => {
    setModelName("");
    setVersion("v1.0");
    setModelTask("classification");
    setModelDescription("");
    setRecommendations([]);
    setSelectedFeatureIds([]);
    setError(null);
    setRegisteredModel(null);
    setStep(1);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in duration-300 font-sans">
      {/* Visual Stepper Indicators */}
      <div className="flex items-center justify-center max-w-lg mx-auto gap-4">
        {[
          { label: "Define Model", num: 1 },
          { label: "Select Features", num: 2 },
          { label: "Completion", num: 3 },
        ].map((s, idx) => {
          const isActive = step === s.num;
          const isCompleted = step > s.num;

          return (
            <React.Fragment key={s.num}>
              <div className="flex items-center gap-2">
                <span
                  className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold font-sans border transition ${
                    isActive
                      ? "bg-[#111111] text-white border-[#111111]"
                      : isCompleted
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                      : "bg-white text-[#9ca3af] border-[#e5e7eb]"
                  }`}
                >
                  {isCompleted ? "✓" : s.num}
                </span>
                <span
                  className={`text-[11px] font-semibold font-sans uppercase tracking-wider ${
                    isActive ? "text-[#111111]" : "text-[#6b7280]"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {idx < 2 && (
                <span className={`text-[12px] ${step > s.num ? "text-emerald-500" : "text-[#e5e7eb]"}`}>
                  &rarr;
                </span>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Error Alert panel */}
      {error && (
        <div className="rounded-[8px] border border-[#ef4444] bg-[#ef4444]/5 p-5 flex items-start gap-3.5 text-xs text-[#ef4444]">
          <AlertCircle className="h-5 w-5 text-[#ef4444] shrink-0" />
          <div className="space-y-1 font-sans">
            <h3 className="font-semibold">Model registration failed</h3>
            <p className="leading-relaxed opacity-95">{error}</p>
          </div>
        </div>
      )}

      {/* --- Step 1: Form Inputs --- */}
      {step === 1 && (
        <form onSubmit={handleGetRecommendations} className="bg-white border border-[#e5e7eb] rounded-[12px] p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-[#111111] border-b border-[#e5e7eb] pb-2 font-sans">
              Define target model specifications
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Model Name */}
              <div className="sm:col-span-2 space-y-2">
                <label className="text-[13px] font-medium text-[#374151] block font-sans">Model name</label>
                <input
                  type="text"
                  placeholder="e.g. churn_prediction"
                  required
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-[#e5e7eb] rounded-[8px] outline-none text-[#111111] focus:ring-1 focus:ring-[#111111] placeholder:text-[#9ca3af] transition-all duration-150 font-sans"
                />
              </div>

              {/* Version */}
              <div className="space-y-2">
                <label className="text-[13px] font-medium text-[#374151] block font-sans">Deploy version</label>
                <input
                  type="text"
                  placeholder="e.g. v1.0"
                  required
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-[#e5e7eb] rounded-[8px] outline-none text-[#111111] focus:ring-1 focus:ring-[#111111] placeholder:text-[#9ca3af] transition-all duration-150 font-mono"
                />
              </div>
            </div>

            {/* Model Task */}
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-[#374151] block font-sans">Model task type</label>
              <select
                value={modelTask}
                onChange={(e) => setModelTask(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#e5e7eb] rounded-[8px] outline-none text-[#111111] focus:ring-1 focus:ring-[#111111] transition-all duration-150 font-sans"
              >
                <option value="classification">Classification (Predict Categories, Churn, Fraud)</option>
                <option value="regression">Regression (Predict Numeric Amounts, Lifetime Value, Price)</option>
                <option value="ranking">Ranking (Relevance, Recommendation Grids)</option>
                <option value="clustering">Clustering (Unsupervised user cohort profiling)</option>
              </select>
            </div>

            {/* Model Description */}
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-[#374151] block font-sans">Model goal & description</label>
              <textarea
                placeholder="Describe the target objectives, input signals, and business constraints of this model in detail..."
                rows={4}
                required
                value={modelDescription}
                onChange={(e) => setModelDescription(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#e5e7eb] rounded-[8px] outline-none text-[#111111] focus:ring-1 focus:ring-[#111111] placeholder:text-[#9ca3af] transition-all duration-150 leading-relaxed resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Suggesting features...
                </>
              ) : (
                "Get recommendations"
              )}
            </button>
          </div>
        </form>
      )}

      {/* --- Step 2: Recommendations List --- */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="bg-white border border-[#e5e7eb] rounded-[12px] p-6 space-y-4 shadow-none">
            <h3 className="text-sm font-semibold text-[#111111] border-b border-[#e5e7eb] pb-2 font-sans">
              Bound semantic recommendations
            </h3>

            <p className="text-xs text-[#6b7280] leading-relaxed font-sans">
              We evaluated <span className="font-bold text-[#111111]">{recommendations.length}</span> active features in your store. The LLM has ranked and explained which signals carry high predictive relevance for <span className="font-bold text-[#2563eb]">{modelName}</span>. Check the ones you want to link.
            </p>

            <FeatureRecommendations
              recommendations={recommendations}
              selectedFeatureIds={selectedFeatureIds}
              onChangeSelection={setSelectedFeatureIds}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              Back to specifications
            </button>

            <button
              type="button"
              onClick={handleRegisterModel}
              disabled={registering || selectedFeatureIds.length === 0}
              className="btn-primary text-xs flex items-center justify-center gap-1.5"
            >
              {registering ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Registering model...
                </>
              ) : (
                "Register model configuration"
              )}
            </button>
          </div>
        </div>
      )}

      {/* --- Step 3: Success Completion --- */}
      {step === 3 && registeredModel && (
        <div className="bg-white border border-[#e5e7eb] rounded-[12px] p-8 space-y-6 text-center shadow-none animate-in zoom-in duration-300">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 mx-auto">
            <CheckCircle className="h-7 w-7" />
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-bold text-[#111111] font-sans">Model Deployment Logged</h3>
            <p className="text-xs text-[#6b7280] max-w-sm mx-auto font-sans">
              ML Model schema definitions and bound features list have been locked in repository metadata registry.
            </p>
          </div>

          {/* Locked stats summaries */}
          <div className="max-w-md mx-auto grid grid-cols-2 gap-4 bg-[#f5f5f5] p-4 rounded-[8px] border border-[#e5e7eb] text-left text-xs text-[#374151] leading-relaxed font-mono">
            <div>
              <span className="block text-[10px] text-[#6b7280] uppercase tracking-wide font-sans">Registry Name</span>
              <span className="text-[#111111] font-bold truncate block font-sans">{registeredModel.name}</span>
            </div>
            <div>
              <span className="block text-[10px] text-[#6b7280] uppercase tracking-wide font-sans">Version</span>
              <span className="text-[#111111] font-bold block">{registeredModel.version}</span>
            </div>
            <div className="col-span-2 pt-2 border-t border-[#e5e7eb]">
              <span className="block text-[10px] text-[#6b7280] uppercase tracking-wide font-sans">Model UUID</span>
              <span className="text-[#2563eb] font-bold break-all block">{registeredModel.id}</span>
            </div>
            <div className="col-span-2 pt-2 border-t border-[#e5e7eb] flex justify-between items-center">
              <div>
                <span className="block text-[10px] text-[#6b7280] uppercase tracking-wide font-sans">Bound Features Count</span>
                <span className="text-emerald-600 font-bold block font-sans">{registeredModel.features.length} features linked</span>
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-4 pt-2">
            <button
              onClick={handleReset}
              className="btn-primary text-xs"
            >
              Log another model
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
