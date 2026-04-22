import { getLeadsEnriched } from "@/lib/fixtures";
import { LeadsTable } from "@/components/leads-table";
import { parseTenants, matchesFilter } from "@/lib/tenants";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const sp = await searchParams;
  const activeTenants = parseTenants(sp.t);
  const { leads, count } = getLeadsEnriched();
  const filtered = leads.filter((l) => matchesFilter(l, activeTenants));
  return <LeadsTable leads={filtered} count={count} />;
}
