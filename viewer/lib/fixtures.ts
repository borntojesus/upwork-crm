import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import type { TenantSlug } from "./tenants.ts";

const FIXTURES_ROOT = resolve(process.cwd(), "..", "fixtures", "agent");

export interface LeadRoomRef {
  roomId: string;
  roomName: string | null;
  topic: string | null;
  contractId: string | null;
  messageCount: number;
  firstAt: string | null;
  lastAt: string | null;
  tenant?: TenantSlug;
}

export interface Lead {
  userId: string;
  name: string;
  nid: string;
  orgIds: string[];
  orgNames: string[];
  rooms: LeadRoomRef[];
  messageCount: number;
  firstAt: string | null;
  lastAt: string | null;
  tenant?: TenantSlug;
  tenants?: TenantSlug[];
}

export interface LeadsFile {
  generatedAt: string;
  count: number;
  totalMessages: number;
  leads: Lead[];
}

export interface RoomSummary {
  roomId: string;
  roomName: string | null;
  topic: string | null;
  contractId: string | null;
  messageCount: number;
  firstAt: string | null;
  lastAt: string | null;
  leads: { userId: string; name: string; orgName: string | null }[];
  tenant?: TenantSlug;
}

export interface RoomsFile {
  generatedAt: string;
  count: number;
  rooms: RoomSummary[];
}

export interface Message {
  id: string;
  at: string;
  from: string;
  fromOrg: string | null;
  self: boolean;
  text: string;
  hasAttachment: boolean;
}

