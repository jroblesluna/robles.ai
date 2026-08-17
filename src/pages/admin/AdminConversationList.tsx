import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import {
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Loader2,
  BarChart3,
  Users,
  TrendingUp,
  Hash,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type {
  ConversationListResponse,
  ConversationAnalytics,
} from '../../../shared/chatTypes';

// ─── Helpers ────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildQueryString(params: Record<string, string | number | boolean | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '' && value !== false) {
      qs.set(key, String(value));
    }
  }
  return qs.toString();
}

// ─── Status Badge ───────────────────────────────────────────────

function StatusBadge({ status }: { status: 'open' | 'closed' }) {
  const config = status === 'open'
    ? { label: 'Open', className: 'bg-green-100 text-green-800 border-green-200' }
    : { label: 'Closed', className: 'bg-gray-100 text-gray-800 border-gray-200' };

  return <Badge className={config.className}>{config.label}</Badge>;
}

// ─── Analytics Section ──────────────────────────────────────────

function AnalyticsSection({ dateFrom, dateTo }: { dateFrom: string; dateTo: string }) {
  const params = buildQueryString({ dateFrom, dateTo });
  const url = `/api/admin/conversations/analytics${params ? `?${params}` : ''}`;

  const { data, isLoading, isError } = useQuery<ConversationAnalytics>({
    queryKey: [url],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Failed to load analytics data.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Total Conversations"
          value={data.totalConversations.toString()}
        />
        <StatCard
          icon={TrendingUp}
          label="Contact Capture Rate"
          value={`${data.contactCaptureRate}%`}
        />
        <StatCard
          icon={Hash}
          label="Avg Messages"
          value={data.averageMessages.toString()}
        />
        <StatCard
          icon={MessageSquare}
          label="Top Topics"
          value={data.topTopics.length > 0 ? data.topTopics[0].topic : '—'}
        />
      </div>

      {/* Top topics list */}
      {data.topTopics.length > 0 && (
        <div className="rounded-lg border p-4">
          <h3 className="mb-3 text-sm font-medium">Top Topics</h3>
          <div className="space-y-2">
            {data.topTopics.map((item) => (
              <div key={item.topic} className="flex items-center justify-between text-sm">
                <span>{item.topic}</span>
                <span className="text-muted-foreground">{item.count} conversations</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

// ─── Main Page Component ────────────────────────────────────────

const tabs = [
  { id: 'conversations', label: 'Conversations', icon: MessageSquare },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
] as const;

type TabId = (typeof tabs)[number]['id'];

export default function AdminConversationList() {
  const [, setLocation] = useLocation();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabId>('conversations');

  // Filter state
  const [page, setPage] = useState(1);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [status, setStatus] = useState<'' | 'open' | 'closed'>('');
  const [hasContact, setHasContact] = useState(false);

  const limit = 20;

  // Build API URL
  const params = buildQueryString({
    page,
    limit,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    status: status || undefined,
    hasContact: hasContact ? 'true' : undefined,
  });
  const listUrl = `/api/admin/conversations${params ? `?${params}` : ''}`;

  const { data, isLoading, isError } = useQuery<ConversationListResponse>({
    queryKey: [listUrl],
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Conversations</h1>
        <p className="text-muted-foreground">
          AI chatbot conversations and lead capture analytics.
        </p>
      </div>

      {/* Tab navigation */}
      <nav className="flex border-b" aria-label="Conversation sections">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={cn(
              'flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
              activeTab === id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground'
            )}
            onClick={() => setActiveTab(id)}
            aria-selected={activeTab === id}
            role="tab"
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>

      {/* Tab content */}
      {activeTab === 'analytics' && (
        <AnalyticsSection dateFrom={dateFrom} dateTo={dateTo} />
      )}

      {activeTab === 'conversations' && (
        <div className="space-y-4">
          {/* Filter bar */}
          <div className="flex flex-wrap items-end gap-3 rounded-lg border p-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="dateFrom" className="text-xs font-medium text-muted-foreground">
                From
              </label>
              <input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
                className="rounded-md border px-3 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="dateTo" className="text-xs font-medium text-muted-foreground">
                To
              </label>
              <input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
                className="rounded-md border px-3 py-1.5 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="statusFilter" className="text-xs font-medium text-muted-foreground">
                Status
              </label>
              <select
                id="statusFilter"
                value={status}
                onChange={(e) => { setStatus(e.target.value as '' | 'open' | 'closed'); setPage(1); }}
                className="rounded-md border px-3 py-1.5 text-sm"
              >
                <option value="">All</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div className="flex items-center gap-2 pb-0.5">
              <input
                id="hasContactFilter"
                type="checkbox"
                checked={hasContact}
                onChange={(e) => { setHasContact(e.target.checked); setPage(1); }}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="hasContactFilter" className="text-sm font-medium">
                Has Contact
              </label>
            </div>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Error state */}
          {isError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Failed to load conversations.
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !isError && data && data.conversations.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12">
              <MessageSquare className="h-10 w-10 text-muted-foreground" />
              <p className="mt-4 text-lg font-medium">No conversations found</p>
              <p className="text-sm text-muted-foreground">
                Adjust your filters or wait for new chatbot interactions.
              </p>
            </div>
          )}

          {/* Conversations table */}
          {!isLoading && data && data.conversations.length > 0 && (
            <>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="border-b bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Date</th>
                      <th className="px-4 py-3 text-left font-medium">Visitor</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-left font-medium">Messages</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.conversations.map((conv) => (
                      <tr
                        key={conv.id}
                        className="border-b transition-colors hover:bg-muted/30 cursor-pointer"
                        onClick={() => setLocation(`/admin/conversations/${conv.id}`)}
                      >
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDate(conv.createdAt)}
                        </td>
                        <td className="px-4 py-3 font-medium">
                          {conv.visitorName || <span className="text-muted-foreground italic">Anonymous</span>}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={conv.status} />
                        </td>
                        <td className="px-4 py-3">{conv.messageCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {(page - 1) * limit + 1}–{Math.min(page * limit, data.total)} of {data.total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Prev
                  </Button>
                  <span className="text-sm font-medium">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
