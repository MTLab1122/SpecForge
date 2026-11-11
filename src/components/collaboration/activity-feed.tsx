"use client";

import React, { useState } from "react";

export interface ActivityItem {
  id: string;
  actorName: string;
  actorType: "TEAM_MEMBER" | "CLIENT" | "SYSTEM_AI";
  activityType: string;
  title: string;
  description: string;
  projectName?: string;
  timeAgo: string;
  createdAt: string;
}

interface ActivityFeedProps {
  initialActivities: ActivityItem[];
  availableProjects: { id: string; name: string }[];
}

export function ActivityFeed({ initialActivities, availableProjects }: ActivityFeedProps) {
  const [activities, setActivities] = useState<ActivityItem[]>(initialActivities);
  const [filterActorType, setFilterActorType] = useState<string>("ALL");
  const [filterProject, setFilterProject] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredActivities = activities.filter((act) => {
    if (filterActorType !== "ALL" && act.actorType !== filterActorType) return false;
    if (filterProject !== "ALL" && act.projectName !== filterProject) return false;
    if (
      searchQuery &&
      !act.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !act.description.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !act.actorName.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Workspace Activity Feed</h3>
          <p className="text-xs text-slate-500">Live timeline of team edits, client reviews, and AI generations</p>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Actor Filter */}
          <select
            value={filterActorType}
            onChange={(e) => setFilterActorType(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 outline-none"
          >
            <option value="ALL">All Actors</option>
            <option value="TEAM_MEMBER">Team Activity</option>
            <option value="CLIENT">Client Activity</option>
            <option value="SYSTEM_AI">AI Generations</option>
          </select>

          {/* Project Filter */}
          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 outline-none"
          >
            <option value="ALL">All Projects</option>
            {availableProjects.map((p) => (
              <option key={p.id} value={p.name}>
                {p.name}
              </option>
            ))}
          </select>

          {/* Search Input */}
          <input
            type="text"
            placeholder="Search activity..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-slate-700 outline-none max-w-[140px]"
          />
        </div>
      </div>

      {/* Activity Timeline List */}
      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
        {filteredActivities.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No activity matches your filters.
          </div>
        ) : (
          filteredActivities.map((act) => {
            const isClient = act.actorType === "CLIENT";
            const isAi = act.actorType === "SYSTEM_AI";

            return (
              <div
                key={act.id}
                className="flex items-start gap-3 p-3 rounded-xl border border-slate-150 bg-slate-50/40 hover:bg-white hover:shadow-2xs transition"
              >
                {/* Avatar Icon by Actor Type */}
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white ${
                  isClient ? "bg-emerald-600" : isAi ? "bg-purple-600" : "bg-blue-600"
                }`}>
                  {isClient ? "👤" : isAi ? "⚡" : act.actorName.charAt(0)}
                </div>

                {/* Details */}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{act.actorName}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
                        isClient ? "bg-emerald-100 text-emerald-800" :
                        isAi ? "bg-purple-100 text-purple-800" :
                        "bg-blue-100 text-blue-800"
                      }`}>
                        {act.actorType.replace("_", " ")}
                      </span>
                      {act.projectName && (
                        <span className="text-[11px] text-slate-400 font-medium">
                          in {act.projectName}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">{act.timeAgo}</span>
                  </div>

                  <div className="text-xs font-semibold text-slate-800">{act.title}</div>
                  <p className="text-xs text-slate-600 leading-relaxed">{act.description}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

