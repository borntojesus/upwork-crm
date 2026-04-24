---
description: Run every probe in sequence with rate limiting and produce SAMPLE_REPORT.md
---

Run `pnpm cli probe-all`. It iterates all files in `src/probes/` with a 1-req/sec throttle.

After it completes:

1. List which probes succeeded vs failed (from `fixtures/*.meta.json`).
2. Run `pnpm cli sample-report` to regenerate `SAMPLE_REPORT.md`.
3. Read `SAMPLE_REPORT.md` and give me a ≤15-line summary: what we got, what's missing, any surprises, and recommended next probes.

Don't delete existing fixtures; new runs overwrite by name.
