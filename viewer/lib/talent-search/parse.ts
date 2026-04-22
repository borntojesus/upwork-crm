import { MOCK_DATASET } from "./mock";
import type {
  Keyword,
  Region,
  RankingEntry,
  TalentRankingDataset,
} from "./types";
import { KEYWORDS } from "./types";

// ---------------------------------------------------------------------------
// Cell-level parser
// ---------------------------------------------------------------------------

/**
 * Parses a ranking cell like "6 - World", "2-Europe", "1 - UA", "?", "".
 * Returns null for missing / unknown / "?" cells.
 */
export function parseCellRanking(
  raw: string,
): { position: number; region: Region } | null {
  if (!raw || raw.trim() === "" || raw.trim() === "?") return null;

  // Match "6 - World" | "2-Europe" | "1 - UA" etc.
  const match = raw.match(/^(\d+)\s*-\s*(.+)$/);
  if (!match) return null;

  const position = parseInt(match[1], 10);
  const regionRaw = match[2].trim().toLowerCase();

  let region: Region;
  if (regionRaw === "world" || regionRaw === "worldwide") {
    region = "world";
  } else if (regionRaw === "europe" || regionRaw === "eu") {
    region = "europe";
  } else if (regionRaw === "ua" || regionRaw === "ukraine") {
    region = "ua";
  } else {
    return null;
  }

  return { position, region };
}

// ---------------------------------------------------------------------------
// Sheet rows parser
// ---------------------------------------------------------------------------

const DATE_RE = /^\d{1,2}\.\d{1,2}\.\d{2,4}/;

interface DateBlock {
  date: string;
  weekViews: number | null;
  weekInbound: string | null;
  // keyword index → region → position
  rawRankings: Array<Record<Region, number | null>>;
  steps: string | null;
}

/**
 * Parses raw 2-D array from Google Sheets (rows × cells).
 * Rows 0–1: metadata (skip)
 * Rows 2–3: title (row 2 col 0 or similar)
 * Rows 4–5: blank
 * Row 6: headers
 * Rows 7+: data (2–3 rows per date block)
 */
export function parseSheetRows(rows: string[][]): TalentRankingDataset {
  // Extract profile title from rows 2–3 (index 2 or 3)
  let profileTitle: string | null = null;
  for (let i = 2; i <= 3 && i < rows.length; i++) {
    const cell = (rows[i]?.[0] ?? "").trim();
    if (cell && cell !== "") {
      profileTitle = cell;
      break;
    }
  }

  // Data starts at row index 7 (0-indexed)
  const dataRows = rows.slice(7);

  const blocks: DateBlock[] = [];
  let currentBlock: DateBlock | null = null;

  for (const row of dataRows) {
    const colC = (row[2] ?? "").trim();
    const colA = (row[0] ?? "").trim();
    const colB = (row[1] ?? "").trim();
    const colR = (row[17] ?? "").trim();

    const isDateRow = DATE_RE.test(colC);

    if (isDateRow) {
      // Start a new block
      const weekViewsRaw = parseInt(colA, 10);
      currentBlock = {
        date: colC.match(DATE_RE)![0],
        weekViews: isNaN(weekViewsRaw) ? null : weekViewsRaw,
        weekInbound: colB !== "" ? colB : null,
        rawRankings: KEYWORDS.map(() => ({
          world: null,
          europe: null,
          ua: null,
        })),
        steps: colR !== "" ? colR : null,
      };
      blocks.push(currentBlock);

      // Parse ranking cells D–Q (indices 3–16)
      for (let ki = 0; ki < KEYWORDS.length; ki++) {
        const cell = (row[3 + ki] ?? "").trim();
        const parsed = parseCellRanking(cell);
        if (parsed) {
          currentBlock.rawRankings[ki][parsed.region] = parsed.position;
        }
      }
    } else if (currentBlock) {
      // Merge this region row into current block
      for (let ki = 0; ki < KEYWORDS.length; ki++) {
        const cell = (row[3 + ki] ?? "").trim();
        const parsed = parseCellRanking(cell);
        if (parsed) {
          currentBlock.rawRankings[ki][parsed.region] = parsed.position;
        }
      }
      // Capture steps if not yet set
      if (colR !== "" && currentBlock.steps === null) {
        currentBlock.steps = colR;
      }
    }
  }

  const entries: RankingEntry[] = blocks.map((b) => ({
    date: b.date,
    weekViews: b.weekViews,
    weekInbound: b.weekInbound,
    rankings: KEYWORDS.map((keyword, ki) => ({
      keyword: keyword as Keyword,
      world: b.rawRankings[ki].world,
      europe: b.rawRankings[ki].europe,
      ua: b.rawRankings[ki].ua,
    })),
    steps: b.steps,
  }));

  return {
    source: "api",
    fetchedAt: new Date().toISOString(),
    profileTitle,
    entries,
  };
}

// ---------------------------------------------------------------------------
// CSV parser
// ---------------------------------------------------------------------------

/** Naive CSV parser that handles quoted cells (commas inside quotes). */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let inQuote = false;
  let cur = "";

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (ch === "," && !inQuote) {
      result.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  result.push(cur);
  return result;
}

/** Auto-detect delimiter: tab (TSV from clipboard) or comma (CSV). */
function detectDelimiter(raw: string): "," | "\t" {
  const firstLine = raw.split("\n")[0] ?? "";
  const tabCount = (firstLine.match(/\t/g) ?? []).length;
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  return tabCount > commaCount ? "\t" : ",";
}

/**
 * Parses raw CSV or TSV text into a TalentRankingDataset.
 * Auto-detects delimiter. Falls back to mock on empty input.
 */
export function parseCsv(raw: string): TalentRankingDataset {
  const trimmed = raw.trim();
  if (!trimmed) return { ...MOCK_DATASET, source: "localstorage" };

  const delimiter = detectDelimiter(trimmed);
  const lines = trimmed.split("\n");

  let rows: string[][];
  if (delimiter === "\t") {
    rows = lines.map((l) => l.split("\t").map((c) => c.trim()));
  } else {
    rows = lines.map((l) => parseCSVLine(l).map((c) => c.trim()));
  }

  const dataset = parseSheetRows(rows);
  return { ...dataset, source: "localstorage" };
}
