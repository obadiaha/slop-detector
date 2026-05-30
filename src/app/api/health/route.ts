import { NextResponse } from "next/server";
import { getDriver } from "@/lib/senders";
import { loadDb, activeBackendName } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/health — liveness + active driver and storage backend, for monitoring.
export async function GET() {
  await loadDb();
  return NextResponse.json({
    status: "ok",
    driver: getDriver().name,
    storage: activeBackendName(),
    time: new Date().toISOString(),
  });
}
