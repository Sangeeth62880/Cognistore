import React from "react";
import NLFeatureBuilder from "@/components/NLFeatureBuilder";
import { Sparkles, Brain } from "lucide-react";

export default function NewFeaturePage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Page Header */}
      <div className="border-b border-slate-800/80 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <Brain className="h-7 w-7 text-violet-400" /> Define Feature in Plain English
        </h1>
        <p className="text-slate-400 text-sm mt-2 max-w-2xl leading-relaxed">
          Type a description of your business logic. Our intelligence agent (powered by Groq Llama-3) will dynamically translate it into an optimized Python (Pandas) ingestion script, run syntactic AST sweeps, dry-run on synthetic data, and register it for real-time serving in a single click.
        </p>
      </div>

      {/* Feature Builder Multi-step component */}
      <NLFeatureBuilder />
    </div>
  );
}
