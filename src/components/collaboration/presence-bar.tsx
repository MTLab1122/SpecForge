"use client";

import React, { useState, useEffect } from "react";

export interface ActiveUser {
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  activeSection: string;
  lockedItemId?: string | null;
}

interface PresenceBarProps {
  projectId: string;
  currentUser: { userId: string; name: string; email: string };
  currentSection: "SCOPE_BUILDER" | "ESTIMATE_BUILDER" | "TASKS" | "PROPOSAL_PREVIEW" | "OVERVIEW";
  activeItemId?: string | null;
}

export function PresenceBar({
  projectId,
  currentUser,
  currentSection,
  activeItemId
}: PresenceBarProps) {
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);

  useEffect(() => {
    // Send heartbeat immediately on mount
    sendHeartbeat();

    // Pulse heartbeat every 12 seconds
    const interval = setInterval(sendHeartbeat, 12000);
    return () => clearInterval(interval);

    async function sendHeartbeat() {
      try {
        const res = await fetch("/api/v1/collaboration/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            activeSection: currentSection,
            lockedItemId: activeItemId || null
          })
        });
        const result = await res.json();
        if (result.success) {
          setActiveUsers(result.data.activeUsers);
        }
      } catch (err) {
        console.error("Presence heartbeat error:", err);
      }
    }
  }, [projectId, currentSection, activeItemId]);

  const otherUsers = activeUsers.filter((u) => u.userId !== currentUser.userId);

  return (
    <div className="flex items-center gap-3">
      {/* Active Avatars Stack */}
      <div className="flex items-center -space-x-2 overflow-hidden">
        {/* Current User Pill */}
        <div 
          title={`You (${currentUser.name}) - Active in ${currentSection}`}
          className="inline-block h-7 w-7 rounded-full ring-2 ring-white bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0"
        >
          {currentUser.name.charAt(0).toUpperCase()}
        </div>

        {/* Other Active Teammates */}
        {otherUsers.map((user) => (
          <div
            key={user.userId}
            title={`${user.name} - Viewing ${user.activeSection}${user.lockedItemId ? ` (Editing ${user.lockedItemId})` : ""}`}
            className="relative inline-block h-7 w-7 rounded-full ring-2 ring-white bg-slate-800 text-white flex items-center justify-center text-xs font-bold shrink-0 cursor-pointer"
          >
            {user.name.charAt(0).toUpperCase()}
            {user.lockedItemId && (
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-amber-400 border border-white" />
            )}
          </div>
        ))}
      </div>

      {/* Online indicator label */}
      <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-medium">
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        <span>
          {otherUsers.length === 0
            ? "Only you here"
            : `${otherUsers.length + 1} collaborators active`}
        </span>
      </div>
    </div>
  );
}

