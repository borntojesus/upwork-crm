# upwork-crm — Phase 1 / Phase 2 ROADMAP

_Last updated: 2026-04-21. Owner: Alpina Tech / engineering@alpina-tech.com._

---

## §1. Current state

Phase 0 is complete: OAuth (Authorization Code + Client Credentials) works, the full SDL is introspected to `schema/upwork.graphql` (2851 types, 74 queries, 51 mutations), and `schema/capabilities.md` is generated and approved. Phase 1 conversations are fully fetched: 231 rooms are stored in `fixtures/rooms/all.json`, 9,301 stories (messages) are stored across `fixtures/stories/<roomId>.json` with per-room checkpoint files, and the export pipeline has produced `fixtures/agent/leads.json` (195 leads), `fixtures/agent/rooms.json` (231 room summaries), `fixtures/agent/transcripts/*.json`, `notes/leads/*.md`, and `notes/rooms/*.md`. Of the 231 rooms, **79 have a non-null `contractId`**, representing 79 distinct contracts referenced from conversation context. The remaining Phase 1 themes — Contracts, Proposals (vendor + client), Offers, Transactions, and Job/Talent — have not been fetched yet. The `04-jobs` probe (`marketplaceJobPostingsSearch`) returns HTTP 200 with a GraphQL 500 error for this API key; `publicMarketplaceJobPostingsSearch` is the untried fallback and is the only path for job search in Phase 1.

---

## §2. Phase 1 remaining extractions

### 2.1 Contracts

**Primary query:** `vendorContracts` (filter: `VendorContractSearchFilter`, options: `ContractOptionsInput`, paging: `ContractPagingInput`)
**Fallback:** `contractList(ids: [ID!])` — seed IDs from `contractId` values in `fixtures/rooms/all.json` (79 known IDs); use as a fast pre-seed before running `vendorContracts`.

**Fields to select (on `ContractDetails`):**

```graphql
id
title
status          # ACTIVE | CLOSED | PAUSED
closingReason { ... }
kind            # WEEKLY_RETAINER | PAYROLL | STAFF_AUG | DIRECT_CONTRACT
createDate
startDate
endDate
modifyDate
deliveryModel
offerId
freelancer { id nid name photoUrl }
vendorOrganization { id name }
clientOrganization { id name }
clientTeam { id name }
hiringManager { id name }
agencyManager { id name }
terms {
  hourlyTerms { amount { rawValue currency } weeklyHoursLimit startDate endDate }
  fixedPriceTerms { amount { rawValue currency } startDate endDate }
}
hourlyLimits { amount weeklyHoursLimit startDateTime endDateTime }
metadata { ... }
job { id title }
```

`addTerms: true` and `addHourLimits: true` must be set in `options: ContractOptionsInput`.

**Tenant header:** `X-Upwork-API-TenantId` required — agency context (`vendorId` = agency org ID from `fixtures/01-me.json` → `companySelector.items[].organizationId`).

**Expected row count:** ~79 from room seeds; `vendorContracts` with no date filter may return more historical entries. Budget for up to 150.

**Pagination strategy:** `ContractPagingInput { limit: 50, offset: 0, includeTotalCount: true }` — offset-based. Advance offset by 50 until empty page. `totalCount` from this API is unreliable; always paginate until empty page.

**Est request budget:** 150 contracts / 50 per page = 3 pages. Plus 1 seed request via `contractList` = **4 requests / ~4 seconds**.

**Storage layout:**

- `fixtures/contracts/raw-<offset>.json` — raw page responses
- `fixtures/agent/contracts.json` — flat array of all `ContractDetails` objects

**Failure modes:**

- `vendorId` scope mismatch: if agency org ID is wrong, API silently returns freelancer-context contracts or empty list. Verify `vendorId` from `fixtures/01-me.json` before running.
- Partial data on closed contracts (some fields null for very old entries) — `gql()` handles gracefully via partial-data tolerance.
- `contractList` with all 79 IDs in one request may hit request-size limits; split into batches of 25 if needed.

---

