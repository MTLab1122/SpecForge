import { NextRequest, NextResponse } from "next/server";
import { CreateUserPersonaSchema, CreateUserFlowSchema } from "@/lib/validations/structured-discovery";

let mockPersonas = [
  {
    id: "per_1",
    name: "Mobile Freelancer",
    roleTitle: "Remote Contractor",
    description: "Receives international wire transfers and needs instant wallet withdrawals.",
    goals: ["Fast currency conversion", "Instant local bank payout"],
    painPoints: ["High foreign exchange fees", "Slow 3-day bank settlement"]
  },
  {
    id: "per_2",
    name: "Retail Shopper",
    roleTitle: "Consumer",
    description: "Daily consumer buying groceries and paying utilities via QR code.",
    goals: ["1-tap QR scan payments", "Real-time balance notification"],
    painPoints: ["Declined card transactions", "Cluttered banking apps"]
  }
];

let mockFlows = [
  {
    id: "flow_1",
    personaName: "Mobile Freelancer",
    title: "Instant Wallet P2P Transfer Journey",
    description: "User receives money in wallet, initiates P2P transfer, and confirms with biometric FaceID.",
    steps: [
      { stepNumber: 1, action: "Tap transfer money button", screen: "WalletHome" },
      { stepNumber: 2, action: "Select recipient & enter amount", screen: "RecipientSelect" },
      { stepNumber: 3, action: "FaceID biometric confirmation", screen: "BiometricAuth" },
      { stepNumber: 4, action: "View instant receipt & share", screen: "TransferReceipt" }
    ],
    keyScreens: ["WalletHome", "RecipientSelect", "BiometricAuth", "TransferReceipt"],
    edgeCases: ["Insufficient balance alert", "Recipient account blocked"],
    linkedRequirementTitles: ["Biometric Authentication", "Instant P2P Transfers"]
  }
];

export async function GET(req: NextRequest) {
  return NextResponse.json({
    success: true,
    data: {
      personas: mockPersonas,
      flows: mockFlows
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.type === "PERSONA") {
      const validatedPersona = CreateUserPersonaSchema.parse(body);
      const newPersona = {
        id: `per_${mockPersonas.length + 1}`,
        ...validatedPersona
      };
      mockPersonas.push(newPersona);
      return NextResponse.json({ success: true, data: newPersona });
    }

    const validatedFlow = CreateUserFlowSchema.parse(body);
    const newFlow = {
      id: `flow_${mockFlows.length + 1}`,
      personaName: "General User",
      ...validatedFlow,
      linkedRequirementTitles: []
    };
    mockFlows.push(newFlow);

    return NextResponse.json({ success: true, data: newFlow });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: { code: "FLOW_CREATION_FAILED", message: error.message } },
      { status: 400 }
    );
  }
}

