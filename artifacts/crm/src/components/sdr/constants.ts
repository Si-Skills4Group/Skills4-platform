import type { SdrStage } from "@workspace/api-client-react";

export interface StageConfig {
  value: SdrStage;
  label: string;
  badgeClass: string;
  dotColor: string;
  chartColor: string;
  group: "active" | "terminal";
  legacy?: boolean;
}

export const SDR_STAGE_CONFIG: StageConfig[] = [
  { value: "new",             label: "New",             badgeClass: "bg-slate-100 text-slate-700 border-slate-200",   dotColor: "#94a3b8", chartColor: "#94a3b8", group: "active" },
  { value: "researching",     label: "Researching",     badgeClass: "bg-blue-50 text-blue-700 border-blue-200",       dotColor: "#60a5fa", chartColor: "#60a5fa", group: "active" },
  { value: "contacted",       label: "Contacted",       badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200", dotColor: "#818cf8", chartColor: "#818cf8", group: "active" },
  { value: "outreach_started",label: "Outreach Started",badgeClass: "bg-purple-50 text-purple-700 border-purple-200", dotColor: "#a78bfa", chartColor: "#a78bfa", group: "active", legacy: true },
  { value: "replied",         label: "Replied",         badgeClass: "bg-teal-50 text-teal-700 border-teal-200",       dotColor: "#2dd4bf", chartColor: "#2dd4bf", group: "active" },
  { value: "response_received",label:"Response Rec'd",  badgeClass: "bg-teal-50 text-teal-700 border-teal-200",       dotColor: "#2dd4bf", chartColor: "#2dd4bf", group: "active", legacy: true },
  { value: "interested",      label: "Interested",      badgeClass: "bg-cyan-50 text-cyan-700 border-cyan-200",       dotColor: "#22d3ee", chartColor: "#22d3ee", group: "active" },
  { value: "meeting_booked",  label: "Meeting Booked",  badgeClass: "bg-orange-50 text-orange-700 border-orange-200", dotColor: "#fb923c", chartColor: "#fb923c", group: "active" },
  { value: "qualified",       label: "Qualified",       badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200", dotColor: "#34d399", chartColor: "#34d399", group: "active" },
  { value: "nurture",         label: "Nurture",         badgeClass: "bg-amber-50 text-amber-700 border-amber-200",    dotColor: "#fbbf24", chartColor: "#fbbf24", group: "terminal" },
  { value: "unresponsive",    label: "Unresponsive",    badgeClass: "bg-gray-100 text-gray-600 border-gray-200",      dotColor: "#9ca3af", chartColor: "#9ca3af", group: "terminal" },
  { value: "do_not_contact",  label: "Do Not Contact",  badgeClass: "bg-red-100 text-red-700 border-red-200",         dotColor: "#f87171", chartColor: "#f87171", group: "terminal" },
  { value: "bad_data",        label: "Bad Data",        badgeClass: "bg-rose-50 text-rose-700 border-rose-200",       dotColor: "#fb7185", chartColor: "#fb7185", group: "terminal" },
  { value: "changed_job",     label: "Changed Job",     badgeClass: "bg-violet-50 text-violet-700 border-violet-200", dotColor: "#a78bfa", chartColor: "#a78bfa", group: "terminal" },
  { value: "disqualified",    label: "Disqualified",    badgeClass: "bg-red-50 text-red-700 border-red-200",          dotColor: "#f87171", chartColor: "#f87171", group: "terminal" },
];

export const STAGE_CONFIG_MAP = Object.fromEntries(
  SDR_STAGE_CONFIG.map((s) => [s.value, s])
) as Record<string, StageConfig>;

export const ACTIVE_STAGES = SDR_STAGE_CONFIG.filter((s) => !s.legacy && s.group === "active");
export const TERMINAL_STAGES = SDR_STAGE_CONFIG.filter((s) => !s.legacy && s.group === "terminal");
export const ALL_STAGES_NO_LEGACY = SDR_STAGE_CONFIG.filter((s) => !s.legacy);

export const FUNNEL_STAGE_ORDER: SdrStage[] = [
  "new", "researching", "contacted", "outreach_started",
  "replied", "response_received", "interested",
  "meeting_booked", "qualified",
  "nurture", "unresponsive", "do_not_contact", "bad_data", "changed_job", "disqualified",
];

export const CHART_STAGE_ORDER: SdrStage[] = [
  "new", "researching", "outreach_started", "contacted",
  "replied", "response_received", "interested",
  "meeting_booked", "qualified",
  "nurture", "unresponsive", "do_not_contact", "bad_data", "changed_job", "disqualified",
];

export const LEAD_SOURCES = [
  { value: "linkedin",   label: "LinkedIn" },
  { value: "cold_email", label: "Cold Email" },
  { value: "cold_call",  label: "Cold Call" },
  { value: "cold_list",  label: "Cold List" },
  { value: "referral",   label: "Referral" },
  { value: "inbound",    label: "Inbound" },
  { value: "event",      label: "Event" },
  { value: "website",    label: "Website" },
  { value: "other",      label: "Other" },
];

export const SORT_OPTIONS = [
  { value: "lastActivity",  label: "Last activity" },
  { value: "nextAction",    label: "Next action date" },
  { value: "lastOutreach",  label: "Last outreach" },
  { value: "touches",       label: "Most touches" },
  { value: "created",       label: "Recently created" },
];

export const TERMINAL_STAGE_VALUES = new Set<string>([
  "disqualified", "do_not_contact", "bad_data", "changed_job", "unresponsive",
]);

export function getStageBadgeClass(stage: string | null | undefined): string {
  if (!stage) return "bg-muted text-muted-foreground border-border";
  return STAGE_CONFIG_MAP[stage]?.badgeClass ?? "bg-muted text-muted-foreground border-border";
}

export function getStageLabel(stage: string | null | undefined): string {
  if (!stage) return "—";
  return STAGE_CONFIG_MAP[stage]?.label ?? stage;
}

export function getStageDotColor(stage: string | null | undefined): string {
  if (!stage) return "#94a3b8";
  return STAGE_CONFIG_MAP[stage]?.dotColor ?? "#94a3b8";
}

export const today = new Date().toISOString().split("T")[0];

export function isOverdue(date: string | null | undefined): boolean {
  if (!date) return false;
  return date < today;
}

export function getDaysDiff(date: string): number {
  const ms = new Date(date).getTime() - new Date(today).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}