export interface Transcript {
  roomId: string;
  roomName: string | null;
  topic: string | null;
  contractId: string | null;
  roomType: string | null;
  messages: Message[];
  tenant?: TenantSlug;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export function getLeads(): LeadsFile {
  return readJson<LeadsFile>(resolve(FIXTURES_ROOT, "leads.json"));
}

export function getRooms(): RoomsFile {
  return readJson<RoomsFile>(resolve(FIXTURES_ROOT, "rooms.json"));
}

export function getTranscript(roomId: string): Transcript | null {
  const p = resolve(FIXTURES_ROOT, "transcripts", `${roomId}.json`);
  if (!existsSync(p)) return null;
  return readJson<Transcript>(p);
}

// ─── Contracts ──────────────────────────────────────────────────────────────

export interface ContractTerms {
  hourlyTerms: Array<{
    id: string;
    hourlyRate: { rawValue: string; currency: string };
  }>;
  fixedPriceTerms: Array<{
    id: string;
    fixedAmount: { rawValue: string; currency: string };
  }>;
}

export interface Contract {
  id: string;
  title: string;
  status: "ACTIVE" | "CLOSED" | "PAUSED" | null;
  startDate: string | null;
  endDate: string | null;
  kind: string | null;
  deliveryModel: "CATALOG_PROJECT" | "TALENT_MARKETPLACE" | null;
  offerId: string | null;
  freelancer: { id: string; name: string } | null;
  clientOrganization: { id: string; name: string } | null;
  job: { id: string; info: { status: string | null } } | null;
  terms: ContractTerms;
  tenant?: TenantSlug;
}

export interface ContractsFile {
  fetchedAt: string;
  count: number;
  contracts: Contract[];
}

export function getContracts(): ContractsFile {
  return readJson<ContractsFile>(resolve(FIXTURES_ROOT, "contracts.json"));
}

// ─── Offers ─────────────────────────────────────────────────────────────────

export interface OfferTerms {
  expectedStartDate: string | null;
  expectedEndDate: string | null;
  fixedPriceTerm: { budget: { rawValue: string; currency: string } } | null;
  hourlyTerms: {
    rate: { rawValue: string; currency: string };
    weeklyHoursLimit: number | null;
  } | null;
}

export interface Offer {
  id: string;
  title: string;
  type: string;
  state: string;
  client: { id: string; name: string } | null;
  freelancer: { userDetails: { id: string; nid: string; name: string } } | null;
  offerTerms: OfferTerms;
  job: { id: string } | null;
  vendorProposal: { id: string } | null;
  tenant?: TenantSlug;
}

export interface OffersFile {
  fetchedAt: string;
  count: number;
  offers: Offer[];
}

export function getOffers(): OffersFile {
  return readJson<OffersFile>(resolve(FIXTURES_ROOT, "offers.json"));
}

// ─── Transactions ────────────────────────────────────────────────────────────

export interface MonthTotal {
  month: string;
  credit: number;
  debit: number;
  net: number;
  count: number;
}

export interface Transaction {
  rowNumber: number;
  recordId: string;
  transactionCreationDate: string;
  accountingSubtype: string;
  descriptionUI: string;
  amountCreditedToUser: { rawValue: string; currency: string };
  runningChargeableBalance: { rawValue: string; currency: string };
  relatedAssignment: number | null;
  tenant?: TenantSlug;
}

export interface TransactionsFile {
  fetchedAt: string;
  count: number;
  totalByMonth: MonthTotal[];
  transactions: Transaction[];
}

export function getTransactions(): TransactionsFile {
  return readJson<TransactionsFile>(
    resolve(FIXTURES_ROOT, "transactions.json"),
  );
}

// ─── Public Jobs ─────────────────────────────────────────────────────────────

export interface JobSkill {
  name: string;
  prettyName: string;
}

export interface JobClient {
  totalHires: number;
  totalPostedJobs: number;
  totalReviews: number;
  totalFeedback: number;
  location: { country: string | null; city: string | null } | null;
}

export interface PublicJob {
  id: string;
  ciphertext: string;
  title: string;
  description: string;
  createdDateTime: string;
  publishedDateTime: string;
  type: "HOURLY" | "FIXED";
  engagement: string | null;
  duration: string | null;
  durationLabel: string | null;
  contractorTier: string | null;
  category: string | null;
  subcategory: string | null;
  freelancersToHire: number;
  totalApplicants: number;
  amount: { rawValue: string; currency: string; displayValue: string };
  hourlyBudgetType: string | null;
  hourlyBudgetMin: number;
  hourlyBudgetMax: number;
  skills: JobSkill[];
  client: JobClient;
}

export interface PublicJobsFile {
  publicMarketplaceJobPostingsSearch: {
    jobs: PublicJob[];
    paging: { total: number; count: number; offset: number };
  };
}

export function getPublicJobs(): PublicJob[] {
  const root = resolve(process.cwd(), "..", "fixtures", "05-jobs-public.json");
  const data = readJson<PublicJobsFile>(root);
  return data.publicMarketplaceJobPostingsSearch.jobs;
}

// ─── Agent-enriched fixtures ─────────────────────────────────────────────────

function readJsonSafe<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return fallback;
  }
}

// jobs.json — raw job postings from Upwork API
export interface JobsFileClientCompany {
  companyName: string | null;
  totalHires: number | null;
  totalPostedJobs: number | null;
  totalReviews: number | null;
  totalFeedback: number | null;
  totalSpent: {
    rawValue: string;
    currency: string;
    displayValue: string;
  } | null;
  location: {
    country: string | null;
    city: string | null;
    state: string | null;
  } | null;
  verificationStatus: string | null;
}

export interface JobsFileJob {
  id: string;
  content: { title: string; description: string } | null;
  tenant?: TenantSlug;
  clientCompanyPublic: JobsFileClientCompany | null;
  classification: {
    category: { prefLabel: string } | null;
    subcategory: { prefLabel: string } | null;
    occupationService: { prefLabel: string } | null;
  } | null;
  contractTerms: {
    contractType: "HOURLY" | "FIXED" | null;
    hourlyContractTerms: {
      hourlyBudget: { min: number | null; max: number | null } | null;
      engagementDuration: { weeks: number | null; label: string | null } | null;
    } | null;
    fixedPriceContractTerms: {
      amount: {
        rawValue: string;
        currency: string;
        displayValue: string;
      } | null;
      engagementDuration: { weeks: number | null; label: string | null } | null;
    } | null;
  } | null;
  activityStat: {
    applicationsBidsTotalCount: number | null;
    totalInvitedToInterview: number | null;
  } | null;
}

