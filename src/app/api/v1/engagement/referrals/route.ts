import { NextRequest, NextResponse } from "next/server";
import { ReferralsEngine, ReferralRecord } from "@/lib/engagement/referrals-engine";

const mockReferralRecords: ReferralRecord[] = [
  {
    id: "ref_1",
    referrerUserId: "usr_lead",
    referralCode: "MARCUS-SF-92",
    referredEmail: "elena@designlab.io",
    status: "CONVERTED",
    rewardGranted: true,
    rewardCredits: 250,
    createdAt: "2026-10-12T10:00:00Z"
  },
  {
    id: "ref_2",
    referrerUserId: "usr_lead",
    referralCode: "MARCUS-SF-92",
    referredEmail: "tariq@cloudconsult.tech",
    status: "REGISTERED",
    rewardGranted: false,
    rewardCredits: 250,
    createdAt: "2026-10-25T14:00:00Z"
  }
];

export async function GET(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id") || "usr_lead";
    const referralCode = ReferralsEngine.generateReferralCode("Marcus Vance", userId);

    const metrics = ReferralsEngine.calculateDashboardMetrics({
      referralCode,
      records: mockReferralRecords
    });

    return NextResponse.json({
      success: true,
      metrics
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch referral dashboard" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = req.headers.get("x-user-id") || "usr_lead";
    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ success: false, error: "Missing recipient email" }, { status: 400 });
    }

    const referralCode = ReferralsEngine.generateReferralCode("Marcus Vance", userId);
    const newRecord: ReferralRecord = {
      id: `ref_${Date.now()}`,
      referrerUserId: userId,
      referralCode,
      referredEmail: email,
      status: "PENDING",
      rewardGranted: false,
      rewardCredits: 250,
      createdAt: new Date().toISOString()
    };

    mockReferralRecords.push(newRecord);

    return NextResponse.json({
      success: true,
      referralRecord: newRecord,
      message: `Referral invitation queued for ${email} with +100 bonus credit voucher.`
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create referral" },
      { status: 500 }
    );
  }
}
