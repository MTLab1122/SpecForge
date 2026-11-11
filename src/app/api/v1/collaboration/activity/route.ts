import { NextRequest, NextResponse } from "next/server";

let mockActivities = [
  {
    id: "act_1",
    actorName: "Sarah (Agency Founder)",
    actorType: "TEAM_MEMBER",
    activityType: "PROPOSAL_SENT",
    title: "Sent Proposal v1.0 to Client",
    description: "Generated tokenized review link and dispatched to client team via Resend.",
    projectName: "Fintech Mobile MVP (Sandbox)",
    timeAgo: "22m ago",
    createdAt: "2026-11-09T09:10:00Z"
  },
  {
    id: "act_2",
    actorName: "Kareem (Alpha Bank)",
    actorType: "CLIENT",
    activityType: "COMMENT_ADDED",
    title: "Client Added a Question",
    description: "Asked a clarification question regarding payment settlement currency on Proposal v1.0.",
    projectName: "Fintech Mobile MVP (Sandbox)",
    timeAgo: "45m ago",
    createdAt: "2026-11-09T08:45:00Z"
  },
  {
    id: "act_3",
    actorName: "SpecForge AI",
    actorType: "SYSTEM_AI",
    activityType: "AI_EXTRACTION_REVIEWED",
    title: "AI Extraction Completed (Thorough Mode)",
    description: "Extracted 8 core features with sentence-level citations and 2 assumptions.",
    projectName: "Fintech Mobile MVP (Sandbox)",
    timeAgo: "1h ago",
    createdAt: "2026-11-09T08:30:00Z"
  },
  {
    id: "act_4",
    actorName: "Farhan (Technical Lead)",
    actorType: "TEAM_MEMBER",
    activityType: "ESTIMATE_UPDATED",
    title: "Applied P80 Contingency (18%)",
    description: "Updated estimation matrix with Senior Architect rate card ($85/hr).",
    projectName: "Headless Shopify Storefront",
    timeAgo: "3h ago",
    createdAt: "2026-11-09T06:30:00Z"
  }
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const actorType = searchParams.get("actorType");
  const projectName = searchParams.get("projectName");

  let filtered = mockActivities;
  if (actorType && actorType !== "ALL") {
    filtered = filtered.filter((a) => a.actorType === actorType);
  }
  if (projectName && projectName !== "ALL") {
    filtered = filtered.filter((a) => a.projectName === projectName);
  }

  return NextResponse.json({
    success: true,
    data: filtered
  });
}