### 2.2 Proposals (vendor + client)

**Primary queries:**

- Vendor (agency submitted): `vendorProposals(filter: VendorProposalFilter!, sortAttribute: VendorProposalSortAttribute!, pagination: Pagination!): VendorProposalsConnection!`
- Client (inbound from clients who found us): `clientProposals(jobPostingId: ID!, filter: ClientProposalFilter, pagination: Pagination): ClientProposalsConnection` — ⚠ requires a `jobPostingId`; must iterate over known job postings.

**Fallback (single record lookup):** `vendorProposal(id: ID!)` and `clientProposal(id: ID!)` — useful to backfill individual IDs found in contract or room metadata.

**Fields to select (`VendorProposal`):**

```graphql
id
user { id nid name }
organization { id name }
marketplaceJobPosting { id title ciphertext }
terms { amount { rawValue currency } paymentType duration }
proposalCoverLetter
status { status reason }
auditDetails { createdDateTime modifiedDateTime }
annotations
```

**Fields to select (`ClientProposal`):**

```graphql
id
user { id nid name }
organization { id name }
job { id title ciphertext }
terms { amount { rawValue currency } paymentType duration }
coverLetter
status { ... }
auditDetails { createdDateTime modifiedDateTime }
annotations
```

**Tenant header:** `X-Upwork-API-TenantId` required for both. `vendorProposals.filter.organizationId_eq` = agency org ID.

**Expected row count:** Proposals count is unknown; estimate 50–200 based on 195 leads (not all become proposals). `clientProposals` requires per-job-posting iteration — only feasible if job posting IDs are available from contracts or the job search probe.

**Pagination strategy (`vendorProposals`):** cursor-based via `VendorProposalsConnection.pageInfo.endCursor`. `Pagination { first: 50, after: cursor }`. Stop on empty page or null cursor. Note: `totalCount` unreliable.

**Est request budget:**

- `vendorProposals`: ~4 pages × 50 = 200 proposals → **4 requests**
- `clientProposals`: only if job IDs known from contracts (up to 79 job IDs × 1 req each at page size 50) → **up to 79 requests**
- Total: **up to 83 requests / ~83 seconds**

**Storage layout:**

- `fixtures/proposals/vendor-page-<cursor>.json` — raw cursor pages
- `fixtures/proposals/client-<jobPostingId>.json` — per-job raw responses
- `fixtures/agent/proposals.json` — flat `{ vendorProposals: [...], clientProposals: [...] }`

**Failure modes:**

- `clientProposals` requires `jobPostingId` — cannot list all at once; must drive from job IDs. If no job IDs available, skip client proposals until job probe completes.
- `status_eq` on `VendorProposalFilter` is required (`VendorProposalStatusFilterInput`). Use `ALL` or run two passes: `ACTIVE` then `ARCHIVED`. Verify enum values from schema before running.
- Cover letters may be redacted for closed/withdrawn proposals.

---

### 2.3 Offers

**Primary query:** `offersByAttribute(filter: SearchOffersInput!): OfferList`
The `SearchOffersInput.searchAttribute` enum allows: `VendorOrg`, `ClientOrg`, `VendorTeam`, `ClientTeam`, `Contract`, `JobPosting`, `JobApplication`. Best approach: pass agency org ID with `searchAttribute: VendorOrg`.

**Fallback:** `offersByAttributes(filter: SearchOffersByAttributesInput!): ModernizedContractOfferList` — same semantics, returns modernized offer list.

**Fields to select (`Offer`):**

```graphql
id
title
description
type            # HOURLY | FIXED
state           # new | accepted | declined | withdrawn | expired
client { id name }
clientCompany { id name }
freelancer { id nid name }
offerTerms {
  amount { rawValue currency }
  paymentType
  weeklyHoursLimit
  startDate
}
milestones { id description amount { rawValue currency } status dueDate }
vendorProposal { id }
job { id title ciphertext }
createdUsingBYOFlow
messageToContractor
deliveryModel
```

**Tenant header:** `X-Upwork-API-TenantId` required.