export interface JobsFile {
  fetchedAt: string;
  count: number;
  jobs: JobsFileJob[];
}

// leads-enriched.json
export interface EnrichedLeadRoom {
  roomId: string;
  roomName: string | null;
  topic: string | null;
  contractId: string | null;
  messageCount: number;
  firstAt: string | null;
  lastAt: string | null;
}

export interface EnrichedLeadContract {
  contractId: string;
  title: string | null;
  status: string | null;
  startDate: string | null;
  endDate: string | null;
  clientOrgName: string | null;
  rateDisplay: string | null;
}

export interface EnrichedLeadOffer {
  offerId: string;
  title: string | null;
  state: string | null;
  type: string | null;
  clientName: string | null;
  rateDisplay: string | null;
}

export interface EnrichedLeadJob {
  jobId: string;
  title: string | null;
  status: "contracted" | "offered" | "rejected" | "pending";
}

export interface EnrichedLead {
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
  tenant?: TenantSlug;
  tenants?: TenantSlug[];
}

export interface LeadsEnriched {
  generatedAt: string;
  count: number;
  leads: EnrichedLead[];
}

// jobs-enriched.json
export interface JobEnriched {
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
  tenant?: TenantSlug;
  tenants?: TenantSlug[];
}

export interface JobsEnriched {
  generatedAt: string;
  count: number;
  jobs: JobEnriched[];
}

export function getJobs(): JobsFile {
  return readJsonSafe<JobsFile>(resolve(FIXTURES_ROOT, "jobs.json"), {
    fetchedAt: new Date().toISOString(),
    count: 0,
    jobs: [],
  });
}

export function getLeadsEnriched(): LeadsEnriched {
  return readJsonSafe<LeadsEnriched>(
    resolve(FIXTURES_ROOT, "leads-enriched.json"),
    { generatedAt: new Date().toISOString(), count: 0, leads: [] },
  );
}

export function getJobsEnriched(): JobsEnriched {
  return readJsonSafe<JobsEnriched>(
    resolve(FIXTURES_ROOT, "jobs-enriched.json"),
    { generatedAt: new Date().toISOString(), count: 0, jobs: [] },
  );
}

export function getLeadById(userId: string): EnrichedLead | null {
  const { leads } = getLeadsEnriched();
  return leads.find((l) => l.userId === userId) ?? null;
}

export function getJobById(id: string): JobsFileJob | null {
  const { jobs } = getJobs();
  return jobs.find((j) => j.id === id) ?? null;
}

export function getJobEnriched(jobId: string): JobEnriched | null {
  const { jobs } = getJobsEnriched();
  return jobs.find((j) => j.jobId === jobId) ?? null;
}

// ─── Tech Scanner files ──────────────────────────────────────────────────────

export interface ScanJobClient {
  totalHires: number;
  totalPostedJobs: number;
  totalReviews: number;
  totalFeedback: number;
  location: { country: string | null; city: string | null } | null;
}

export interface ScanJob {
  id: string;
  ciphertext: string;
  title: string;
  description: string;
  createdDateTime: string;
  publishedDateTime: string;
  type: "HOURLY" | "FIXED";
  engagement: string | null;
  duration: string | null;
  durationLabel: string | null;
  contractorTier: string | null;
  category: string | null;
  subcategory: string | null;
  freelancersToHire: number;
  totalApplicants: number;
  amount: { rawValue: string; currency: string; displayValue: string };
  hourlyBudgetType: string | null;
  hourlyBudgetMin: number;
  hourlyBudgetMax: number;
  skills: JobSkill[];
  client: ScanJobClient;
}

