import { useQuery } from "@tanstack/react-query";
import { Loader2, Inbox, Mail, Phone, Building2, CheckCircle2, AlertCircle, AlertTriangle, Clock } from "lucide-react";
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
          All inquiries sent via the website contact form, stored directly in database for backup.
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

