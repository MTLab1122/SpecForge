import { NextResponse } from "next/server";

export async function GET() {
  const mem = process.memoryUsage();
  const heapUsedMb = Math.round(mem.heapUsed / 1024 / 1024);

  // If heap usage exceeds 1.8GB in Node, consider liveness broken (process should restart)
  if (heapUsedMb > 1800) {
    return NextResponse.json(
      {
        status: "UNHEALTHY",
        uptimeSeconds: Math.floor(process.uptime()),
        reason: `Memory exhaustion: heapUsedMb=${heapUsedMb}`
      },
      { status: 503 }
    );
  }

  return NextResponse.json(
    {
      status: "ALIVE",
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    },
    { status: 200 }
  );
}

