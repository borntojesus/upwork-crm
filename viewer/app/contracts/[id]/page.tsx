import Link from "next/link";
import { notFound } from "next/navigation";
import { getContracts, getRooms } from "@/lib/fixtures";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BriefcaseIcon, MessageSquareIcon } from "lucide-react";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

function fmtMoney(rawValue: string, currency: string): string {
  const v = parseFloat(rawValue);
  return v.toLocaleString("en-US", { style: "currency", currency });
}

function statusVariant(
  status: string | null,
): "success" | "destructive" | "secondary" | "outline" {
  if (status === "ACTIVE") return "success";
  if (status === "CLOSED") return "secondary";
  if (status === "PAUSED") return "outline";
  return "secondary";
}

export async function generateStaticParams() {
  const { contracts } = getContracts();
  return contracts.map((c) => ({ id: c.id }));
}

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { contracts } = getContracts();
  const contract = contracts.find((c) => c.id === id);
  if (!contract) notFound();

  const { rooms } = getRooms();
  const matchedRoom = rooms.find((r) => r.contractId === contract.id);

  const hourlyRate = contract.terms.hourlyTerms[0]?.hourlyRate;
  const fixedAmount = contract.terms.fixedPriceTerms[0]?.fixedAmount;

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link
              href="/contracts"
              className="text-xs text-muted-foreground hover:underline"
            >
              ← Contracts
            </Link>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              {contract.title}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground font-mono">
              Contract #{contract.id}
            </p>
          </div>
          <Badge variant={statusVariant(contract.status)} className="mt-6">
            {contract.status ?? "—"}
          </Badge>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BriefcaseIcon className="h-4 w-4 text-muted-foreground" />
              Contract details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Client</dt>
                <dd className="font-medium text-right">
                  {contract.clientOrganization?.name ?? "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Freelancer</dt>
                <dd className="font-medium text-right">
                  {contract.freelancer?.name ?? "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Delivery model</dt>
                <dd className="font-medium">
                  {contract.deliveryModel === "CATALOG_PROJECT"
                    ? "Catalog Project"
                    : contract.deliveryModel === "TALENT_MARKETPLACE"
                      ? "Talent Marketplace"
                      : "—"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Start date</dt>
                <dd className="tabular-nums">{fmtDate(contract.startDate)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">End date</dt>
                <dd className="tabular-nums text-muted-foreground">
                  {fmtDate(contract.endDate)}
                </dd>
              </div>
              {contract.offerId && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Offer ID</dt>
                  <dd className="font-mono text-xs">{contract.offerId}</dd>
                </div>
              )}
              {contract.job?.id && (
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Job ID</dt>
                  <dd className="font-mono text-xs">{contract.job.id}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Terms</CardTitle>
            <CardDescription>
              {contract.terms.hourlyTerms.length} hourly ·{" "}
              {contract.terms.fixedPriceTerms.length} fixed-price
            </CardDescription>
          </CardHeader>
          <CardContent>
            {hourlyRate && (
              <div className="mb-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  Hourly rate
                </p>
                <p className="text-2xl font-bold tabular-nums">
                  {fmtMoney(hourlyRate.rawValue, hourlyRate.currency)}
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    /hr
                  </span>
                </p>
              </div>
            )}
            {fixedAmount && (
              <div className="mb-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  Fixed amount
                </p>
                <p className="text-2xl font-bold tabular-nums">
                  {fmtMoney(fixedAmount.rawValue, fixedAmount.currency)}
                </p>
              </div>
            )}
            {!hourlyRate && !fixedAmount && (
              <p className="text-sm text-muted-foreground">
                No term details available.
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      {matchedRoom && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquareIcon className="h-4 w-4 text-muted-foreground" />
              Linked room
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {matchedRoom.topic ??
                    matchedRoom.roomName ??
                    matchedRoom.roomId}
                </p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  {matchedRoom.roomId}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant="secondary">
                  {matchedRoom.messageCount} messages
                </Badge>
                <Link
                  href={`/rooms/${matchedRoom.roomId}`}
                  className="text-sm text-primary hover:underline"
                >
                  Open transcript →
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
