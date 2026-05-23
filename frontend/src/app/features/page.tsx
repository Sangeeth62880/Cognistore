"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

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
    <div className="space-y-6 max-w-full mx-auto font-sans">
      
      {/* Top Header Section */}
      <div className="flex flex-row items-center justify-between border-b border-[#1f1f1f] pb-4">
        <div className="space-y-1">
          <span className="text-[11px] font-mono text-[#666666] uppercase tracking-wider block">
            FEATURE STORE REGISTRY
          </span>
          <p className="text-[13px] text-[#666666] leading-normal max-w-xl">
            Register and serve machine learning features across offline training and online prediction stores.
          </p>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchFeatures}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-mono border border-[#1f1f1f] bg-transparent text-[#e8e8e8] rounded-[4px] hover:bg-[#111111] hover:border-[#666666] transition-colors duration-150"
          >
            {loading ? "SYNCING..." : "SYNC REGISTRY"}
          </button>
          
          <Link href="/features/new">
            <button className="px-3 py-1.5 text-xs font-mono bg-[#2563eb] text-white rounded-[4px] hover:bg-[#2563eb]/90 transition-colors duration-150">
              CREATE FEATURE
            </button>
          </Link>
        </div>
      </div>

      {/* Error Panel */}
      {error && (
        <div className="rounded-[4px] border border-[#dc2626] bg-[#dc2626]/5 p-4 text-[12px] font-mono text-[#dc2626]">
          [ERROR] Connection failure: {error}
        </div>
      )}

      {/* Search Bar */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Filter features by name, entity, tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 px-3 py-1.5 text-xs bg-[#111111] border border-[#1f1f1f] rounded-[4px] outline-none text-[#e8e8e8] font-mono focus:border-[#2563eb] placeholder:text-[#444444]"
        />
      </div>

      {/* Main Table Container */}
      <div className="bg-[#111111] border border-[#1f1f1f] rounded-[4px] overflow-hidden">
        <table className="dev-table">
          <thead>
            <tr>
              <th className="w-[35%]">Feature Name</th>
              <th className="w-[30%]">Description</th>
              <th className="w-[12%]">Entity</th>
              <th className="w-[15%]">Tags</th>
              <th className="w-[8%]">Version</th>
            </tr>
          </thead>
          <tbody>
            {loading && features.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-12 text-center text-[#666666] font-mono">
                  RETRIEVING REGISTERED SCHEMAS...
                </td>
              </tr>
            ) : filteredFeatures.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-12 text-center text-[#444444] font-mono">
                  NO FEATURE SCHEMAS FOUND IN REGISTRY.
                </td>
              </tr>
            ) : (
              filteredFeatures.map((feat) => {
                const tags = getTagsList(feat.tags);
                return (
                  <tr key={feat.id}>
                    <td className="font-mono text-[#e8e8e8] font-semibold">{feat.name}</td>
                    <td className="text-[#666666] text-xs leading-normal">{feat.description || "No description provided."}</td>
                    <td className="font-mono text-[#a3e635] text-[11px] uppercase">{feat.entity_type}</td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-1.5 py-0.5 rounded-[2px] bg-[#161616] border border-[#1f1f1f] text-[9px] font-mono text-[#666666] uppercase"
                          >
                            {tag}
                          </span>
                        ))}
                        {tags.length === 0 && (
                          <span className="text-[10px] text-[#444444] font-mono italic">NONE</span>
                        )}
                      </div>
                    </td>
                    <td className="font-mono text-[#a3e635] text-[11px] font-semibold">
                      v{feat.version}.0
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
