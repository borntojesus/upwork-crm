import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { gql } from "../client/graphql-client.ts";

const QUERY = /* GraphQL */ `
  query TransactionHistory($filter: TransactionHistoryFilter) {
    transactionHistory(transactionHistoryFilter: $filter) {
      transactionDetail {
        transactionHistoryRow {
          rowNumber
          recordId
          transactionCreationDate
          accountingSubtype
          descriptionUI
          amountCreditedToUser {
            rawValue
            currency
          }
          runningChargeableBalance {
            rawValue
            currency
          }
          relatedAssignment
        }
      }
    }
  }
`;

export interface TransactionRow {
  rowNumber: number | null;
  recordId: string | null;
  transactionCreationDate: string | null;
  accountingSubtype: string | null;
  descriptionUI: string | null;
  amountCreditedToUser: { rawValue: string; currency: string } | null;
  runningChargeableBalance: { rawValue: string; currency: string } | null;
  relatedAssignment: number | null;
}

interface TransactionHistoryResponse {
  transactionHistory: {
    transactionDetail: {
      transactionHistoryRow: TransactionRow[] | null;
    } | null;
  } | null;
}

interface MonthFile {
  month: string;
  fetchedAt: string;
  complete: boolean;
  count: number;
  rows: TransactionRow[];
}

function transactionsDir(): string {
  const dir = resolve(process.cwd(), "fixtures", "transactions");
  mkdirSync(dir, { recursive: true });
  return dir;
}

function monthFilePath(dir: string, month: string): string {
  return resolve(dir, `month-${month}.json`);
}

function readMonthFile(path: string): MonthFile | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as MonthFile;
  } catch {
    return null;
  }
}

/** Return "yyyy-mm" for a date offset months back from today */
function monthLabel(offsetMonths: number): string {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - offsetMonths);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** ISO first day of a "yyyy-mm" month */
function firstDay(month: string): string {
  return `${month}-01`;
}

/** ISO last day of a "yyyy-mm" month */
function lastDay(month: string): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const last = new Date(y, m, 0).getDate(); // day 0 of next month = last day of this month
  return `${month}-${String(last).padStart(2, "0")}`;
}

function loadAceId(): string {
  const fixturePath = resolve(
    process.cwd(),
    "fixtures",
    "05-accounting-entity.json",
  );
  if (!existsSync(fixturePath)) {
    throw new Error(
      `Accounting entity fixture not found at ${fixturePath}. Run probe 05 first.`,
    );
  }
  const raw = JSON.parse(readFileSync(fixturePath, "utf8")) as {
    accountingEntity?: { id?: string };
  };
  const id = raw.accountingEntity?.id;
  if (!id) throw new Error("accountingEntity.id missing from fixture");
  return id;
}

export async function fetchAllTransactions(): Promise<void> {
  const aceId = loadAceId();
  const dir = transactionsDir();

  // Build list of months: 24 months ago → current month
  const months: string[] = [];
  for (let i = 24; i >= 0; i--) {
    months.push(monthLabel(i));
  }

  const allRows: TransactionRow[] = [];

  for (const month of months) {
    const filePath = monthFilePath(dir, month);
    const existing = readMonthFile(filePath);
    if (existing?.complete) {
      console.error(
        `[transactions] ${month}: skipping (already complete, ${existing.count} rows)`,
      );
      allRows.push(...existing.rows);
      continue;
    }

    let rows: TransactionRow[] = [];
    try {
      const data = await gql<TransactionHistoryResponse>(
        QUERY,
        {
          filter: {
            aceIds_any: [aceId],
            transactionDateTime_bt: {
              rangeStart: firstDay(month),
              rangeEnd: lastDay(month),
            },
          },
        },
        { operationName: "TransactionHistory" },
      );
      rows =
        data.transactionHistory?.transactionDetail?.transactionHistoryRow ?? [];
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[transactions] ${month} ERROR: ${msg}`);
      // Write incomplete marker so we know this month was attempted
      const failFile: MonthFile = {
        month,
        fetchedAt: new Date().toISOString(),
        complete: false,
        count: 0,
        rows: [],
      };
      writeFileSync(filePath, JSON.stringify(failFile, null, 2), "utf8");
      continue;
    }

    const monthFile: MonthFile = {
      month,
      fetchedAt: new Date().toISOString(),
      complete: true,
      count: rows.length,
      rows,
    };
    writeFileSync(filePath, JSON.stringify(monthFile, null, 2), "utf8");
    allRows.push(...rows);
    console.error(`[transactions] ${month}: ${rows.length} rows`);
  }

  // Aggregate by month
  const byMonth = new Map<
    string,
    { credit: number; debit: number; net: number; count: number }
  >();
  for (const row of allRows) {
    const date = row.transactionCreationDate ?? "";
    const m = date.slice(0, 7); // "yyyy-mm"
    if (!byMonth.has(m))
      byMonth.set(m, { credit: 0, debit: 0, net: 0, count: 0 });
    const bucket = byMonth.get(m)!;
    const amount = parseFloat(row.amountCreditedToUser?.rawValue ?? "0") || 0;
    if (amount >= 0) {
      bucket.credit += amount;
    } else {
      bucket.debit += amount;
    }
    bucket.net += amount;
    bucket.count += 1;
  }

  const totalByMonth = Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, stats]) => ({ month, ...stats }));

  const agentDir = resolve(process.cwd(), "fixtures", "agent");
  if (!existsSync(agentDir)) mkdirSync(agentDir, { recursive: true });

  const outPath = resolve(agentDir, "transactions.json");
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        fetchedAt: new Date().toISOString(),
        count: allRows.length,
        totalByMonth,
        transactions: allRows,
      },
      null,
      2,
    ),
    "utf8",
  );
  console.error(
    `[transactions] wrote ${allRows.length} rows across ${totalByMonth.length} months → ${outPath}`,
  );
}