export interface ScanFile {
  slug: string;
  query: string;
  fetchedAt: string;
  count: number;
  jobs: ScanJob[];
}

export interface ScansIndex {
  fetchedAt: string;
  scanners: Array<{
    slug: string;
    query: string;
    count: number;
    fetchedAt: string;
  }>;
}

const SCANS_DIR = resolve(process.cwd(), "..", "fixtures", "jobs", "scans");
const SCANS_INDEX = resolve(
  process.cwd(),
  "..",
  "fixtures",
  "agent",
  "scans.json",
);

export function getScanJobs(slug: string): ScanFile | null {
  const p = resolve(SCANS_DIR, `${slug}.json`);
  if (!existsSync(p)) return null;
  try {
    return readJson<ScanFile>(p);
  } catch {
    return null;
  }
}

export function getScansIndex(): ScansIndex | null {
  if (!existsSync(SCANS_INDEX)) return null;
  try {
    return readJson<ScansIndex>(SCANS_INDEX);
  } catch {
    return null;
  }
}

// ─── Freelancers ─────────────────────────────────────────────────────────────

export interface Freelancer {
  id: string;
  name: string;
  title: string | null;
  photoUrl: string | null;
  location: { country: string | null; city: string | null };
  hourlyRate: { rawValue: string; currency: string } | null;
  totalEarnings: { rawValue: string; currency: string } | null;
  jobSuccessScore: number | null;
  totalHours: number | null;
  totalJobs: number | null;
  reviews: { count: number; average: number } | null;
  skills: string[];
  profileUrl: string | null;
  capturedAt: string;
  tier: "top-rated-plus" | "top-rated" | "rising-talent" | "other" | null;
  notes: string | null;
}

export interface FreelancersFile {
  updatedAt: string;
  count: number;
  freelancers: Freelancer[];
}

export function getFreelancers(): FreelancersFile {
  return readJsonSafe<FreelancersFile>(
    resolve(FIXTURES_ROOT, "freelancers.json"),
    { updatedAt: new Date().toISOString(), count: 0, freelancers: [] },
  );
}

export function getFreelancerById(id: string): Freelancer | null {
  const { freelancers } = getFreelancers();
  return freelancers.find((f) => f.id === id) ?? null;
}

// ─── Talent Search Stats ─────────────────────────────────────────────────────

export interface TalentSearchFilters {
  location: string | null;
  hourlyRateMin: number | null;
  hourlyRateMax: number | null;
  tier: string | null;
  englishLevel: string | null;
  hoursPerWeek: string | null;
}

export interface TalentSearchObservations {
  medianRate: number | null;
  topRatedShare: number | null;
  avgJss: number | null;
  avgTotalEarnings: number | null;
  competition: "low" | "medium" | "high" | null;
}

export interface TalentSearchEntry {
  id: string;
  capturedAt: string;
  query: string;
  filters: TalentSearchFilters | null;
  totalResults: number;
  sampleSize: number;
  observations: TalentSearchObservations | null;
  notes: string | null;
}

export interface TalentSearchFile {
  updatedAt: string;
  count: number;
  entries: TalentSearchEntry[];
}

export function getTalentSearchStats(): TalentSearchFile {
  return readJsonSafe<TalentSearchFile>(
    resolve(FIXTURES_ROOT, "talent-search-stats.json"),
    { updatedAt: new Date().toISOString(), count: 0, entries: [] },
  );
}

export function getTalentSearchEntryById(id: string): TalentSearchEntry | null {
  const { entries } = getTalentSearchStats();
  return entries.find((e) => e.id === id) ?? null;
}

// ─── Top Freelancers (pipeline agent output) ─────────────────────────────────

export interface KeywordDensity {
  keyword: string;
  title: number;
  overview: number;
  skills: number;
  employment: number;
  portfolio: number;
  weighted: number;
}

