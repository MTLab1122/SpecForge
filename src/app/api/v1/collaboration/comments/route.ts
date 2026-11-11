import { NextRequest, NextResponse } from "next/server";
import { CreateCommentSchema, ResolveCommentSchema } from "@/lib/validations/collaboration";

let mockComments = [
  {
    id: "comm_1",
    authorName: "Sarah (Agency Founder)",
    authorRole: "OWNER",
    content: "@Farhan can we ensure the OTP SMS timeout is 120 seconds instead of 60 seconds?",
    entityType: "SCOPE_ITEM",
    entityId: "req_otp_auth",
    entityLabel: "Feature: OTP Phone Authentication",
    mentions: ["Farhan"],
    isResolved: false,
    createdAtTimeAgo: "15m ago",
    attachments: [],
    replies: [
      {
        id: "comm_1_rep_1",
        authorName: "Farhan (Technical Lead)",
        authorRole: "ADMIN",
        content: "Updated acceptance criteria #2 to reflect 120s TTL.",
        entityType: "SCOPE_ITEM",
        isResolved: false,
        createdAtTimeAgo: "8m ago"
      }
    ]
  },
  {
    id: "comm_2",
    authorName: "Kareem (Client Lead)",
    authorRole: "CLIENT",
    content: "Please clarify if Stripe payout currency will be settled in USD or PKR?",
    entityType: "PROPOSAL",
    entityId: "prop_v1",
    entityLabel: "Proposal v1.0",
    mentions: [],
    isResolved: true,
    createdAtTimeAgo: "2h ago",
    attachments: []
  }
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const entityType = searchParams.get("entityType");
  const entityId = searchParams.get("entityId");

  let filtered = mockComments;
  if (entityType) {
    filtered = filtered.filter((c) => c.entityType === entityType);
  }
  if (entityId) {
    filtered = filtered.filter((c) => c.entityId === entityId);
  }

  return NextResponse.json({
    success: true,
    data: filtered
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Check if resolving comment
    if (body.action === "RESOLVE") {
      const { commentId, isResolved } = ResolveCommentSchema.parse(body);
      mockComments = mockComments.map((c) =>
        c.id === commentId ? { ...c, isResolved } : c
      );
      return NextResponse.json({
        success: true,
        data: { commentId, isResolved }
      });
    }

    // Default: Create new comment
    const validated = CreateCommentSchema.parse(body);

    const newComment = {
      id: `comm_${mockComments.length + 1}`,
      authorName: "Farhan (Technical Lead)",
      authorRole: "ADMIN",
      content: validated.content,
      entityType: validated.entityType,
      entityId: validated.entityId,
      entityLabel: `Item ${validated.entityId || "General"}`,
      mentions: validated.mentions,
      isResolved: false,
      createdAtTimeAgo: "Just now",
      attachments: validated.attachments,
      replies: []
    };

    if (validated.parentId) {
      // Add as threaded reply
      mockComments = mockComments.map((c) => {
        if (c.id === validated.parentId) {
          return {
            ...c,
            replies: [...(c.replies || []), newComment]
          };
        }
        return c;
      });
    } else {
      mockComments.unshift(newComment);
    }

    return NextResponse.json({
      success: true,
      data: newComment
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "COMMENT_CREATION_FAILED", message: error.message } },
      { status: 400 }
    );
  }
}

