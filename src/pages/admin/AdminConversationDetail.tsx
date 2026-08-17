import { useLocation, useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, User, Mail, Phone, Building2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChatMessage, ContactData } from "../../../shared/chatTypes";

interface ConversationDetail {
  id: number;
  sessionId: string;
  status: "open" | "closed";
  closureReason: "timeout" | "goodbye" | "session_lost" | null;
  createdAt: string;
  lastMessageAt: string;
  closedAt: string | null;
  messages: ChatMessage[];
  contactData: ContactData | null;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  open: {
    label: "Open",
    className: "bg-green-100 text-green-800 border-green-200",
  },
  closed: {
    label: "Closed",
    className: "bg-gray-100 text-gray-800 border-gray-200",
  },
};

const closureReasonLabels: Record<string, string> = {
  timeout: "Session timeout",
  goodbye: "Visitor said goodbye",
  session_lost: "Session lost",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function AdminConversationDetail() {
  const [, setLocation] = useLocation();
  const [matched, params] = useRoute("/admin/conversations/:id");

  const conversationId = params?.id;

  const { data, isLoading, error } = useQuery<ConversationDetail>({
    queryKey: [`/api/admin/conversations/${conversationId}`],
    enabled: !!conversationId,
  });

  if (!matched) {
    return null;
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => setLocation("/admin/conversations")}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to conversations
        </Button>
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error instanceof Error ? error.message : "Conversation not found"}
        </div>
      </div>
    );
  }

  const statusCfg = statusConfig[data.status] || {
    label: data.status,
    className: "bg-gray-100 text-gray-800 border-gray-200",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/admin/conversations")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Conversation #{data.id}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge className={statusCfg.className}>{statusCfg.label}</Badge>
              {data.closureReason && (
                <span className="text-xs text-muted-foreground">
                  {closureReasonLabels[data.closureReason] || data.closureReason}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            Started: {formatDateTime(data.createdAt)}
          </span>
          {data.closedAt && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Closed: {formatDateTime(data.closedAt)}
            </span>
          )}
        </div>
      </div>

      {/* Contact Data Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Contact Information</CardTitle>
        </CardHeader>
        <CardContent>
          {data.contactData &&
          (data.contactData.name || data.contactData.email || data.contactData.phone) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {(data.contactData.name || data.contactData.lastName) && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">
                    {[data.contactData.name, data.contactData.lastName]
                      .filter(Boolean)
                      .join(" ")}
                  </span>
                </div>
              )}
              {data.contactData.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a
                    href={`mailto:${data.contactData.email}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {data.contactData.email}
                  </a>
                </div>
              )}
              {data.contactData.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <a
                    href={`tel:${data.contactData.phone}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {data.contactData.phone}
                  </a>
                </div>
              )}
              {data.contactData.company && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">{data.contactData.company}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No contact information captured for this conversation.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Transcript */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">
          Transcript ({data.messages.length} messages)
        </h2>
        <div className="space-y-3 rounded-lg border p-4">
          {data.messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No messages in this conversation.
            </p>
          ) : (
            data.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.role === "visitor" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[75%] rounded-lg px-4 py-2.5 ${
                    msg.role === "visitor"
                      ? "bg-blue-600 text-white"
                      : "bg-muted"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs font-medium ${
                        msg.role === "visitor"
                          ? "text-blue-100"
                          : "text-muted-foreground"
                      }`}
                    >
                      {msg.role === "visitor" ? "Visitor" : "Assistant"}
                    </span>
                    <span
                      className={`text-xs ${
                        msg.role === "visitor"
                          ? "text-blue-200"
                          : "text-muted-foreground"
                      }`}
                    >
                      {formatTime(msg.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
