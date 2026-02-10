import { NextRequest, NextResponse } from "next/server";
import { scanUrl } from "@/lib/scanner";
import { runFullAnalysis } from "@/lib/analyzer/scorer";
import { saveResult, generateId } from "@/lib/store";

export const maxDuration = 60; // Allow up to 60s for Vercel

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL is required" },
        { status: 400 }
      );
    }

    // Normalize URL
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL" },
        { status: 400 }
      );
    }

    // Rate limiting via cookie (5 scans/day)
    const scanCount = parseInt(
      req.cookies.get("slop_scans")?.value || "0",
      10
    );
    if (scanCount >= 5) {
      return NextResponse.json(
        { error: "Daily scan limit reached (5/day). Come back tomorrow!" },
        { status: 429 }
      );
    }

    const id = generateId();

    // Run scanner
    console.log(`[scan] Starting scan for ${url} (id: ${id})`);
    const { screenshot, dom } = await scanUrl(url);
    console.log(`[scan] Screenshot captured, DOM extracted`);

    // Run analysis
    const screenshotBase64 = screenshot.toString("base64");
    const result = await runFullAnalysis(dom, screenshotBase64, url, id);
    console.log(
      `[scan] Analysis complete: score=${result.overallScore} (${result.scanDurationMs}ms)`
    );

    // Store the screenshot as a data URL for the results page
    result.screenshotUrl = `data:image/jpeg;base64,${screenshotBase64}`;

    // Save result
    saveResult(result);

    // Set scan count cookie
    const response = NextResponse.json({ id, result });
    response.cookies.set("slop_scans", String(scanCount + 1), {
      maxAge: 86400, // 24 hours
      path: "/",
      httpOnly: true,
    });

    return response;
  } catch (error) {
    console.error("[scan] Error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
