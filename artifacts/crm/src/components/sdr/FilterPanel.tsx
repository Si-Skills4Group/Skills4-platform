import { X, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { Label, Select, SelectOption } from "@/components/ui/core-ui";
import { LEAD_SOURCES, CALL_OUTCOME_CONFIG } from "./constants";

export interface FilterState {
  owner: string;
  leadSource: string;
  handoverStatus: string;
  callOutcome: string;
  overdueOnly: boolean;
  followUpRequired: boolean;
  contactMadeOnly: boolean;
  meetingBooked: boolean;
  hasHandover: boolean;
}

export const DEFAULT_FILTERS: FilterState = {
  owner: "",
  leadSource: "",
  handoverStatus: "",
  callOutcome: "",
  overdueOnly: false,
  followUpRequired: false,
  contactMadeOnly: false,
  meetingBooked: false,
  hasHandover: false,
};

function countActiveFilters(f: FilterState): number {
  let n = 0;
  if (f.owner) n++;
  if (f.leadSource) n++;
  if (f.handoverStatus) n++;
  if (f.callOutcome) n++;
  if (f.overdueOnly) n++;
  if (f.followUpRequired) n++;
  if (f.contactMadeOnly) n++;
  if (f.meetingBooked) n++;
  if (f.hasHandover) n++;
  return n;
}

interface FilterPanelProps {
  open: boolean;
  filters: FilterState;
  onChange: (f: FilterState) => void;
  users: { id: number; fullName: string }[];
}

export { countActiveFilters };

export function FilterPanel({ open, filters, onChange, users }: FilterPanelProps) {
  function set<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    onChange({ ...filters, [key]: value });
  }

  function clearAll() {
    onChange({ ...DEFAULT_FILTERS });
  }

  const activeCount = countActiveFilters(filters);

  return (
    <div className={cn(
      "bg-white border-r flex-shrink-0 overflow-y-auto transition-all duration-200",
      open ? "w-56" : "w-0 overflow-hidden border-r-0"
    )}>
      {open && (
        <div className="p-4 space-y-5 min-w-[224px]">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Filters</p>
            {activeCount > 0 && (
              <button
                onClick={clearAll}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <X size={11} />
                Clear ({activeCount})
              </button>
            )}
          </div>

          {/* Owner */}
          <div className="space-y-1.5">
            <Label className="text-xs">Owner</Label>
            <Select value={filters.owner} onValueChange={(v) => set("owner", v)} className="h-8 text-xs">
              <SelectOption value="">All owners</SelectOption>
              {users.map((u) => (
                <SelectOption key={u.id} value={String(u.id)}>{u.fullName}</SelectOption>
              ))}
            </Select>
          </div>

          {/* Lead Source */}
          <div className="space-y-1.5">
            <Label className="text-xs">Lead source</Label>
            <Select value={filters.leadSource} onValueChange={(v) => set("leadSource", v)} className="h-8 text-xs">
              <SelectOption value="">All sources</SelectOption>
              {LEAD_SOURCES.map((s) => (
                <SelectOption key={s.value} value={s.value}>{s.label}</SelectOption>
              ))}
            </Select>
          </div>

          {/* Last Call Outcome */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1"><Phone size={11} /> Last call outcome</Label>
            <Select value={filters.callOutcome} onValueChange={(v) => set("callOutcome", v)} className="h-8 text-xs">
              <SelectOption value="">Any outcome</SelectOption>
              {CALL_OUTCOME_CONFIG.map((o) => (
                <SelectOption key={o.value} value={o.value}>{o.label}</SelectOption>
              ))}
            </Select>
          </div>

          {/* Handover status */}
          <div className="space-y-1.5">
            <Label className="text-xs">Handover status</Label>
            <Select value={filters.handoverStatus} onValueChange={(v) => set("handoverStatus", v)} className="h-8 text-xs">
              <SelectOption value="">Any</SelectOption>
              <SelectOption value="pending">Pending</SelectOption>
              <SelectOption value="in_progress">In progress</SelectOption>
              <SelectOption value="complete">Complete</SelectOption>
            </Select>
          </div>

          {/* Toggles */}
          <div className="space-y-2 pt-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Quick filters</p>
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={filters.followUpRequired}
                onChange={(e) => set("followUpRequired", e.target.checked)}
                className="rounded accent-primary"
              />
              <span className="text-xs text-foreground group-hover:text-primary transition-colors">Follow-up required</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={filters.overdueOnly}
                onChange={(e) => set("overdueOnly", e.target.checked)}
                className="rounded accent-primary"
              />
              <span className="text-xs text-foreground group-hover:text-primary transition-colors">Overdue next call</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={filters.contactMadeOnly}
                onChange={(e) => set("contactMadeOnly", e.target.checked)}
                className="rounded accent-primary"
              />
              <span className="text-xs text-foreground group-hover:text-primary transition-colors">Contact made</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={filters.meetingBooked}
                onChange={(e) => set("meetingBooked", e.target.checked)}
                className="rounded accent-primary"
              />
              <span className="text-xs text-foreground group-hover:text-primary transition-colors">Meeting booked</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={filters.hasHandover}
                onChange={(e) => set("hasHandover", e.target.checked)}
                className="rounded accent-primary"
              />
              <span className="text-xs text-foreground group-hover:text-primary transition-colors">Handover pending</span>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
