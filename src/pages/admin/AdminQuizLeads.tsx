import { useQuery } from "@tanstack/react-query";
import { Loader2, ClipboardList, CheckCircle2, Clock, Mail, Phone } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface QuizLead {
  id: number;
  name: string;
  email: string;
  company: string | null;
  whatsapp: string | null;
  score: number;
  profile: string;
  recommendedServices: string[];
  locale: string;
  verified: boolean;
  createdAt: string;
  verifiedAt: string | null;
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

function VerifiedBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <Badge className="bg-green-100 text-green-800 border-green-200 gap-1">
      <CheckCircle2 className="h-3 w-3" />
      Verified
    </Badge>
  ) : (
    <Badge className="bg-amber-100 text-amber-800 border-amber-200 gap-1">
      <Clock className="h-3 w-3" />
      Pending
    </Badge>
  );
}

export default function AdminQuizLeads() {
  const { data, isLoading, isError } = useQuery<{ leads: QuizLead[] }>({
    queryKey: ["/api/admin/quiz-leads"],
  });

  const leads = data?.leads ?? [];

  return (
    <div className="flex flex-1 flex-col space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Quiz Leads</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Interested clients who completed the AI Diagnosis Quiz on /diagnostico-ia.
        </p>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {isError && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Failed to load quiz leads.
        </div>
      )}

      {!isLoading && !isError && leads.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
          <ClipboardList className="h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-lg font-medium">No quiz leads yet</p>
          <p className="text-sm text-muted-foreground">
            Leads will appear here as visitors complete the AI Diagnosis Quiz.
          </p>
        </div>
      )}

      {!isLoading && leads.length > 0 && (
        <>
          {/* Table — sm and up */}
          <div className="hidden overflow-x-auto rounded-lg border sm:block">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">Contact</th>
                  <th className="px-4 py-3 text-left font-medium">Company</th>
                  <th className="px-4 py-3 text-left font-medium">Score</th>
                  <th className="px-4 py-3 text-left font-medium">Profile</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-b transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {formatDate(lead.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-medium">{lead.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" /> {lead.email}
                        </span>
                        {lead.whatsapp && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {lead.whatsapp}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{lead.company || "—"}</td>
                    <td className="px-4 py-3 font-semibold">{lead.score}/100</td>
                    <td className="px-4 py-3 capitalize">{lead.profile}</td>
                    <td className="px-4 py-3">
                      <VerifiedBadge verified={lead.verified} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards — mobile only */}
          <div className="space-y-3 sm:hidden">
            {leads.map((lead) => (
              <div key={lead.id} className="rounded-lg border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium">{lead.name}</span>
                  <VerifiedBadge verified={lead.verified} />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{lead.email}</p>
                {lead.company && <p className="text-xs text-muted-foreground">{lead.company}</p>}
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="font-semibold">{lead.score}/100 · <span className="capitalize">{lead.profile}</span></span>
                  <span className="text-muted-foreground">{formatDate(lead.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
