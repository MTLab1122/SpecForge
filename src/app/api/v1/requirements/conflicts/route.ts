import { NextRequest, NextResponse } from "next/server";
import { ConflictDetector } from "@/lib/ai/conflict-detector";
import { ResolveConflictSchema } from "@/lib/validations/trustworthy-ai";

let mockConflicts = [
  {
    id: "conf_platform_mismatch",
    conflictType: "CONTRADICTION",
    severity: "CRITICAL",
    title: "Platform Contradiction Detected (iOS-Only vs Cross-Platform)",
    description: "Brief states 'iOS Native' in WhatsApp voice note, but Section 3 of PDF references 'Android Play Store rollout'.",
    affectedItemIds: ["req_feat_1", "req_feat_4"],
    resolutionStatus: "OPEN",
    suggestedAction: "Clarify target mobile operating systems with client."
  },
  {
    id: "conf_missing_ac_otp",
    conflictType: "MISSING_ACCEPTANCE_CRITERIA",
    severity: "HIGH",
    title: "Missing Acceptance Criteria on Story: OTP Login",
    description: "User story lacks testable Given/When/Then conditions (e.g. rate limits, SMS expiration timeout).",
    affectedItemIds: ["story_otp_1"],
    resolutionStatus: "OPEN",
    suggestedAction: "Add at least 2 acceptance criteria before freezing scope."
  },
  {
    id: "conf_dup_cart",
    conflictType: "DUPLICATE_FEATURE",
    severity: "MEDIUM",
    title: "Duplicate Feature: Cart Persistence & Basket Sync",
    description: "Both items describe Redis-backed shopping cart storage. Merge into single feature.",
    affectedItemIds: ["feat_cart_1", "feat_cart_2"],
    resolutionStatus: "OPEN",
    suggestedAction: "Merge duplicate features to prevent double-counting in estimation."
  }
];

export async function GET(req: NextRequest) {
  return NextResponse.json({
    success: true,
    data: {
      totalConflicts: mockConflicts.length,
      unresolvedCount: mockConflicts.filter((c) => c.resolutionStatus === "OPEN").length,
      conflicts: mockConflicts
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = ResolveConflictSchema.parse(body);

    mockConflicts = mockConflicts.map((c) => {
      if (c.id === validated.conflictId) {
        return {
          ...c,
          resolutionStatus: validated.resolutionStatus,
          resolutionNotes: validated.resolutionNotes
        };
      }
      return c;
    });

    return NextResponse.json({
      success: true,
      data: mockConflicts.find((c) => c.id === validated.conflictId)
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "CONFLICT_RESOLUTION_FAILED", message: error.message } },
      { status: 400 }
    );
  }
}
