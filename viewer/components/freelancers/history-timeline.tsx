import { readFileSync, existsSync } from "node:fs";
import type { ProfileSnapshot } from "@/lib/fixtures";

interface SnapshotRef {
  isoTimestamp: string;
  path: string;
}

interface Props {
  snapshots: SnapshotRef[];
  latest: ProfileSnapshot;
}

function fmtTs(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-GB", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function readSnapshotSafe(path: string): ProfileSnapshot | null {
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as ProfileSnapshot;
  } catch {
    return null;
  }
}

function diffSnapshots(
  older: ProfileSnapshot,
  newer: ProfileSnapshot,
): string[] {
  const changed: string[] = [];
  if (older.profile.title !== newer.profile.title) changed.push("title");
  if (older.profile.overview !== newer.profile.overview)
    changed.push("overview");
  const oldRate = older.profile.hourlyRate?.rawValue ?? null;
  const newRate = newer.profile.hourlyRate?.rawValue ?? null;
  if (oldRate !== newRate) changed.push("hourlyRate");
  if (
    (older.profile.skills?.length ?? 0) !== (newer.profile.skills?.length ?? 0)
  )
    changed.push("skills");
  if (older.profile.jobSuccessScore !== newer.profile.jobSuccessScore)
    changed.push("jobSuccessScore");
  return changed;
}

export function HistoryTimeline({ snapshots, latest }: Props) {
  if (!snapshots.length) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        Only one snapshot captured — no history yet.
      </p>
    );
  }

  // Build ordered list: oldest first for diff computation
  // snapshots are sorted desc, so reverse for pairs
  const ordered = [...snapshots].reverse();

  // Read all snapshot files
  const loaded: Array<{ ts: string; snap: ProfileSnapshot | null }> =
    ordered.map((s) => ({
      ts: s.isoTimestamp,
      snap: readSnapshotSafe(s.path),
    }));

  // Add latest as final entry (newest)
  const allEntries = [...loaded, { ts: latest.fetchedAt, snap: latest }];

  return (
    <ol className="flex flex-col gap-3">
      {allEntries.map((entry, idx) => {
        const isLatest = idx === allEntries.length - 1;
        const changed =
          !isLatest && allEntries[idx + 1]?.snap && entry.snap
            ? diffSnapshots(entry.snap, allEntries[idx + 1].snap!)
            : [];
        return (
          <li key={entry.ts} className="flex items-start gap-3">
            <div className="mt-1 flex flex-col items-center gap-1">
              <div
                className="size-2.5 rounded-full border-2"
                style={{
                  borderColor: isLatest
                    ? "var(--color-chart-1)"
                    : "var(--color-border)",
                  background: isLatest
                    ? "var(--color-chart-1)"
                    : "var(--color-card)",
                }}
              />
              {idx < allEntries.length - 1 && (
                <div
                  className="w-px flex-1 bg-border/60"
                  style={{ minHeight: 12 }}
                />
              )}
            </div>
            <div className="pb-2 min-w-0">
              <p className="text-xs font-mono text-muted-foreground">
                {fmtTs(entry.ts)}
                {isLatest && (
                  <span className="ml-2 rounded bg-[color:var(--color-chart-1)]/15 px-1.5 py-0.5 text-[10px] text-[color:var(--color-chart-1)]">
                    latest
                  </span>
                )}
              </p>
              {changed.length > 0 && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  changed:{" "}
                  <span className="text-foreground/80">
                    {changed.join(", ")}
                  </span>
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
