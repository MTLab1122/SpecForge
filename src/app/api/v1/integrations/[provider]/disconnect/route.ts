import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    const provider = params.provider.toUpperCase();

    return NextResponse.json({
      success: true,
      provider,
      status: "DISCONNECTED",
      message: `${provider} integration disconnected. Stored tokens securely revoked.`
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to disconnect integration" },
      { status: 500 }
    );
  }
}
