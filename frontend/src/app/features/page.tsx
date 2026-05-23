"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Cpu, Search, Plus, Filter, Tag, RefreshCw, AlertCircle } from "lucide-react";

interface FeatureItem {
  id: string;
  name: string;
  entity_type: string;
  description: string;
  tags: Record<string, boolean> | string[] | null;
  version: number;
  created_at: string;
}

export default function FeaturesPage() {
  const [features, setFeatures] = useState<FeatureItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const apiKey = "supersecretkeyreplaceinproduction";

  const fetchFeatures = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/features`, {
        headers: {
          "X-API-Key": apiKey,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch features list from the registry.");
      }

      const list = await response.json();
      setFeatures(list);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred while loading features.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeatures();
  }, []);

  const getTagsList = (tags: Record<string, boolean> | string[] | null): string[] => {
    if (!tags) return [];
    if (Array.isArray(tags)) return tags;
    return Object.keys(tags).filter((k) => tags[k] === true);
  };

  // Filter features based on search query
  const filteredFeatures = features.filter((feat) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    
    const tags = getTagsList(feat.tags).join(" ").toLowerCase();
    return (
      feat.name.toLowerCase().includes(query) ||
      feat.entity_type.toLowerCase().includes(query) ||
      (feat.description && feat.description.toLowerCase().includes(query)) ||
      tags.includes(query)
    );
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-6xl mx-auto">
      
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Cpu className="h-6 w-6 text-violet-400 font-bold" /> Feature Registry
          </h1>
          <p className="text-sm text-slate-400">
            Define, register, and serve machine learning features across offline and online stores.
          </p>
        </div>
        
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={fetchFeatures}
            disabled={loading}
            className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-450 hover:text-slate-200 hover:border-slate-700 transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          
          <Link href="/features/new">
            <button className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20 transition-all shrink-0">
              <Plus className="h-4 w-4" /> Register Feature
            </button>
          </Link>
        </div>
      </div>

      {/* Error Alert Display */}
      {error && (
        <div className="rounded-xl border border-rose-900/50 bg-rose-950/20 p-5 flex items-start gap-3.5 glow-red">
          <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-rose-300">Connection Error</h3>
            <p className="text-xs text-rose-400/90 leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search features by name, entity type, tags, description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 text-sm bg-slate-900/60 border border-slate-800 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 rounded-xl outline-none text-slate-200 transition-all placeholder:text-slate-500"
          />
        </div>
        <button className="flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold rounded-xl bg-slate-900/60 border border-slate-800 text-slate-300 hover:bg-slate-800/60 transition-colors">
          <Filter className="h-4 w-4" /> Filters
        </button>
      </div>

      {/* Features List Table */}
      <div className="rounded-2xl glass-panel p-6">
        <div className="overflow-x-auto border border-slate-800/80 bg-slate-900/30 rounded-xl">
          <table className="min-w-full divide-y divide-slate-800">
            <thead>
              <tr className="bg-slate-900/60">
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Feature Details
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Entity
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Tags
                </th>
                <th className="px-6 py-3.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Version
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-350">
              {loading && features.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-xs text-slate-500">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-violet-400 mb-2" />
                    Loading registered features...
                  </td>
                </tr>
              ) : filteredFeatures.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-xs text-slate-500">
                    No active features found matching the description or filters.
                  </td>
                </tr>
              ) : (
                filteredFeatures.map((feat) => {
                  const tags = getTagsList(feat.tags);
                  return (
                    <tr key={feat.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <span className="text-sm font-semibold text-slate-200 block">{feat.name}</span>
                          <span className="text-xs text-slate-400 block max-w-xl">{feat.description || "No description provided."}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-300 uppercase font-mono">
                        {feat.entity_type}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {tags.map((tag) => (
                            <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-slate-800 border border-slate-700 px-2 py-0.5 text-[10px] text-slate-350 font-medium capitalize">
                              <Tag className="h-2.5 w-2.5 text-violet-400" /> {tag}
                            </span>
                          ))}
                          {tags.length === 0 && <span className="text-xs text-slate-655 font-mono italic">No tags</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-slate-400">
                        v{feat.version}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
