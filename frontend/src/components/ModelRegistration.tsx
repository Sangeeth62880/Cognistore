"use client";

import React, { useState } from "react";
import {
  Brain,
  ChevronRight,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Cpu,
  Layers,
  Activity,
  Plus,
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
    <div className="space-y-8 max-w-4xl mx-auto animate-in fade-in duration-300">
      
      {/* Visual Stepper Indicators */}
      <div className="flex items-center justify-center max-w-lg mx-auto gap-4">
        {[
          { label: "Define Model", num: 1 },
          { label: "Select Features", num: 2 },
          { label: "Completion", num: 3 },
        ].map((s, idx) => (
          <React.Fragment key={s.num}>
            <div className="flex items-center gap-2">
              <span
                className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold font-mono border transition ${
                  step === s.num
                    ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30 glow-cyan font-bold"
                    : step > s.num
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                    : "bg-slate-900 text-slate-500 border-slate-800"
                }`}
              >
                {step > s.num ? "✓" : s.num}
              </span>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  step === s.num ? "text-slate-200" : "text-slate-500"
                }`}
              >
                {s.label}
              </span>
            </div>
            {idx < 2 && (
              <ChevronRight
                className={`h-4 w-4 ${step > s.num ? "text-emerald-500" : "text-slate-800"}`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Error Alert panel */}
      {error && (
        <div className="rounded-xl border border-rose-900/50 bg-rose-950/20 p-5 flex items-start gap-3.5 glow-red">
          <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-rose-300">Form Error</h3>
            <p className="text-xs text-rose-400/90 leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* --- Step 1: Form Inputs --- */}
      {step === 1 && (
        <form onSubmit={handleGetRecommendations} className="rounded-2xl glass-panel p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 border-b border-slate-850 pb-2">
              <Brain className="h-4 w-4 text-cyan-400" /> Define Target Model Specifications
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              
              {/* Model Name */}
              <div className="sm:col-span-2 space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Model Name</label>
                <input
                  type="text"
                  placeholder="e.g. churn_prediction"
                  required
                  value={modelName}
                  onChange={(e) => setModelName(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs bg-slate-900/60 border border-slate-800 focus:border-cyan-500 rounded-xl outline-none text-slate-200 transition-all font-mono"
                />
              </div>

              {/* Version */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Deploy Version</label>
                <input
                  type="text"
                  placeholder="e.g. v1.0"
                  required
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  className="w-full px-4 py-2.5 text-xs bg-slate-900/60 border border-slate-800 focus:border-cyan-500 rounded-xl outline-none text-slate-200 transition-all font-mono"
                />
              </div>
            </div>

            {/* Model Task */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Model Task Type</label>
              <select
                value={modelTask}
                onChange={(e) => setModelTask(e.target.value)}
                className="w-full px-4 py-2.5 text-xs bg-slate-900/60 border border-slate-800 focus:border-cyan-500 rounded-xl outline-none text-slate-200 transition-all"
              >
                <option value="classification">Classification (Predict Categories, Churn, Fraud)</option>
                <option value="regression">Regression (Predict Numeric Amounts, Lifetime Value, Price)</option>
                <option value="ranking">Ranking (Relevance, Recommendation Grids)</option>
                <option value="clustering">Clustering (Unsupervised user cohort profiling)</option>
              </select>
            </div>

            {/* Model Description */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Model Goal & Description</label>
              <textarea
                placeholder="Describe the target objectives, input signals, and business constraints of this model in detail so the AI can rank features correctly..."
                rows={4}
                required
                value={modelDescription}
                onChange={(e) => setModelDescription(e.target.value)}
                className="w-full px-4 py-2.5 text-xs bg-slate-900/60 border border-slate-800 focus:border-cyan-500 rounded-xl outline-none text-slate-200 transition-all placeholder:text-slate-600 leading-relaxed"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-1.5 transition-all"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Suggesting Features...
                </>
              ) : (
                <>
                  Get Recommendations <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* --- Step 2: Recommendations List --- */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="rounded-2xl glass-panel p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2 border-b border-slate-850 pb-2">
              <Cpu className="h-4 w-4 text-cyan-400" /> Bound Semantic Recommendations
            </h3>
            
            <p className="text-xs text-slate-400 leading-relaxed">
              We evaluated <span className="font-bold text-slate-350">{recommendations.length}</span> active features in your store. The LLM has ranked and explained which signals carry high predictive relevance for <span className="font-bold text-cyan-400">{modelName}</span>. Check the ones you want to link.
            </p>
            
            <FeatureRecommendations
              recommendations={recommendations}
              selectedFeatureIds={selectedFeatureIds}
              onChangeSelection={setSelectedFeatureIds}
            />
          </div>

          {/* Stepper actions */}
          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 border border-slate-800 text-slate-450 hover:text-slate-200 transition flex items-center gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Specs
            </button>
            
            <button
              type="button"
              onClick={handleRegisterModel}
              disabled={registering || selectedFeatureIds.length === 0}
              className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-1.5 transition"
            >
              {registering ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Registering Model...
                </>
              ) : (
                <>
                  <Layers className="h-4 w-4 text-emerald-300" /> Register Model configuration
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* --- Step 3: Success Completion --- */}
      {step === 3 && registeredModel && (
        <div className="rounded-2xl glass-panel p-8 space-y-6 text-center animate-in zoom-in duration-300">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto shadow shadow-emerald-500/10">
            <CheckCircle className="h-7 w-7" />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-100">Model Deployment Logged</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              ML Model schema definitions and bound features list have been locked in repository metadata registry.
            </p>
          </div>

          {/* Locked stats summaries */}
          <div className="max-w-md mx-auto grid grid-cols-2 gap-4 bg-slate-950/40 p-4 rounded-2xl border border-slate-850/80 text-left text-xs text-slate-450 leading-relaxed font-mono">
            <div>
              <span className="block text-[10px] text-slate-500 uppercase tracking-wide">Registry Name</span>
              <span className="text-slate-200 font-bold truncate block">{registeredModel.name}</span>
            </div>
            <div>
              <span className="block text-[10px] text-slate-500 uppercase tracking-wide">Version</span>
              <span className="text-slate-200 font-bold block">{registeredModel.version}</span>
            </div>
            <div className="col-span-2 pt-2 border-t border-slate-900">
              <span className="block text-[10px] text-slate-500 uppercase tracking-wide">Model ID UUID</span>
              <span className="text-cyan-400 font-bold break-all block">{registeredModel.id}</span>
            </div>
            <div className="col-span-2 pt-2 border-t border-slate-900 flex justify-between">
              <div>
                <span className="block text-[10px] text-slate-500 uppercase tracking-wide">Bound Features Count</span>
                <span className="text-emerald-400 font-bold block">{registeredModel.features.length} features linked</span>
              </div>
              <Activity className="h-5 w-5 text-emerald-500 shrink-0 self-center opacity-40" />
            </div>
          </div>

          <div className="flex justify-center gap-4 pt-2">
            <button
              onClick={handleReset}
              className="px-5 py-2.5 text-xs font-semibold rounded-xl bg-slate-900 border border-slate-800 text-slate-350 hover:text-slate-100 flex items-center justify-center gap-1.5 transition"
            >
              <Plus className="h-4 w-4 text-cyan-400" /> Log another model
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
