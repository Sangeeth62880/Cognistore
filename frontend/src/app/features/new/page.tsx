import React from "react";
import NLFeatureBuilder from "@/components/NLFeatureBuilder";

export default function NewFeaturePage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-sans">
      {/* Page Header */}
      <div className="border-b border-[#e5e7eb] pb-6">
        <h1 className="text-[22px] font-semibold tracking-tight text-[#111111] font-sans">
          Define Feature in Plain English
        </h1>
        <p className="text-[14px] text-[#6b7280] mt-2 max-w-2xl leading-relaxed font-sans">
          Type a description of your business logic. Our intelligence agent will dynamically translate it into an optimized Python (Pandas) ingestion script, run syntactic AST sweeps, dry-run on synthetic data, and register it for real-time serving in a single click.
        </p>
      </div>

      {/* Feature Builder Multi-step component */}
      <NLFeatureBuilder />
    </div>
  );
}

