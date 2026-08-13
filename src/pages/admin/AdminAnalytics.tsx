import { useState } from "react";
import { format, subDays } from "date-fns";
import { BarChart3, Globe, Activity, Share2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import DateRangeSelector, { type DateRange } from "@/components/admin/analytics/DateRangeSelector";
import OverviewTab from "@/components/admin/analytics/OverviewTab";
import TrafficTab from "@/components/admin/analytics/TrafficTab";
import BehaviorTab from "@/components/admin/analytics/BehaviorTab";
import SocialTab from "@/components/admin/analytics/SocialTab";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const tabs = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "traffic", label: "Traffic", icon: Globe },
  { id: "behavior", label: "Behavior", icon: Activity },
  { id: "social", label: "Social", icon: Share2 },
] as const;

type TabId = typeof tabs[number]["id"];

const defaultDateRange: DateRange = {
  startDate: format(subDays(new Date(), 29), "yyyy-MM-dd"),
  endDate: format(new Date(), "yyyy-MM-dd"),
  label: "Last 30 Days",
};

export default function AdminAnalytics() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await apiRequest("POST", "/api/admin/analytics/refresh");
      toast({ title: "Cache cleared", description: "Dashboard data will refresh shortly." });
    } catch {
      toast({ title: "Error", description: "Failed to clear cache.", variant: "destructive" });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Website traffic and social media performance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangeSelector value={dateRange} onChange={setDateRange} />
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            aria-label="Refresh data"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Tab navigation */}
      <nav className="flex border-b" aria-label="Analytics sections">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            className={cn(
              "flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              activeTab === id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground"
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
      <div role="tabpanel" aria-label={`${activeTab} tab content`}>
        {activeTab === "overview" && (
          <OverviewTab dateRange={dateRange} />
        )}
        {activeTab === "traffic" && (
          <TrafficTab dateRange={dateRange} />
        )}
        {activeTab === "behavior" && (
          <BehaviorTab dateRange={dateRange} />
        )}
        {activeTab === "social" && (
          <SocialTab dateRange={dateRange} />
        )}
      </div>
    </div>
  );
}

/** Generic placeholder for tabs not yet implemented */
function TabPlaceholder({ name }: { name: string }) {
  return (
    <div className="rounded-lg border border-dashed p-12 text-center">
      <Activity className="mx-auto h-12 w-12 text-muted-foreground/50" />
      <h3 className="mt-4 text-lg font-medium">{name}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {name} reports will appear here.
      </p>
    </div>
  );
}
