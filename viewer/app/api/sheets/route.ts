import { NextResponse } from "next/server";

import { parseSheetRows } from "@/lib/talent-search/parse";

const SHEET_ID = "15YoXM7jPuJLMMejbstTtHQLJJF4wwgJYjNsYUO0dEYs";
const SHEET_RANGE =
  "Ранжування%20профілю%20у%20Talent%20Search%20-%20worldwide!A1:R50";

// In-memory cache (5 min)
let cachedAt = 0;
let cachedPayload: unknown = null;

export async function GET() {
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { ok: false, error: "GOOGLE_SHEETS_API_KEY not set", stage: "api" },
      { status: 503 },
    );
  }

  // Serve from cache if fresh
  if (cachedPayload && Date.now() - cachedAt < 300_000) {
    return NextResponse.json(cachedPayload, {
      headers: { "Cache-Control": "private, max-age=300" },
    });
  }

  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_RANGE}?key=${apiKey}`;
    const res = await fetch(url);

    if (!res.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: `Sheets API returned ${res.status}`,
          stage: "api",
        },
        { status: 502 },
      );
    }

    const json = (await res.json()) as { values?: string[][] };
    const rows = json.values ?? [];
    const dataset = parseSheetRows(rows);
    dataset.source = "api";

    const payload = { ok: true, dataset, stage: "api" };
    cachedAt = Date.now();
    cachedPayload = payload;

    return NextResponse.json(payload, {
      headers: { "Cache-Control": "private, max-age=300" },
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        stage: "api",
      },
      { status: 502 },
    );
  }
}
