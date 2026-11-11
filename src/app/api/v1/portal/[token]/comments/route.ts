import { NextRequest, NextResponse } from "next/server";
import { ClientCommentCreateSchema } from "@/lib/validations/client-portal";
import { z } from "zod";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const shareToken = (await params).token;

    // Sample comments
    const comments = [
      {
        id: "comm-1",
        parentId: null,
        authorName: "John Doe",
        authorEmail: "john@client.com",
        sectionKey: "deliverables.0",
        targetItemTitle: "UX Research, Wireframes & Design System",
        content: "Can we ensure dark mode tokens are included in the Figma design system?",
        isResolved: true,
        createdAt: "2026-03-02 10:15 UTC",
        attachments: [
          { name: "Brand Guidelines v2.pdf", url: "https://specforge.io/files/brand-guidelines.pdf" }
        ]
      },
      {
        id: "comm-2",
        parentId: "comm-1",
        authorName: "Sarah Lin (Lead Architect)",
        authorEmail: "sarah@agency.com",
        sectionKey: "deliverables.0",
        content: "Yes, absolutely! Dark mode variables and WCAG AAA contrast ratios are included by default in our component tokens.",
        isResolved: true,
        createdAt: "2026-03-02 11:30 UTC"
      },
      {
        id: "comm-3",
        parentId: null,
        authorName: "Marcus Vance",
        authorEmail: "marcus@client.com",
        sectionKey: "milestones.1",
        targetItemTitle: "Milestone 2: Staging Demo",
        content: "Will the staging environment allow our QA team to run sample test transactions in Stripe sandbox?",
        isResolved: false,
        createdAt: "2026-03-03 14:00 UTC"
      }
    ];

    return NextResponse.json({
      success: true,
      comments,
      totalCount: comments.length
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch comments" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const shareToken = (await params).token;
    const body = await req.json();

    const parsed = ClientCommentCreateSchema.parse(body);

    const newComment = {
      id: `comm-${Date.now()}`,
      parentId: parsed.parentId || null,
      authorName: parsed.authorName,
      authorEmail: parsed.authorEmail,
      sectionKey: parsed.sectionKey,
      targetItemTitle: parsed.targetItemTitle || null,
      content: parsed.content,
      attachments: parsed.attachments || [],
      isResolved: false,
      createdAt: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      message: "Comment posted successfully.",
      comment: newComment
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, errors: error.issues }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, error: error.message || "Failed to post comment" },
      { status: 500 }
    );
  }
}
