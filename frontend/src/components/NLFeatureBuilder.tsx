"use client";

import React, { useState } from "react";
import {
  Brain,
  Sparkles,
  ArrowRight,
  Code,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Cpu,
  Tag,
  Columns,
  Key,
} from "lucide-react";

export default function NLFeatureBuilder() {
  const [step, setStep] = useState<number>(1);
  const [description, setDescription] = useState<string>("");
  const [entityType, setEntityType] = useState<string>("user");
  const [columnsInput, setColumnsInput] = useState<string>("user_id, amount, timestamp");
  const [apiKey, setApiKey] = useState<string>("supersecretkeyreplaceinproduction");

  // Loading and Error states
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Generated and registered data
  const [generatedFeature, setGeneratedFeature] = useState<{
    feature_name: string;
    description: string;
    computation_code: string;
    expected_input_columns: string[];
    tags: string[];
  } | null>(null);

  const [registrationResult, setRegistrationResult] = useState<{
    feature_id: string;
    name: string;
  } | null>(null);

  const getHeaders = () => {
    return {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    };
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError("Please describe the feature you want to build.");
      return;
    }

    setLoading(true);
    setError(null);

    const cols = columnsInput
      .split(",")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/nl-features/generate`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          description: description,
          entity_type: entityType,
          sample_columns: cols,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Failed to generate feature preview.");
      }

      const spec = await response.json();
      setGeneratedFeature(spec);
      setStep(2);
    } catch (err: any) {
      console.error("Feature generation failed:", err);
      setError(err.message || "An unexpected error occurred during code generation.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setLoading(true);
    setError(null);

    const cols = columnsInput
      .split(",")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/nl-features/generate-and-register`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          description: description,
          entity_type: entityType,
          sample_columns: cols,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || "Failed to register generated feature.");
      }

      const res = await response.json();
      setRegistrationResult(res);
      setStep(3);
    } catch (err: any) {
      console.error("Feature registration failed:", err);
      setError(err.message || "An unexpected error occurred during database registration.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setDescription("");
    setEntityType("user");
    setColumnsInput("user_id, amount, timestamp");
    setGeneratedFeature(null);
    setRegistrationResult(null);
    setError(null);
    setStep(1);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Visual Step Indicator */}
      <div className="flex items-center justify-between max-w-lg mx-auto">
        {[1, 2, 3].map((s) => (
          <React.Fragment key={s}>
            <div className="flex items-center gap-2">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition-all duration-300 ${
                  step === s
                    ? "bg-violet-600 border-violet-500 text-white glow-indigo shadow-md shadow-violet-500/20 scale-105"
                    : step > s
                    ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                    : "border-slate-800 bg-slate-950/40 text-slate-500"
                }`}
              >
                {step > s ? <CheckCircle className="h-5 w-5" /> : s}
              </div>
              <span
                className={`text-xs font-semibold hidden sm:inline ${
                  step === s ? "text-slate-200" : "text-slate-500"
                }`}
              >
                {s === 1 ? "Describe" : s === 2 ? "Review Spec" : "Register"}
              </span>
            </div>
            {s < 3 && (
              <div
                className={`flex-1 h-0.5 mx-4 rounded transition-all duration-300 ${
                  step > s ? "bg-emerald-500/50" : "bg-slate-800"
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Error Alert Display */}
      {error && (
        <div className="rounded-xl border border-rose-900/50 bg-rose-950/20 p-5 flex items-start gap-3.5 glow-red">
          <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-rose-300">Prompt / Generation Failed</h3>
            <p className="text-xs text-rose-400/90 leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* --- Step 1: Input Form --- */}
      {step === 1 && (
        <form onSubmit={handleGenerate} className="rounded-2xl glass-panel p-8 space-y-6">
          {/* API Key Configuration Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-900/40 rounded-xl border border-slate-800/80">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-violet-400" />
              <span className="text-xs font-semibold text-slate-300">Auth Header Required</span>
            </div>
            <input
              type="password"
              placeholder="Enter X-API-Key..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-lg outline-none text-slate-200 w-full sm:w-64 font-mono"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-200 block">
              Describe your feature in plain English
            </label>
            <textarea
              rows={4}
              placeholder="e.g. Calculate the average transaction amount for each user in the last 30 days."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 text-sm bg-slate-900/60 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl outline-none text-slate-200 transition-all placeholder:text-slate-600 resize-none leading-relaxed"
            />
            <span className="text-[10px] text-slate-500 block text-right">
              Max 500 characters. Strip HTML. Rejects prompt injection strings.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-200 block">
                Target Entity Type
              </label>
              <input
                type="text"
                placeholder="user"
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-slate-900/60 border border-slate-800 focus:border-violet-500 rounded-xl outline-none text-slate-200"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-200 block">
                Sample Input Columns (comma separated)
              </label>
              <input
                type="text"
                placeholder="user_id, amount, timestamp"
                value={columnsInput}
                onChange={(e) => setColumnsInput(e.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-slate-900/60 border border-slate-800 focus:border-violet-500 rounded-xl outline-none text-slate-200 font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 text-sm font-semibold rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white shadow-lg shadow-violet-500/20 transition-all"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" /> Translating natural language spec...
              </>
            ) : (
              <>
                Generate Feature Spec <Sparkles className="h-4 w-4 text-amber-300" />
              </>
            )}
          </button>
        </form>
      )}

      {/* --- Step 2: Spec Review Block --- */}
      {step === 2 && generatedFeature && (
        <div className="space-y-6">
          <div className="rounded-2xl glass-panel p-8 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-slate-800/80 pb-6">
              <div className="space-y-1">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-violet-500/10 border border-violet-500/20 text-violet-400">
                  GENERATED SPECIFICATION
                </span>
                <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-violet-400" /> {generatedFeature.feature_name}
                </h2>
              </div>
              <div className="flex gap-2">
                <span className="inline-flex items-center rounded-md bg-slate-800 border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-300 uppercase">
                  Entity: {entityType}
                </span>
              </div>
            </div>

            <div className="space-y-4 text-sm text-slate-300">
              <div>
                <span className="font-semibold text-slate-400 block mb-1">Functional Description:</span>
                <p className="leading-relaxed">{generatedFeature.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-2">
                  <span className="font-semibold text-slate-400 flex items-center gap-1.5">
                    <Columns className="h-4 w-4 text-indigo-400" /> Required Columns
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {generatedFeature.expected_input_columns.map((col) => (
                      <span key={col} className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="font-semibold text-slate-400 flex items-center gap-1.5">
                    <Tag className="h-4 w-4 text-violet-400" /> Classification Tags
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {generatedFeature.tags.map((tag) => (
                      <span key={tag} className="px-2.5 py-1 rounded bg-violet-500/10 border border-violet-500/20 text-xs text-violet-400">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Syntax Highlighted Code block */}
            <div className="space-y-2 pt-4">
              <span className="text-sm font-semibold text-slate-400 flex items-center gap-2">
                <Code className="h-4.5 w-4.5 text-violet-400" /> Python (Pandas) Ingestion Logic
              </span>
              <pre className="p-5 rounded-xl border border-slate-800 bg-slate-950/80 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed shadow-inner">
                <code>{generatedFeature.computation_code}</code>
              </pre>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-slate-800/80">
              <button
                onClick={() => setStep(1)}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
              >
                <RefreshCw className="h-4 w-4" /> Edit description
              </button>
              <button
                onClick={handleRegister}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white shadow-lg shadow-violet-500/20 transition-all"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Ingesting to DB...
                  </>
                ) : (
                  <>
                    Register Feature <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Step 3: Success State --- */}
      {step === 3 && registrationResult && (
        <div className="rounded-2xl glass-panel p-8 text-center space-y-6 glow-green border-green-500/10">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mx-auto animate-bounce">
            <CheckCircle className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white">Feature Ingestion Complete!</h2>
            <p className="text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
              Feature <span className="font-mono text-violet-400 font-bold">{registrationResult.name}</span> has been parsed, validated by AST syntax sweeps, and successfully registered inside the metadata table.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 max-w-sm mx-auto space-y-1.5 text-xs text-slate-400">
            <div className="flex justify-between">
              <span>Database UUID:</span>
              <span className="font-mono text-slate-300 select-all">{registrationResult.feature_id}</span>
            </div>
            <div className="flex justify-between">
              <span>Ingested Status:</span>
              <span className="font-semibold text-emerald-400">Active</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4 max-w-md mx-auto">
            <button
              onClick={handleReset}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              Define Another Feature
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