**Expected row count:** Every contract should have one offer. Estimate: 79–150 offers (matching contracts). `offersByAttribute` uses offset pagination (`page` + `limit` in `SearchOffersInput`).

**Pagination strategy:** `SearchOffersInput { id: <agencyOrgId>, searchAttribute: VendorOrg, limit: 50, page: 1 }`. Increment `page` until empty results. Disable attachments and milestones if slow (`includeAttachments: false, includeMilestones: false`), then re-fetch details selectively.

**Est request budget:** 150 offers / 50 per page = 3 pages → **3 requests / ~3 seconds**.

**Storage layout:**

- `fixtures/offers/page-<n>.json` — raw page responses
- `fixtures/agent/offers.json` — flat array of offers

**Failure modes:**

- `offersByAttribute` is an older API; if it returns auth errors, try `offersByAttributes` with the modernized input.
- Milestones on fixed-price offers may inflate response size; use `includeMilestones: false` as default, enable only when needed.
- Offers for very old closed contracts may have null `freelancer` or null `job` (partial data tolerance handles this).

---

### 2.4 Transactions (Earnings timeseries)

**Primary query:** `transactionHistory(transactionHistoryFilter: TransactionHistoryFilter): TransactionHistory`

`TransactionHistory` returns `transactionDetail.transactionHistoryRow[]` — a flat list, not paginated. The filter accepts a mandatory date range (`transactionDateTime_bt: DateTimeRange!`) and mandatory `aceIds_any: [ID!]!` (accounting entity IDs).

**Fields to select:**

```graphql
transactionDetail {
  transactionHistoryRow {
    rowNumber
    recordId
    transactionCreationDate
    accountingSubtype
    descriptionUI
    amountCreditedToUser { rawValue currency }
    amountSentInOrigCurrency { rawValue currency }
    runningChargeableBalance { rawValue currency }
    paymentGuaranteed
    relatedAssignment
  }
}
```

⚠ `aceIds_any` — requires accounting entity ID(s) from `Query.accountingEntity`. Run `accountingEntity` probe first.

**Tenant header:** `X-Upwork-API-TenantId` required.

**Expected row count:** Flat list (not paginated). A typical active agency may have 500–2000 transaction rows per year. Fetch in monthly chunks to stay within response limits.

**Pagination strategy:** No pagination — single request per time window. Chunk by month (e.g., `2023-01-01` to `2023-01-31`). For 24 months of history, that is 24 requests. Use yearly chunks first as a probe; if response is large, drop to monthly.

**Est request budget:**

- 1 request for `accountingEntity`
- 24 monthly chunks → **25 requests / ~25 seconds**

**Storage layout:**

- `fixtures/transactions/month-<yyyy-mm>.json` — one file per monthly chunk
- `fixtures/agent/transactions.json` — flat sorted array of all `TransactionHistoryRow` objects + monthly totals

**Failure modes:**

- `aceIds_any` is mandatory; if `accountingEntity` probe fails, entire transactions probe is blocked.
- Date range too broad → oversized response. Start with yearly, fall back to monthly.
- `accountingSubtype` values are undocumented strings (e.g., `"hourly"`, `"bonus"`, `"refund"`); log all distinct values as part of export for later categorization.
- `agencyCompanyUids_any` optional filter may scope to agency transactions only; try with and without to compare totals.

---

### 2.5 Job / Talent (covering probe only)

**Primary query:** `publicMarketplaceJobPostingsSearch(marketPlaceJobFilter: PublicMarketplaceJobPostingsSearchFilter!): PublicMarketplaceJobPostingsSearchConnection`
This is the untried fallback after `marketplaceJobPostingsSearch` returns a GraphQL 500 for this API key. No tenant header should be needed (public endpoint).

**Covering probe fields:**

