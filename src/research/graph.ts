/**
 * graph.ts — cross-entity join of fixtures → leads-enriched.json + jobs-enriched.json.
 * No API calls. Reads from fixtures/agent/*.json and fixtures/jobs/*.json.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

// ─── Raw fixture shapes ───────────────────────────────────────────────────────

interface RawRoom {
  roomId: string;
  roomName: string;
  topic: string | null;
  contractId: string | null;
  messageCount: number;
  firstAt: string | null;
  lastAt: string | null;
  leads: Array<{ userId: string; name: string; orgName: string }>;
}

interface RawLead {
  userId: string;
  name: string;
  nid: string;
  orgIds: string[];
  orgNames: string[];
  rooms: Array<{
    roomId: string;
    roomName: string;
    topic: string | null;
    contractId: string | null;
    messageCount: number;
    firstAt: string | null;
    lastAt: string | null;
  }>;
  messageCount: number;
  firstAt: string | null;
  lastAt: string | null;
}

interface RawContract {
  id: string;
  title: string | null;
  status: string | null;
  startDate: string | null;
  endDate: string | null;
  offerId: string | null;
  clientOrganization: { id: string; name: string | null } | null;
  job: { id: string } | null;
  terms: {
    hourlyTerms: Array<{
      hourlyRate: { rawValue: string; currency: string } | null;
    }> | null;
    fixedPriceTerms: Array<{
      fixedAmount: { rawValue: string; currency: string } | null;
    }> | null;
  } | null;
}

interface RawOffer {
  id: string;
  title: string | null;
  type: string | null;
  state: string | null;
  client: { id: string; name: string } | null;
  job: { id: string } | null;
  vendorProposal: { id: string } | null;
  offerTerms: {
    hourlyTerms: {
      rate: { rawValue: string; currency: string } | null;
    } | null;
    fixedPriceTerm: {
      budget: { rawValue: string; currency: string } | null;
    } | null;
  } | null;
}

interface RawJob {
  id: string;
  content?: { title: string; description: string } | null;
  workFlowState?: { status: string } | null;
  contractTerms?: {
    contractType: string;
    hourlyContractTerms?: {
      hourlyBudgetMin?: number | null;
      hourlyBudgetMax?: number | null;
    } | null;
    fixedPriceContractTerms?: {
      amount?: {
        rawValue: string;
        currency: string;
        displayValue: string;
      } | null;
    } | null;
  } | null;
}

// ─── Output shapes ────────────────────────────────────────────────────────────

interface EnrichedLeadRoom {
  roomId: string;
  roomName: string;
  topic: string | null;
  contractId: string | null;
  messageCount: number;
  firstAt: string | null;
  lastAt: string | null;
}

interface EnrichedLeadContract {
  contractId: string;
  title: string | null;
  status: string | null;
  startDate: string | null;
  endDate: string | null;
  clientOrgName: string | null;
  rateDisplay: string | null;
}

interface EnrichedLeadOffer {
  offerId: string;
  title: string | null;
  state: string | null;
  type: string | null;
  clientName: string | null;
  rateDisplay: string | null;
}

interface EnrichedLeadJob {
  jobId: string;
  title: string | null;
  status: "contracted" | "offered" | "rejected" | "pending";
}

interface EnrichedLead {
  userId: string;
  name: string;
  nid: string;
  orgNames: string[];
  rooms: EnrichedLeadRoom[];
  contracts: EnrichedLeadContract[];
  offers: EnrichedLeadOffer[];
  jobs: EnrichedLeadJob[];
  messageCount: number;
  firstAt: string | null;
  lastAt: string | null;
  hasActiveContract: boolean;
  hasAnyContract: boolean;
}

interface EnrichedJob {
  jobId: string;
  title: string | null;
  status: "active" | "closed" | "offered" | "unknown";
  offerIds: string[];
  contractIds: string[];
  roomIds: string[];
  leadIds: string[];
  firstAt: string | null;
  lastAt: string | null;
  budget: string | null;
  clientName: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function minDate(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a < b ? a : b;
}

function maxDate(a: string | null, b: string | null): string | null {
  if (!a) return b;
  if (!b) return a;
  return a > b ? a : b;
}

function contractRateDisplay(c: RawContract): string | null {
  const hourly = c.terms?.hourlyTerms?.[0]?.hourlyRate;
  if (hourly) return `$${hourly.rawValue}/hr`;
  const fixed = c.terms?.fixedPriceTerms?.[0]?.fixedAmount;
  if (fixed) return `$${fixed.rawValue} fixed`;
  return null;
}

function offerRateDisplay(o: RawOffer): string | null {
  const rate = o.offerTerms?.hourlyTerms?.rate;
  if (rate) return `$${rate.rawValue}/hr`;
  const budget = o.offerTerms?.fixedPriceTerm?.budget;
  if (budget) return `$${budget.rawValue} fixed`;
  return null;
}

function jobBudgetDisplay(
  job: RawJob | undefined,
  contracts: RawContract[],
  offers: RawOffer[],
): string | null {
  if (job?.contractTerms) {
    const ct = job.contractTerms;
    if (ct.hourlyContractTerms?.hourlyBudgetMin != null) {
      const min = ct.hourlyContractTerms.hourlyBudgetMin;
      const max = ct.hourlyContractTerms.hourlyBudgetMax;
      return max != null && max !== min ? `$${min}–$${max}/hr` : `$${min}/hr`;
    }
    if (ct.fixedPriceContractTerms?.amount?.displayValue) {
      return ct.fixedPriceContractTerms.amount.displayValue;
    }
  }
  // fall back to contract terms
  for (const c of contracts) {
    const r = contractRateDisplay(c);
    if (r) return r;
  }
  // fall back to offer terms
  for (const o of offers) {
    const r = offerRateDisplay(o);
    if (r) return r;
  }
  return null;
}

function jobStatus(
  contracts: RawContract[],
  offers: RawOffer[],
  job: RawJob | undefined,
): "active" | "closed" | "offered" | "unknown" {
  if (contracts.some((c) => c.status === "ACTIVE")) return "active";
  if (contracts.length > 0 && contracts.every((c) => c.status === "CLOSED"))
    return "closed";
  if (offers.length > 0) return "offered";
  if (job?.workFlowState?.status === "WorkFlowStateClosed") return "closed";
  return "unknown";
}

function leadJobStatus(
  contractIds: string[],
  offerIds: string[],
  contractsById: Map<string, RawContract>,
): "contracted" | "offered" | "rejected" | "pending" {
  if (contractIds.length > 0) return "contracted";
  if (offerIds.length > 0) {
    const states = offerIds
      .map((id) => {
        // find offer by id
        return null; // will be resolved via offerById below
      })
      .filter(Boolean);
    // simplified: any offer means "offered"
    return "offered";
  }
  return "pending";
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function loadFixture<T>(relPath: string): T {
  const p = resolve(process.cwd(), relPath);
  if (!existsSync(p)) throw new Error(`Missing fixture: ${p}`);
  return JSON.parse(readFileSync(p, "utf8")) as T;
}

export function computeGraph(): {
  leadsEnriched: { generatedAt: string; count: number; leads: EnrichedLead[] };
  jobsEnriched: { generatedAt: string; count: number; jobs: EnrichedJob[] };
} {
  // Load fixtures
  const leadsData = loadFixture<{ leads: RawLead[] }>(
    "fixtures/agent/leads.json",
  );
  const roomsData = loadFixture<{ rooms: RawRoom[] }>(
    "fixtures/agent/rooms.json",
  );
  const contractsData = loadFixture<{ contracts: RawContract[] }>(
    "fixtures/agent/contracts.json",
  );
  const offersData = loadFixture<{ offers: RawOffer[] }>(
    "fixtures/agent/offers.json",
  );

  // Optionally load jobs.json (may not exist yet)
  let jobsById = new Map<string, RawJob>();
  const jobsPath = resolve(process.cwd(), "fixtures", "agent", "jobs.json");
  if (existsSync(jobsPath)) {
    const jobsData = JSON.parse(readFileSync(jobsPath, "utf8")) as {
      jobs: RawJob[];
    };
    for (const j of jobsData.jobs) {
      jobsById.set(j.id, j);
    }
    console.error(`[graph] loaded ${jobsById.size} jobs from jobs.json`);
  } else {
    console.error("[graph] jobs.json not found — job titles will be null");
  }

  // ─── Build index maps ───────────────────────────────────────────────────────

  // contractId → RawContract
  const contractsById = new Map<string, RawContract>();
  for (const c of contractsData.contracts) {
    contractsById.set(c.id, c);
  }

  // offerId → RawOffer
  const offersById = new Map<string, RawOffer>();
  for (const o of offersData.offers) {
    offersById.set(o.id, o);
  }

  // jobId → RawContract[]
  const contractsByJobId = new Map<string, RawContract[]>();
  for (const c of contractsData.contracts) {
    if (!c.job?.id) continue;
    const arr = contractsByJobId.get(c.job.id) ?? [];
    arr.push(c);
    contractsByJobId.set(c.job.id, arr);
  }

  // jobId → RawOffer[]
  const offersByJobId = new Map<string, RawOffer[]>();
  for (const o of offersData.offers) {
    if (!o.job?.id) continue;
    const arr = offersByJobId.get(o.job.id) ?? [];
    arr.push(o);
    offersByJobId.set(o.job.id, arr);
  }

  // contractId → RawRoom[]
  const roomsByContractId = new Map<string, RawRoom[]>();
  for (const r of roomsData.rooms) {
    if (!r.contractId) continue;
    const arr = roomsByContractId.get(r.contractId) ?? [];
    arr.push(r);
    roomsByContractId.set(r.contractId, arr);
  }

  // userId → Set<contractId> (via rooms)
  const contractIdsByUserId = new Map<string, Set<string>>();
  for (const r of roomsData.rooms) {
    for (const lead of r.leads) {
      const set = contractIdsByUserId.get(lead.userId) ?? new Set();
      if (r.contractId) set.add(r.contractId);
      contractIdsByUserId.set(lead.userId, set);
    }
  }

  // clientOrgId → RawOffer[]
  const offersByClientOrgId = new Map<string, RawOffer[]>();
  for (const o of offersData.offers) {
    if (!o.client?.id) continue;
    const arr = offersByClientOrgId.get(o.client.id) ?? [];
    arr.push(o);
    offersByClientOrgId.set(o.client.id, arr);
  }

  // clientOrgName → RawOffer[] (fallback match)
  const offersByClientName = new Map<string, RawOffer[]>();
  for (const o of offersData.offers) {
    if (!o.client?.name) continue;
    const arr = offersByClientName.get(o.client.name) ?? [];
    arr.push(o);
    offersByClientName.set(o.client.name, arr);
  }

  // Collect all unique job IDs
  const allJobIds = new Set<string>();
  for (const o of offersData.offers) {
    if (o.job?.id) allJobIds.add(o.job.id);
  }
  for (const c of contractsData.contracts) {
    if (c.job?.id) allJobIds.add(c.job.id);
  }

  // ─── Build leads-enriched ───────────────────────────────────────────────────

  const enrichedLeads: EnrichedLead[] = [];

  for (const lead of leadsData.leads) {
    // Rooms already on lead
    const rooms: EnrichedLeadRoom[] = lead.rooms.map((r) => ({
      roomId: r.roomId,
      roomName: r.roomName,
      topic: r.topic ?? null,
      contractId: r.contractId ?? null,
      messageCount: r.messageCount,
      firstAt: r.firstAt ?? null,
      lastAt: r.lastAt ?? null,
    }));

    // Contracts via room.contractId
    const seenContractIds = new Set<string>();
    const contracts: EnrichedLeadContract[] = [];
    for (const r of lead.rooms) {
      if (!r.contractId) continue;
      if (seenContractIds.has(r.contractId)) continue;
      seenContractIds.add(r.contractId);
      const c = contractsById.get(r.contractId);
      if (!c) continue;
      contracts.push({
        contractId: c.id,
        title: c.title ?? null,
        status: c.status ?? null,
        startDate: c.startDate ?? null,
        endDate: c.endDate ?? null,
        clientOrgName: c.clientOrganization?.name ?? null,
        rateDisplay: contractRateDisplay(c),
      });
    }

    // Also match contracts by clientOrganization name matching lead orgNames
    for (const c of contractsData.contracts) {
      if (seenContractIds.has(c.id)) continue;
      const orgName = c.clientOrganization?.name ?? null;
      if (orgName && lead.orgNames.includes(orgName)) {
        seenContractIds.add(c.id);
        contracts.push({
          contractId: c.id,
          title: c.title ?? null,
          status: c.status ?? null,
          startDate: c.startDate ?? null,
          endDate: c.endDate ?? null,
          clientOrgName: orgName,
          rateDisplay: contractRateDisplay(c),
        });
      }
    }

    // Offers via client org name overlap
    const seenOfferIds = new Set<string>();
    const offers: EnrichedLeadOffer[] = [];
    for (const orgName of lead.orgNames) {
      const matched = offersByClientName.get(orgName) ?? [];
      for (const o of matched) {
        if (seenOfferIds.has(o.id)) continue;
        seenOfferIds.add(o.id);
        offers.push({
          offerId: o.id,
          title: o.title ?? null,
          state: o.state ?? null,
          type: o.type ?? null,
          clientName: o.client?.name ?? null,
          rateDisplay: offerRateDisplay(o),
        });
      }
    }

    // Jobs from contracts + offers
    const seenJobIds = new Set<string>();
    const jobs: EnrichedLeadJob[] = [];

    // From contracts
    for (const contract of contracts) {
      const c = contractsById.get(contract.contractId);
      if (!c?.job?.id) continue;
      const jid = c.job.id;
      if (seenJobIds.has(jid)) continue;
      seenJobIds.add(jid);
      const rawJob = jobsById.get(jid);
      jobs.push({
        jobId: jid,
        title: rawJob?.content?.title ?? contract.title ?? null,
        status: "contracted",
      });
    }

    // From offers
    for (const offer of offers) {
      const o = offersById.get(offer.offerId);
      if (!o?.job?.id) continue;
      const jid = o.job.id;
      if (seenJobIds.has(jid)) continue;
      seenJobIds.add(jid);
      const rawJob = jobsById.get(jid);
      const contractsForJob = contractsByJobId.get(jid) ?? [];
      const st =
        contractsForJob.length > 0
          ? "contracted"
          : offer.state === "WITHDRAWN" || offer.state === "DECLINED"
            ? "rejected"
            : "offered";
      jobs.push({
        jobId: jid,
        title: rawJob?.content?.title ?? offer.title ?? null,
        status: st,
      });
    }

    const hasActiveContract = contracts.some((c) => c.status === "ACTIVE");
    const hasAnyContract = contracts.length > 0;

    enrichedLeads.push({
      userId: lead.userId,
      name: lead.name,
      nid: lead.nid,
      orgNames: lead.orgNames,
      rooms,
      contracts,
      offers,
      jobs,
      messageCount: lead.messageCount,
      firstAt: lead.firstAt ?? null,
      lastAt: lead.lastAt ?? null,
      hasActiveContract,
      hasAnyContract,
    });
  }

  // ─── Build jobs-enriched ────────────────────────────────────────────────────

  // roomId → RawRoom
  const roomById = new Map<string, RawRoom>();
  for (const r of roomsData.rooms) roomById.set(r.roomId, r);

  // userId → RawLead (for lead lookup)
  const leadByUserId = new Map<string, RawLead>();
  for (const l of leadsData.leads) leadByUserId.set(l.userId, l);

  const enrichedJobs: EnrichedJob[] = [];

  for (const jobId of allJobIds) {
    const rawJob = jobsById.get(jobId);
    const contracts = contractsByJobId.get(jobId) ?? [];
    const offers = offersByJobId.get(jobId) ?? [];

    // Collect roomIds via contract → room
    const roomIds = new Set<string>();
    for (const c of contracts) {
      const rooms = roomsByContractId.get(c.id) ?? [];
      for (const r of rooms) roomIds.add(r.roomId);
    }

    // Collect leadIds from rooms
    const leadIds = new Set<string>();
    for (const rid of roomIds) {
      const r = roomById.get(rid);
      if (!r) continue;
      for (const lead of r.leads) leadIds.add(lead.userId);
    }

    // Also collect leadIds via offer client name matching
    for (const o of offers) {
      if (!o.client?.name) continue;
      for (const l of leadsData.leads) {
        if (l.orgNames.includes(o.client.name)) {
          leadIds.add(l.userId);
        }
      }
    }

    // Date range
    let firstAt: string | null = null;
    let lastAt: string | null = null;
    for (const rid of roomIds) {
      const r = roomById.get(rid);
      if (!r) continue;
      firstAt = minDate(firstAt, r.firstAt ?? null);
      lastAt = maxDate(lastAt, r.lastAt ?? null);
    }
    for (const c of contracts) {
      firstAt = minDate(firstAt, c.startDate ?? null);
      lastAt = maxDate(lastAt, c.endDate ?? null);
    }

    // Title: job fixture → offer title → contract title
    const title =
      rawJob?.content?.title ?? offers[0]?.title ?? contracts[0]?.title ?? null;

    // Client name
    const clientName =
      offers[0]?.client?.name ?? contracts[0]?.clientOrganization?.name ?? null;

    enrichedJobs.push({
      jobId,
      title,
      status: jobStatus(contracts, offers, rawJob),
      offerIds: offers.map((o) => o.id),
      contractIds: contracts.map((c) => c.id),
      roomIds: [...roomIds],
      leadIds: [...leadIds],
      firstAt,
      lastAt,
      budget: jobBudgetDisplay(rawJob, contracts, offers),
      clientName,
    });
  }

  // Sort: active first, then by lastAt desc
  enrichedJobs.sort((a, b) => {
    const statusOrder = { active: 0, offered: 1, closed: 2, unknown: 3 };
    const sd = statusOrder[a.status] - statusOrder[b.status];
    if (sd !== 0) return sd;
    if (a.lastAt && b.lastAt) return b.lastAt.localeCompare(a.lastAt);
    return 0;
  });

  const generatedAt = new Date().toISOString();

  return {
    leadsEnriched: {
      generatedAt,
      count: enrichedLeads.length,
      leads: enrichedLeads,
    },
    jobsEnriched: {
      generatedAt,
      count: enrichedJobs.length,
      jobs: enrichedJobs,
    },
  };
}

export async function runGraph(): Promise<void> {
  console.error("[graph] Computing cross-entity graph...");
  const { leadsEnriched, jobsEnriched } = computeGraph();

  const leadsPath = resolve(
    process.cwd(),
    "fixtures",
    "agent",
    "leads-enriched.json",
  );
  writeFileSync(leadsPath, JSON.stringify(leadsEnriched, null, 2), "utf8");
  console.error(
    `[graph] leads-enriched: ${leadsEnriched.count} leads → ${leadsPath}`,
  );

  const jobsPath = resolve(
    process.cwd(),
    "fixtures",
    "agent",
    "jobs-enriched.json",
  );
  writeFileSync(jobsPath, JSON.stringify(jobsEnriched, null, 2), "utf8");
  console.error(
    `[graph] jobs-enriched: ${jobsEnriched.count} jobs → ${jobsPath}`,
  );
}
