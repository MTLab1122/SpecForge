import { NextRequest, NextResponse } from "next/server";
import { 
  CreateScopeVersionSchema, 
  CompareScopeVersionsSchema, 
  RestoreScopeVersionSchema 
} from "@/lib/validations/trustworthy-ai";

let mockVersions = [
  {
    id: "ver_1",
    versionNumber: 1,
    versionType: "AI_GENERATION",
    changeSummary: "Initial raw extraction from client brief (Gemini 1.5 Flash)",
    author: "AI Assistant",
    createdAt: "2026-11-09T08:30:00Z",
    itemsCount: 8
  },
  {
    id: "ver_2",
    versionNumber: 2,
    versionType: "USER_EDIT",
    changeSummary: "Accepted 6 features, marked 2 ungrounded items as assumptions",
    author: "Farhan (Technical Lead)",
    createdAt: "2026-11-09T09:15:00Z",
    itemsCount: 8
  }
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  return NextResponse.json({
    success: true,
    data: mockVersions
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Check if compare action
    if (body.action === "COMPARE") {
      const { versionA, versionB } = CompareScopeVersionsSchema.parse(body);
      return NextResponse.json({
        success: true,
        data: {
          versionA,
          versionB,
          diff: {
            added: [
              { title: "OTP Phone Authentication", category: "CORE_FEATURE", version: versionB }
            ],
            modified: [
              { 
                title: "Payment Processing", 
                oldDescription: "Process payments via credit cards",
                newDescription: "Process payments via Stripe Elements & JazzCash (PKR)",
                reason: "Added regional currency constraint"
              }
            ],
            removed: [
              { title: "Legacy XML Export", category: "CORE_FEATURE", version: versionA }
            ]
          }
        }
      });
    }

    // Check if restore action
    if (body.action === "RESTORE") {
      const { targetVersionNumber, reason } = RestoreScopeVersionSchema.parse(body);
      const newVersionNum = mockVersions.length + 1;
      const restored = {
        id: `ver_${newVersionNum}`,
        versionNumber: newVersionNum,
        versionType: "RESTORE_ROLLBACK",
        changeSummary: `Restored to v${targetVersionNumber}.0. Reason: ${reason}`,
        author: "Farhan (Technical Lead)",
        createdAt: new Date().toISOString(),
        itemsCount: 8
      };
      mockVersions.push(restored);

      return NextResponse.json({
        success: true,
        data: restored
      });
    }

    // Default: Create new version
    const { projectId, changeSummary, versionType } = CreateScopeVersionSchema.parse(body);
    const newVersionNum = mockVersions.length + 1;
    const newVersion = {
      id: `ver_${newVersionNum}`,
      versionNumber: newVersionNum,
      versionType,
      changeSummary,
      author: "Farhan (Technical Lead)",
      createdAt: new Date().toISOString(),
      itemsCount: 8
    };
    mockVersions.push(newVersion);

    return NextResponse.json({
      success: true,
      data: newVersion
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: { code: "VERSION_OPERATION_FAILED", message: error.message }
      },
      { status: 400 }
    );
  }
}