```graphql
totalCount
edges {
  node {
    id
    ciphertext
    title
    createdDateTime
    publishedDateTime
    duration
    engagement
    experienceLevel
    category
    subcategory
    totalApplicants
    amount { rawValue currency displayValue }
    hourlyBudgetMin { rawValue currency }
    hourlyBudgetMax { rawValue currency }
    skills { name prettyName }
    client {
      totalHires totalPostedJobs totalReviews totalFeedback
      verificationStatus
      totalSpent { rawValue currency }
      location { country city }
    }
  }
}
```

**Tenant header:** Not required (public API).

**Expected row count:** Probe only — fetch 1 page of 10 results to confirm the endpoint works. Do NOT build deep extraction in Phase 1.

**Pagination strategy:** Single request. `PublicMarketplaceJobPostingsSearchFilter { searchExpression_eq: "next.js", daysPosted_eq: 7 }` with no explicit pagination (default limit applies).

**Est request budget:** **1 request / 1 second**.

**Storage layout:**

- `fixtures/05-jobs-public.json` — single raw response (mirroring the `04-jobs.json` probe pattern)

**Failure modes:**

- May also return GraphQL 500 if the API key lacks marketplace read scope. If so, document as blocked and skip.
- `marketplaceJobPostingsSearch` 500 bug: root cause unknown — may be scope restriction, key type, or endpoint deprecation. The `searchType` param is overridden to `USER_JOBS` server-side per the schema description, which may be the cause. `publicMarketplaceJobPostingsSearch` does not have this override.
- No deep extraction: do not loop pages even if the probe succeeds. One page = confirmed working, which is the Phase 1 goal.

---

## §3. Dependency graph

```
fixtures/01-me.json          ← already exists (probe 01-me)
  └─ agency orgId
       ├─ [contracts] vendorContracts(filter.vendorId = orgId)
       │    └─ contractIds → contractList(ids=[...]) (seed/validate)
       │    └─ jobIds (from ContractDetails.job.id)
       │         └─ [proposals/client] clientProposals(jobPostingId)
       ├─ [offers]   offersByAttribute(id = orgId, searchAttribute = VendorOrg)
       │    └─ vendorProposal.id → vendorProposal(id) backfill (optional)
       └─ [proposals/vendor] vendorProposals(filter.organizationId_eq = orgId)

Query.accountingEntity       ← new probe needed
  └─ aceId
       └─ [transactions] transactionHistory(aceIds_any=[aceId], date range)

fixtures/rooms/all.json      ← already exists
  └─ contractId[]            ← seeds contractList (79 IDs)

[jobs probe]                 ← standalone, no dependencies
  publicMarketplaceJobPostingsSearch (1 page)
```

---

## §4. Phase 2 (viewer) additions

All additions read from `fixtures/agent/*.json` in Server Components. No write-back. Charts library lives at `viewer/components/charts/`.

### Contracts view

- **Contract status breakdown** — donut/pie chart: ACTIVE / CLOSED / PAUSED counts from `fixtures/agent/contracts.json`.
- **Contract kind distribution** — bar chart: WEEKLY_RETAINER vs STAFF_AUG vs DIRECT_CONTRACT vs PAYROLL.
- **Contract list table** — sortable by `startDate`, `status`, `clientOrganization.name`; links to room transcript where `contractId` matches.

### Proposals funnel

- **Funnel bar chart** — stages: Submitted → Active → Shortlisted → Offer → Contract. Drives from `vendorProposals` status distribution + offer counts + contract counts.
- **Proposals table** — per job title, date, status, cover letter snippet.

### Offers view

- **Offer state breakdown** — bar chart: accepted / declined / withdrawn / expired / new.
- **Offer-to-contract rate** — simple KPI card: offers with state `accepted` / total offers.

### Earnings timeseries

- **Monthly earnings line chart** — `amountCreditedToUser` summed per month from `fixtures/agent/transactions.json`.
- **Transaction subtype breakdown** — stacked bar: hourly vs fixed vs bonus vs other per month.
- **Running balance sparkline** — `runningChargeableBalance` over time.

### Cross-entity lead view (existing + enrich)

- Existing leads table gains **contract badge** (green if lead has a `contractId`) and **proposal badge** (yellow if vendor proposal exists for their job).

---

## §5. Data storage layout recap

