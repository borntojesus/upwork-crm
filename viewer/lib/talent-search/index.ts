export * from "./types";
export * from "./parse";
export { MOCK_DATASET } from "./mock";

import { readFileSync } from "fs";
import { join } from "path";

import { MOCK_DATASET } from "./mock";
import { parseCsv, parseSheetRows } from "./parse";
import type { TalentRankingDataset } from "./types";

const SHEET_ID = "15YoXM7jPuJLMMejbstTtHQLJJF4wwgJYjNsYUO0dEYs";
const SHEET_RANGE =
  "Ранжування%20профілю%20у%20Talent%20Search%20-%20worldwide!A1:R50";

export type GetRankingResult =
  | { dataset: TalentRankingDataset; stage: "api" | "csv"; error?: never }
  | { dataset: null; stage: "none"; error?: string };

/**
 * Server-side: try Google Sheets API (Stage 1), then local CSV (Stage 2).
 * Returns null dataset if both fail.
 */
export async function getRankingFromServer(): Promise<GetRankingResult> {
  // Stage 1: Google Sheets API
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  if (apiKey) {
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_RANGE}?key=${apiKey}`;
      const res = await fetch(url, { next: { revalidate: 300 } });
      if (res.ok) {
        const json = (await res.json()) as { values?: string[][] };
        const rows = json.values ?? [];
        const dataset = parseSheetRows(rows);
        dataset.source = "api";
        return { dataset, stage: "api" };
      }
      console.warn("[talent-search] Sheets API non-200:", res.status);
    } catch (err) {
      console.warn("[talent-search] Sheets API error:", err);
    }
  }

  // Stage 2: local CSV file
  try {
    const csvPath = join(process.cwd(), "public", "talent-search.csv");
    const raw = readFileSync(csvPath, "utf-8");
    const dataset = parseCsv(raw);
    dataset.source = "csv";
    return { dataset, stage: "csv" };
  } catch {
    // File not found — expected in most cases
  }

  return { dataset: null, stage: "none" };
}
