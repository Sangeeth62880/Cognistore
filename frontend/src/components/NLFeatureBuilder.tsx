"use client";

import React, { useState } from "react";
import {
  RefreshCw,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

export default function NLFeatureBuilder() {
  const [step, setStep] = useState<number>(1);
  const [description, setDescription] = useState<string>(
    "Calculate the average transaction amount for each user in the last 30 days."
  );
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

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/nl-features/generate-and-register`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          description: description,
          entity_type: entityType,
          sample_columns: columnsInput
            .split(",")
            .map((c) => c.trim())
            .filter((c) => c.length > 0),
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
    setDescription("Calculate the average transaction amount for each user in the last 30 days.");
    setEntityType("user");
    setColumnsInput("user_id, amount, timestamp");
    setGeneratedFeature(null);
    setRegistrationResult(null);
    setError(null);
    setStep(1);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto font-sans">
      {/* Visual Step Indicator */}
      <div className="flex items-center justify-between max-w-lg mx-auto">
        {[1, 2, 3].map((s) => {
          const isActive = step === s;
          const isCompleted = step > s;

          return (
            <React.Fragment key={s}>
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full border text-sm font-semibold transition-all duration-300 ${
                    isActive
                      ? "bg-[#111111] border-[#111111] text-white"
                      : isCompleted
                      ? "bg-emerald-500/10 border-emerald-500 text-emerald-600"
                      : "border-[#e5e7eb] bg-white text-[#9ca3af]"
                  }`}
                >
                  {isCompleted ? "✓" : s}
                </div>
                <span
                  className={`text-xs font-semibold hidden sm:inline ${
                    isActive ? "text-[#111111]" : "text-[#6b7280]"
                  }`}
                >
                  {s === 1 ? "Describe" : s === 2 ? "Review spec" : "Register"}
                </span>
              </div>
              {s < 3 && (
                <div
                  className={`flex-1 h-0.5 mx-4 rounded transition-all duration-300 ${
                    step > s ? "bg-emerald-500/30" : "bg-[#e5e7eb]"
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Error Alert Display */}
      {error && (
        <div className="rounded-[8px] border border-[#ef4444] bg-[#ef4444]/5 p-4 flex items-start gap-3 text-[13px] text-[#ef4444]">
          <AlertCircle className="h-5 w-5 text-[#ef4444] shrink-0" />
          <div className="space-y-1">
            <h3 className="font-semibold">Prompt generation failed</h3>
            <p className="text-xs opacity-90 leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* --- Step 1: Input Form --- */}
      {step === 1 && (
        <form onSubmit={handleGenerate} className="bg-white border border-[#e5e7eb] rounded-[12px] p-8 space-y-6">
          {/* API Key Configuration Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[#f8f9fa] rounded-[8px] border border-[#e5e7eb]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#374151] font-sans">Auth Header Required</span>
            </div>
            <input
              type="password"
              placeholder="Enter X-API-Key..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="search-input w-full sm:w-64 font-mono text-xs"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[13px] font-medium text-[#374151] block font-sans">
              Describe your feature in plain English
            </label>
            <textarea
              rows={4}
              placeholder="e.g. Calculate the average transaction amount for each user in the last 30 days."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-[#e5e7eb] rounded-[8px] outline-none text-[#111111] focus:ring-1 focus:ring-[#111111] placeholder:text-[#9ca3af] transition-all duration-150 leading-relaxed resize-none"
            />
            <span className="text-[10px] text-[#6b7280] block text-right font-sans">
              Max 500 characters. Strip HTML. Rejects prompt injection strings.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-[#374151] block font-sans">
                Target Entity Type
              </label>
              <input
                type="text"
                placeholder="user"
                value={entityType}
                onChange={(e) => setEntityType(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#e5e7eb] rounded-[8px] outline-none text-[#111111] focus:ring-1 focus:ring-[#111111] placeholder:text-[#9ca3af] transition-all duration-150"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-medium text-[#374151] block font-sans">
                Sample Input Columns (comma separated)
              </label>
              <input
                type="text"
                placeholder="user_id, amount, timestamp"
                value={columnsInput}
                onChange={(e) => setColumnsInput(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#e5e7eb] rounded-[8px] outline-none text-[#111111] focus:ring-1 focus:ring-[#111111] placeholder:text-[#9ca3af] transition-all duration-150 font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" /> Translating natural language spec...
              </>
            ) : (
              "Generate feature spec"
            )}
          </button>
        </form>
      )}

      {/* --- Step 2: Spec Review Block --- */}
      {step === 2 && generatedFeature && (
        <div className="space-y-6">
          <div className="bg-white border border-[#e5e7eb] rounded-[12px] p-8 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b border-[#e5e7eb] pb-6">
              <div className="space-y-1">
                <span className="text-xs font-semibold text-[#6b7280] font-sans">
                  Generated Specification
                </span>
                <h2 className="text-[18px] font-semibold text-[#111111] font-sans">
                  {generatedFeature.feature_name}
                </h2>
              </div>
              <div className="flex gap-2">
                <span className="tag-pill font-sans">
                  Entity: {entityType}
                </span>
              </div>
            </div>

            <div className="space-y-4 text-sm text-[#374151]">
              <div>
                <span className="font-medium text-[#6b7280] block mb-1 font-sans">Functional Description:</span>
                <p className="leading-relaxed font-sans">{generatedFeature.description}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="space-y-2">
                  <span className="font-medium text-[#6b7280] flex items-center gap-1.5 font-sans">
                    Required Columns
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {generatedFeature.expected_input_columns.map((col) => (
                      <span key={col} className="px-2 py-0.5 rounded bg-[#f5f5f5] border border-[#e5e7eb] text-xs font-mono text-[#374151]">
                        {col}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <span className="font-medium text-[#6b7280] flex items-center gap-1.5 font-sans">
                    Classification Tags
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {generatedFeature.tags.map((tag) => (
                      <span key={tag} className="tag-pill">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Ingestion Logic Code Block */}
            <div className="space-y-2 pt-4">
              <span className="text-sm font-medium text-[#6b7280] flex items-center gap-2 font-sans">
                Python (Pandas) Ingestion Logic
              </span>
              <pre className="p-5 rounded-[8px] border border-[#e5e7eb] bg-[#f8f9fa] text-xs font-mono text-[#111111] overflow-x-auto leading-relaxed shadow-none">
                <code>{generatedFeature.computation_code}</code>
              </pre>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t border-[#e5e7eb]">
              <button
                onClick={() => setStep(1)}
                className="btn-secondary flex-1 flex items-center justify-center gap-2"
              >
                <RefreshCw className="h-4 w-4" /> Edit description
              </button>
              <button
                onClick={handleRegister}
                disabled={loading}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Ingesting to DB...
                  </>
                ) : (
                  "Register feature"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Step 3: Success State --- */}
      {step === 3 && registrationResult && (
        <div className="bg-white border border-[#e5e7eb] rounded-[12px] p-8 text-center space-y-6 shadow-none">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 mx-auto">
            <CheckCircle className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-[22px] font-semibold text-[#111111] font-sans">Feature Ingestion Complete!</h2>
            <p className="text-sm text-[#6b7280] max-w-md mx-auto leading-relaxed font-sans">
              Feature <span className="font-mono text-[#2563eb] font-semibold">{registrationResult.name}</span> has been parsed, validated by AST syntax sweeps, and successfully registered inside the metadata table.
            </p>
          </div>

          <div className="p-4 rounded-[8px] bg-[#f5f5f5] border border-[#e5e7eb] max-w-sm mx-auto space-y-1.5 text-xs text-[#374151]">
            <div className="flex justify-between">
              <span className="font-sans">Database UUID:</span>
              <span className="font-mono text-[#111111] select-all">{registrationResult.feature_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-sans">Ingested Status:</span>
              <span className="font-semibold text-emerald-600 font-sans">Active</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4 max-w-md mx-auto">
            <button
              onClick={handleReset}
              className="btn-primary flex-1"
            >
              Define another feature
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