| Directory                       | Contents                                                                                                                                   | Git-ignored?                                     | Regeneratable?                                    |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ | ------------------------------------------------- |
| `fixtures/rooms/`               | `all.json` — 231 raw rooms from `roomList`                                                                                                 | Yes                                              | `pnpm cli research:rooms`                         |
| `fixtures/stories/`             | `<roomId>.json` per room (9301 stories, checkpoint format)                                                                                 | Yes                                              | `pnpm cli research:stories`                       |
| `fixtures/contracts/`           | `raw-<offset>.json` chunks from `vendorContracts`                                                                                          | Yes                                              | New `research:contracts` script                   |
| `fixtures/proposals/`           | `vendor-page-<cursor>.json` + `client-<jobId>.json`                                                                                        | Yes                                              | New `research:proposals` script                   |
| `fixtures/offers/`              | `page-<n>.json` chunks from `offersByAttribute`                                                                                            | Yes                                              | New `research:offers` script                      |
| `fixtures/transactions/`        | `month-<yyyy-mm>.json` per monthly window                                                                                                  | Yes                                              | New `research:transactions` script                |
| `fixtures/agent/`               | `leads.json`, `rooms.json`, `contracts.json`, `proposals.json`, `offers.json`, `transactions.json`, `analytics.json`, `transcripts/*.json` | Yes                                              | `pnpm cli research:export` + `research:analytics` |
| `notes/leads/`                  | `<slug>-<uid>.md` per lead (wikilinks)                                                                                                     | Yes                                              | `pnpm cli research:export`                        |
| `notes/rooms/`                  | `<roomId>.md` transcripts                                                                                                                  | Yes                                              | `pnpm cli research:export`                        |
| `schema/`                       | `upwork.graphql` SDL, `capabilities.md`, `types.generated.ts` (ignored)                                                                    | `types.generated.ts` + `introspection.json` only | `pnpm cli refresh-schema`                         |
| `viewer/.next/`                 | Next.js build output                                                                                                                       | Yes                                              | `cd viewer && pnpm build`                         |
| `src/`, `viewer/**` (non-build) | Source TypeScript                                                                                                                          | No                                               | — (source-controlled)                             |

---

## §6. Rate-limit + resumability strategy

### Rate limit

The leaky-bucket in `src/client/rate-limiter.ts` enforces 1 req/sec. All Phase 1 probes together total approximately **117 requests** (see §7), well within both the per-second budget and the 40K/day cap. No batching or parallelism changes are needed.

### Checkpoint format

All new fetch scripts must write per-chunk files and a final flat agent file, matching the `fetch-stories.ts` pattern:

```json
{
  "fetchedAt": "<ISO timestamp>",
  "pages": 3,
  "count": 79,
  "complete": true,
  "items": [...]
}
```

For offset-based probes (contracts, offers): checkpoint by offset — if a file `fixtures/contracts/raw-50.json` with `complete: true` exists, skip that page. For cursor-based (proposals): checkpoint file stores the last `endCursor`; resume from that cursor.

For transactions (date-chunked): each `fixtures/transactions/month-<yyyy-mm>.json` is its own checkpoint. If the file exists and has `complete: true`, skip that month.

### `totalCount` unreliability

Upwork's connection `totalCount` field is documented as unreliable (observed lying about actual page contents during rooms/stories fetch). **Never use `totalCount` as a stop condition.** Always paginate until:

1. The returned `edges` array is empty, OR
2. The `endCursor` is null or identical to the previous cursor, OR
3. A safety cap (e.g., `page >= 100`) is hit.

This is already implemented in `fetch-rooms.ts` and `fetch-stories.ts` and must be replicated in all new scripts.

---

## §7. Priority & sequencing

1. **`accountingEntity` probe** — 1 req. Needed to unblock transactions. Add as `05-accounting-entity.ts` probe. Output `fixtures/05-accounting-entity.json`. ~1 second.

