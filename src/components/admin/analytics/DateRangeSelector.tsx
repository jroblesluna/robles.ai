import { useState } from "react";
import { format, subDays, startOfDay } from "date-fns";
import { Calendar, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  label: string;
}

const presets: { label: string; getDates: () => { startDate: string; endDate: string } }[] = [
  {
    label: "Today",
    getDates: () => ({
      startDate: format(startOfDay(new Date()), "yyyy-MM-dd"),
      endDate: format(new Date(), "yyyy-MM-dd"),
    }),
  },
  {
    label: "Last 7 Days",
    getDates: () => ({
      startDate: format(subDays(new Date(), 6), "yyyy-MM-dd"),
      endDate: format(new Date(), "yyyy-MM-dd"),
    }),
  },
  {
    label: "Last 30 Days",
    getDates: () => ({
      startDate: format(subDays(new Date(), 29), "yyyy-MM-dd"),
      endDate: format(new Date(), "yyyy-MM-dd"),
    }),
  },
  {
    label: "Last 90 Days",
    getDates: () => ({
      startDate: format(subDays(new Date(), 89), "yyyy-MM-dd"),
      endDate: format(new Date(), "yyyy-MM-dd"),
    }),
  },
];

interface DateRangeSelectorProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export default function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customStart, setCustomStart] = useState(value.startDate);
  const [customEnd, setCustomEnd] = useState(value.endDate);

  const handlePreset = (preset: typeof presets[number]) => {
    const dates = preset.getDates();
    onChange({ ...dates, label: preset.label });
    setIsOpen(false);
  };

  const handleCustomApply = () => {
    if (customStart && customEnd && customStart <= customEnd) {
      onChange({ startDate: customStart, endDate: customEnd, label: "Custom" });
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <Button
        variant="outline"
        className="gap-2"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <Calendar className="h-4 w-4" />
        <span>{value.label}</span>
        <span className="text-muted-foreground text-xs">
          {value.startDate} — {value.endDate}
        </span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
      </Button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          {/* Dropdown */}
          <div
            className="absolute left-0 top-full z-50 mt-2 w-72 rounded-lg border bg-card p-4 shadow-lg"
            role="listbox"
            aria-label="Date range presets"
          >
            <div className="space-y-1">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  className={cn(
                    "w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                    value.label === preset.label && "bg-muted font-medium"
                  )}
                  onClick={() => handlePreset(preset)}
                  role="option"
                  aria-selected={value.label === preset.label}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="mt-3 border-t pt-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Custom Range</p>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="flex-1 rounded-md border px-2 py-1 text-xs"
                  aria-label="Start date"
                />
                <span className="text-xs text-muted-foreground">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="flex-1 rounded-md border px-2 py-1 text-xs"
                  aria-label="End date"
                />
              </div>
              <Button
                size="sm"
                className="mt-2 w-full"
                onClick={handleCustomApply}
                disabled={!customStart || !customEnd || customStart > customEnd}
              >
                Apply
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