export interface FreelancerSummary {
  profileKey: string;
  category: string;
  rank: number;
  name: string | null;
  photoUrl: string | null;
  title: string | null;
  hourlyRateDisplay: string | null;
  jobSuccessScore: number | null;
  topRatedStatus: string | null;
  totalEarningsDisplay: string | null;
  totalHours: number | null;
  location: { country: string | null; city: string | null } | null;
  skillsCount: number;
  portfolioCount: number;
  employmentCount: number;
  keywordDensity: KeywordDensity[];
  latestSnapshotAt: string;
  snapshotCount: number;
  lastDiff: null | { from: string; to: string; changedFields: string[] };
  improvements: string[];
}

export interface TopFreelancersCateg {
  slug: string;
  label: string;
  primaryKeyword: string;
  freelancers: FreelancerSummary[];
  avgOverviewWords: number;
  avgPortfolioCount: number;
  avgHourlyRate: number | null;
  topPrimaryScore: number;
  generatedAt: string;
}

export interface TopFreelancersFile {
  generatedAt: string;
  categories: TopFreelancersCateg[];
}

const TOP_FREELANCERS_PATH = resolve(
  process.cwd(),
  "..",
  "fixtures",
  "agent",
  "top-freelancers.json",
);

const FREELANCERS_SNAPSHOTS_DIR = resolve(
  process.cwd(),
  "..",
  "fixtures",
  "freelancers",
);

export function getTopFreelancers(): TopFreelancersFile | null {
  if (!existsSync(TOP_FREELANCERS_PATH)) return null;
  try {
    return JSON.parse(
      readFileSync(TOP_FREELANCERS_PATH, "utf8"),
    ) as TopFreelancersFile;
  } catch {
    return null;
  }
}

export interface ProfileSnapshot {
  profileKey: string;
  category: string;
  fetchedAt: string;
  droppedFields: string[];
  profile: {
    user?: {
      id: string;
      name: string | null;
      photoUrl: string | null;
      location?: { country: string | null; city: string | null } | null;
    };
    title: string | null;
    overview: string | null;
    hourlyRate: {
      rawValue: string;
      currency: string;
      displayValue: string;
    } | null;
    totalEarnings: {
      rawValue: string;
      currency: string;
      displayValue: string;
    } | null;
    totalHours: number | null;
    jobSuccessScore: number | null;
    availability: string | null;
    topRatedStatus: string | null;
    reviewsCount: number | null;
    reviewsAvg: number | null;
    skills: Array<{ name: string }>;
    employment: Array<{
      company: string | null;
      role: string | null;
      from: string | null;
      to: string | null;
      description: string | null;
    }>;
    education: Array<{
      institution: string | null;
      degree: string | null;
      from: string | null;
      to: string | null;
    }>;
    certifications: Array<{
      name: string | null;
      issuer: string | null;
      year: number | null;
    }>;
    portfolio: Array<{ title: string | null; description: string | null }>;
    languages: Array<{ name: string; proficiency: string | null }>;
  };
}

export function getFreelancerSnapshot(
  profileKey: string,
): ProfileSnapshot | null {
  const p = resolve(FREELANCERS_SNAPSHOTS_DIR, profileKey, "latest.json");
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8")) as ProfileSnapshot;
  } catch {
    return null;
  }
}

export function listFreelancerSnapshots(
  profileKey: string,
): Array<{ isoTimestamp: string; path: string }> {
  const dir = resolve(FREELANCERS_SNAPSHOTS_DIR, profileKey);
  if (!existsSync(dir)) return [];
  try {
    return readdirSync(dir)
      .filter((f) => f.endsWith(".json") && f !== "latest.json")
      .map((f) => ({
        isoTimestamp: f.replace(/\.json$/, ""),
        path: resolve(dir, f),
      }))
      .sort((a, b) => b.isoTimestamp.localeCompare(a.isoTimestamp));
  } catch {
    return [];
  }
}