2. **`contracts` research script** — `src/research/fetch-contracts.ts`. Seed from `fixtures/rooms/all.json` contractIds (79 IDs) via `contractList` (3 batches of 25 = 3 req), then sweep `vendorContracts` offset loop (~3 req). Write `fixtures/contracts/raw-*.json` + `fixtures/agent/contracts.json`. ~6 requests, ~6 seconds. Add `pnpm cli research:contracts` CLI entry.

3. **`offers` research script** — `src/research/fetch-offers.ts`. Uses agency org ID, `offersByAttribute`, 3 pages. Write `fixtures/offers/page-*.json` + `fixtures/agent/offers.json`. ~3 requests, ~3 seconds. Add `pnpm cli research:offers`.

4. **`vendorProposals` research script** — `src/research/fetch-proposals.ts`. Cursor loop, `organizationId_eq` = agency org ID. Write `fixtures/proposals/vendor-*.json`. ~4 requests, ~4 seconds.

5. **`clientProposals` enrichment** (optional, depends on job IDs from contracts) — iterate `contracts.job.id` list, 1 req per job. If 79 jobs → 79 requests, ~79 seconds. Only run if job IDs are available and client proposals are relevant.

6. **`transactions` research script** — `src/research/fetch-transactions.ts`. Date-chunked monthly, 2 years back = 24 requests. Write per-month + flat agent file. ~25 requests (including `accountingEntity`). ~25 seconds.

7. **`publicMarketplaceJobPostingsSearch` probe** — `src/probes/05-jobs-public.ts`. Single probe, 1 request, to confirm endpoint viability. Write `fixtures/05-jobs-public.json`. ~1 second. If it fails with 500: document and close out `04-jobs` / `05-jobs-public` as **blocked** in `schema/capabilities.md`.

8. **Export extension** — extend `src/research/export.ts` to read `fixtures/agent/contracts.json`, `offers.json`, `proposals.json`, `transactions.json` and enrich `leads.json` with contract/proposal badges, and write `notes/leads/*.md` with contract + proposal context.

9. **Viewer additions** — wire Phase 2 views per §4 using `viewer/components/charts/` (already exists from analytics agent).

**Estimated total Phase 1 completion time (pure API time at 1 req/sec):**

- Steps 1–7 (non-client-proposals): ~43 requests → ~43 seconds of API time
- With client proposals (step 5): up to ~122 requests → ~122 seconds (~2 minutes)

---

## §8. Open questions for user

1. **Agency `vendorId` for `vendorContracts`**: The filter requires `vendorId: ID!`. Is this the root agency org ID from `companySelector` (`1599670040955277312`), or the team-level org ID? If there are sub-teams, should we iterate over all team org IDs to get all contracts? Please confirm which org ID to use.

2. **Transaction history lookback window**: How far back should `transactionHistory` fetch? 2 years suggested, but if the agency has been active longer, we may miss historical contracts. Should we fetch from agency creation date, or a fixed window (e.g., 3 years)?

3. **WorkDiary screenshots**: `workDiaryCompany` and `workDiaryContract` return `screenshotUrl` / `screenshotImage` fields with short-lived signed S3 URLs. These expire quickly and are not archivable. Should we skip screenshot URLs entirely (just store metadata: duration, activity level, task title), or skip workDiary probes in Phase 1 entirely?

4. **Client proposals scope**: `clientProposals` is keyed by `jobPostingId` — it returns inbound proposals from freelancers for jobs we (the client) posted. Is Alpina Tech also acting as a client posting jobs? If not, the entire `clientProposals` probe is irrelevant and should be skipped.

5. **`VendorProposalStatusFilterInput` required value**: The `vendorProposals` filter requires `status_eq` (non-optional). Should we run one sweep with `ALL_ACTIVE` status and a second with archived/withdrawn proposals to capture the full funnel? Or restrict to active only for Phase 1?

6. **Job search blocked**: The `04-jobs` probe already shows `marketplaceJobPostingsSearch` returning GraphQL 500 for this API key. If `publicMarketplaceJobPostingsSearch` also fails, should we skip the entire Job/Talent theme in Phase 1, or request additional scopes for this API key?
