import { useQuery } from "@tanstack/react-query";
import { Loader2, Inbox, Mail, Phone, Building2, CheckCircle2, AlertCircle, AlertTriangle, Clock, Megaphone } from "lucide-react";
import type { Attribution } from "@shared/attribution";
import { Badge } from "@/components/ui/badge";

interface ContactSubmission {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  subject: string;
  message: string;
  newsletter: boolean;
  source: string | null;
  attribution: Attribution | null;
  adsClick: {
    campaign?: string;
    adGroup?: string;
    keyword?: string | null;
    matchType?: string | null;
    device?: string | null;
    network?: string | null;
    adId?: string | null;
    searchTerms?: string[];
  } | null;
  emailStatus: "pending" | "sent" | "failed" | "not_configured" | string;
  emailError: string | null;
  createdAt: string;
  updatedAt: string | null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Readable labels for stored URL parameters; anything else shows its raw name. */
const PARAM_LABELS: Record<string, string> = {
  utm_source: "Source", utm_medium: "Medium", utm_campaign: "Campaign", utm_term: "Keyword", utm_content: "Content",
  utm_id: "Campaign ID", campaignid: "Campaign ID", gad_campaignid: "Campaign ID", adgroupid: "Ad group ID",
  keyword: "Keyword", matchtype: "Match type", creative: "Ad ID", adid: "Ad ID", device: "Device", network: "Network",
  placement: "Placement", s: "Landing variant", gclid: "gclid", fbclid: "fbclid", msclkid: "msclkid",
};

/**
 * Google Ads click data first (resolved names), then URL parameters, then landing/referrer.
 * A value already shown (case-insensitive) is not repeated under another label.
 */
function attributionRows(sub: ContactSubmission): Array<[string, string]> {
  const rows: Array<[string, string]> = [];
  const seen = new Set<string>();
  const add = (label: string, value: string | null | undefined) => {
    const key = value?.trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    rows.push([label, value!.trim()]);
  };
  const click = sub.adsClick;
  if (click) {
    add("Campaign", click.campaign);
    add("Ad group", click.adGroup);
    add("Keyword", click.keyword && click.matchType ? `${click.keyword} (${click.matchType.toLowerCase()})` : click.keyword);
    if (click.keyword) seen.add(click.keyword.toLowerCase());
    if (click.searchTerms?.length) add("Search terms (ad group, that day)", click.searchTerms.join(", "));
    add("Ad ID", click.adId);
    add("Device", click.device?.toLowerCase());
    add("Network", click.network?.toLowerCase());
  }
  for (const [key, value] of Object.entries(sub.attribution?.params ?? {})) {
    if (key === "gclid" || key === "gbraid" || key === "wbraid" || key === "fbclid") continue;
    add(PARAM_LABELS[key] ?? key, value);
  }
  add("Landing page", sub.attribution?.landingPage);
  add("Referrer", sub.attribution?.referrer);
  return rows;
}

function AttributionDetails({ sub }: { sub: ContactSubmission }) {
  const rows = attributionRows(sub);
  if (!sub.source && rows.length === 0) return <span className="text-muted-foreground">Direct / unknown</span>;
  return (
    <div className="space-y-1">
      {sub.source && (
        <Badge variant="outline" className="gap-1">
          <Megaphone className="h-3 w-3" />
          {sub.source}
        </Badge>
      )}
      <dl className="text-xs text-muted-foreground">
        {rows.map(([label, value]) => (
          <div key={label} className="break-anywhere">
            <dt className="inline font-medium text-foreground/80">{label}:</dt> <dd className="inline">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function StatusBadge({ status, error }: { status: string; error: string | null }) {
  switch (status) {
    case "sent":
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200 gap-1 hover:bg-green-100">
          <CheckCircle2 className="h-3 w-3" />
          Email Sent
        </Badge>
      );
    case "failed":
      return (
        <Badge
          className="bg-red-100 text-red-800 border-red-200 gap-1 hover:bg-red-100"
          title={error ? `SMTP Error: ${error}` : undefined}
        >
          <AlertCircle className="h-3 w-3" />
          Email Failed {error ? `(${error})` : ""}
        </Badge>
      );
    case "not_configured":
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-200 gap-1 hover:bg-amber-100">
          <AlertTriangle className="h-3 w-3" />
          No SMTP Config
        </Badge>
      );
    default:
      return (
        <Badge className="bg-slate-100 text-slate-800 border-slate-200 gap-1 hover:bg-slate-100">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      );
  }
}

export default function AdminContactSubmissions() {
  const { data, isLoading, isError } = useQuery<{ submissions: ContactSubmission[] }>({
    queryKey: ["/api/admin/contact-submissions"],
  });

  const submissions = data?.submissions ?? [];

  return (
    <div className="flex flex-1 flex-col space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Contact Submissions</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          All inquiries sent via the website contact form, stored in the database with their ad / traffic attribution.
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {isError && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load contact submissions.
        </div>
      )}

      {!isLoading && !isError && submissions.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <Inbox className="h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-lg font-medium">No contact messages yet</p>
          <p className="text-sm text-muted-foreground">
            Inquiries submitted through the website will appear here automatically.
          </p>
        </div>
      )}

      {!isLoading && submissions.length > 0 && (
        <>
          {/* Table — sm and up */}
          <div className="hidden overflow-x-auto rounded-lg border sm:block">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Sender</th>
                  <th className="px-4 py-3 text-left font-medium">Contact</th>
                  <th className="px-4 py-3 text-left font-medium">Company</th>
                  <th className="px-4 py-3 text-left font-medium">Subject & Message</th>
                  <th className="px-4 py-3 text-left font-medium">Attribution</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => (
                  <tr key={sub.id} className="border-b transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap align-top">
                      {formatDate(sub.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-medium align-top">
                      {sub.name}
                      {sub.newsletter && (
                        <span className="block text-xs font-normal text-muted-foreground">
                          + Newsletter
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3 shrink-0" /> {sub.email}
                        </span>
                        {sub.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3 shrink-0" /> {sub.phone}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground align-top">
                      {sub.company ? (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3 shrink-0 text-muted-foreground" />
                          {sub.company}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-md align-top">
                      <div className="font-medium text-foreground">{sub.subject}</div>
                      <div className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap line-clamp-4">
                        {sub.message}
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-xs align-top">
                      <AttributionDetails sub={sub} />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <StatusBadge status={sub.emailStatus} error={sub.emailError} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards — mobile only */}
          <div className="space-y-3 sm:hidden">
            {submissions.map((sub) => (
              <div key={sub.id} className="rounded-lg border bg-card p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium">{sub.name}</span>
                  <StatusBadge status={sub.emailStatus} error={sub.emailError} />
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p className="flex items-center gap-1">
                    <Mail className="h-3 w-3 shrink-0" /> {sub.email}
                  </p>
                  {sub.phone && (
                    <p className="flex items-center gap-1">
                      <Phone className="h-3 w-3 shrink-0" /> {sub.phone}
                    </p>
                  )}
                  {sub.company && (
                    <p className="flex items-center gap-1">
                      <Building2 className="h-3 w-3 shrink-0" /> {sub.company}
                    </p>
                  )}
                </div>
                <div className="rounded bg-muted/40 p-2 text-xs">
                  <p className="font-semibold">{sub.subject}</p>
                  <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{sub.message}</p>
                </div>
                <AttributionDetails sub={sub} />
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                  <span>{formatDate(sub.createdAt)}</span>
                  {sub.newsletter && <span>Newsletter: Yes</span>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

