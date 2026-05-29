import { NextResponse } from "next/server";
import { getDriver } from "@/lib/senders";

export const dynamic = "force-dynamic";

// GET /api/health — liveness + active driver, for monitoring.
export function GET() {
  return NextResponse.json({
    status: "ok",
    driver: getDriver().name,
    time: new Date().toISOString(),
  });
}
