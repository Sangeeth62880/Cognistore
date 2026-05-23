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
      <div className="flex flex-row items-center justify-between border-b border-[#e5e7eb] pb-4">
        <div className="space-y-1">
          <h1 className="text-[22px] font-semibold tracking-tight text-[#111111] font-sans">
            Features
          </h1>
          <p className="text-[14px] text-[#6b7280] leading-normal max-w-xl font-sans">
            Register and serve machine learning features across offline training and online prediction stores.
          </p>
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={fetchFeatures}
            disabled={loading}
            className="btn-secondary"
          >
            {loading ? "Syncing..." : "Sync registry"}
          </button>
          
          <Link href="/features/new">
            <button className="btn-primary">
              Create feature
            </button>
          </Link>
        </div>
      </div>

      {/* Error Panel */}
      {error && (
        <div className="rounded-lg border border-[#ef4444] bg-[#ef4444]/5 p-4 text-[12px] font-mono text-[#ef4444]">
          [Error] Connection failure: {error}
        </div>
      )}

      {/* Search Bar */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Filter features by name, entity, tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input flex-1"
        />
      </div>

      {/* Main Table Container */}
      <div className="w-full overflow-x-auto">
        <table className="dev-table">
          <thead>
            <tr>
              <th className="w-[35%] font-sans">Feature name</th>
              <th className="w-[30%] font-sans">Description</th>
              <th className="w-[12%] font-sans">Entity</th>
              <th className="w-[15%] font-sans">Tags</th>
              <th className="w-[8%] font-sans">Version</th>
            </tr>
          </thead>
          <tbody>
            {loading && features.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-12 text-center text-[#6b7280] font-sans text-sm">
                  Retrieving registered schemas...
                </td>
              </tr>
            ) : filteredFeatures.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-12 text-center text-[#6b7280] font-sans text-sm">
                  No feature schemas found in registry.
                </td>
              </tr>
            ) : (
              filteredFeatures.map((feat) => {
                const tags = getTagsList(feat.tags);
                return (
                  <tr key={feat.id}>
                    <td className="font-sans text-[#111111] font-semibold text-sm">{feat.name}</td>
                    <td className="font-sans text-[#374151] text-sm leading-normal">{feat.description || "No description provided."}</td>
                    <td className="font-sans text-[#374151] text-sm">{feat.entity_type}</td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="tag-pill"
                          >
                            {tag}
                          </span>
                        ))}
                        {tags.length === 0 && (
                          <span className="text-[12px] text-[#9ca3af] font-sans italic">None</span>
                        )}
                      </div>
                    </td>
                    <td className="font-mono text-[#111111] text-[13px] font-medium">
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
