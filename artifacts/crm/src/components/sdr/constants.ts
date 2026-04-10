import type { CallOutcome, SdrStage } from "@workspace/api-client-react";

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
  // Active funnel stages (in order)
  { value: "new",              label: "New",              badgeClass: "bg-slate-100 text-slate-700 border-slate-200",     dotColor: "#94a3b8", chartColor: "#94a3b8", group: "active" },
  { value: "researching",      label: "Researching",      badgeClass: "bg-blue-50 text-blue-700 border-blue-200",         dotColor: "#60a5fa", chartColor: "#60a5fa", group: "active" },
  { value: "attempted_call",   label: "Attempted Call",   badgeClass: "bg-violet-50 text-violet-700 border-violet-200",   dotColor: "#a78bfa", chartColor: "#a78bfa", group: "active" },
  { value: "contact_made",     label: "Contact Made",     badgeClass: "bg-sky-50 text-sky-700 border-sky-200",            dotColor: "#38bdf8", chartColor: "#38bdf8", group: "active" },
  { value: "no_contact",       label: "No Contact",       badgeClass: "bg-orange-50 text-orange-600 border-orange-200",   dotColor: "#fb923c", chartColor: "#fb923c", group: "active" },
  { value: "follow_up_required",label:"Follow-up Req'd",  badgeClass: "bg-amber-50 text-amber-700 border-amber-200",      dotColor: "#f59e0b", chartColor: "#f59e0b", group: "active" },
  { value: "replied",          label: "Replied",          badgeClass: "bg-teal-50 text-teal-700 border-teal-200",         dotColor: "#2dd4bf", chartColor: "#2dd4bf", group: "active" },
  { value: "interested",       label: "Interested",       badgeClass: "bg-cyan-50 text-cyan-700 border-cyan-200",         dotColor: "#22d3ee", chartColor: "#22d3ee", group: "active" },
  { value: "meeting_booked",   label: "Meeting Booked",   badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",dotColor: "#34d399", chartColor: "#34d399", group: "active" },
  { value: "qualified",        label: "Qualified",        badgeClass: "bg-green-50 text-green-700 border-green-200",      dotColor: "#4ade80", chartColor: "#4ade80", group: "active" },
  // Terminal stages
  { value: "nurture",          label: "Nurture",          badgeClass: "bg-indigo-50 text-indigo-600 border-indigo-200",   dotColor: "#818cf8", chartColor: "#818cf8", group: "terminal" },
  { value: "unresponsive",     label: "Unresponsive",     badgeClass: "bg-gray-100 text-gray-600 border-gray-200",        dotColor: "#9ca3af", chartColor: "#9ca3af", group: "terminal" },
  { value: "do_not_contact",   label: "Do Not Contact",   badgeClass: "bg-red-100 text-red-700 border-red-200",           dotColor: "#f87171", chartColor: "#f87171", group: "terminal" },
  { value: "bad_data",         label: "Bad Data",         badgeClass: "bg-rose-50 text-rose-700 border-rose-200",         dotColor: "#fb7185", chartColor: "#fb7185", group: "terminal" },
  { value: "changed_job",      label: "Changed Job",      badgeClass: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",dotColor: "#e879f9", chartColor: "#e879f9", group: "terminal" },
  { value: "disqualified",     label: "Disqualified",     badgeClass: "bg-red-50 text-red-700 border-red-200",            dotColor: "#f87171", chartColor: "#f87171", group: "terminal" },
  // Legacy (backward-compat only, hidden from funnel bar)
  { value: "outreach_started", label: "Outreach Started", badgeClass: "bg-purple-50 text-purple-600 border-purple-200",  dotColor: "#a78bfa", chartColor: "#a78bfa", group: "active", legacy: true },
  { value: "contacted",        label: "Contacted",        badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",  dotColor: "#818cf8", chartColor: "#818cf8", group: "active", legacy: true },
  { value: "response_received",label: "Response Rec'd",   badgeClass: "bg-teal-50 text-teal-700 border-teal-200",        dotColor: "#2dd4bf", chartColor: "#2dd4bf", group: "active", legacy: true },
];

export const STAGE_CONFIG_MAP = Object.fromEntries(
  SDR_STAGE_CONFIG.map((s) => [s.value, s])
) as Record<string, StageConfig>;

export const ACTIVE_STAGES = SDR_STAGE_CONFIG.filter((s) => !s.legacy && s.group === "active");
export const TERMINAL_STAGES = SDR_STAGE_CONFIG.filter((s) => !s.legacy && s.group === "terminal");
export const ALL_STAGES_NO_LEGACY = SDR_STAGE_CONFIG.filter((s) => !s.legacy);

export const FUNNEL_STAGE_ORDER: SdrStage[] = [
  "new", "researching", "attempted_call", "contact_made", "no_contact", "follow_up_required",
  "replied", "interested", "meeting_booked", "qualified",
  "nurture", "unresponsive", "do_not_contact", "bad_data", "changed_job", "disqualified",
  "outreach_started", "contacted", "response_received",
];

export const CHART_STAGE_ORDER: SdrStage[] = FUNNEL_STAGE_ORDER;

// ─── Call Outcome Config ──────────────────────────────────────────────────────

export interface CallOutcomeConfig {
  value: CallOutcome;
  label: string;
  badgeClass: string;
  dotColor: string;
  requiresFollowUp: boolean;
  quick: boolean;
}

export const CALL_OUTCOME_CONFIG: CallOutcomeConfig[] = [
  { value: "no_answer",           label: "No Answer",             badgeClass: "bg-gray-100 text-gray-600 border-gray-200",     dotColor: "#9ca3af", requiresFollowUp: false, quick: true },
  { value: "voicemail_left",      label: "Voicemail Left",        badgeClass: "bg-blue-50 text-blue-600 border-blue-200",      dotColor: "#60a5fa", requiresFollowUp: false, quick: true },
  { value: "gatekeeper",          label: "Gatekeeper",            badgeClass: "bg-orange-50 text-orange-600 border-orange-200",dotColor: "#fb923c", requiresFollowUp: false, quick: true },
  { value: "wrong_person",        label: "Wrong Person",          badgeClass: "bg-rose-50 text-rose-600 border-rose-200",      dotColor: "#fb7185", requiresFollowUp: false, quick: true },
  { value: "spoke_call_back_later",label:"Spoke – Call Back Later",badgeClass: "bg-amber-50 text-amber-700 border-amber-200",  dotColor: "#f59e0b", requiresFollowUp: true,  quick: false },
  { value: "spoke_send_info",     label: "Spoke – Send Info",     badgeClass: "bg-cyan-50 text-cyan-700 border-cyan-200",      dotColor: "#22d3ee", requiresFollowUp: true,  quick: false },
  { value: "spoke_not_interested",label:"Spoke – Not Interested", badgeClass: "bg-red-50 text-red-600 border-red-200",         dotColor: "#f87171", requiresFollowUp: false, quick: false },
  { value: "spoke_interested",    label: "Spoke – Interested",    badgeClass: "bg-teal-50 text-teal-700 border-teal-200",      dotColor: "#2dd4bf", requiresFollowUp: false, quick: false },
  { value: "meeting_booked",      label: "Meeting Booked",        badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",dotColor: "#34d399", requiresFollowUp: true, quick: false },
];

export const CALL_OUTCOME_MAP = Object.fromEntries(
  CALL_OUTCOME_CONFIG.map((c) => [c.value, c])
) as Record<string, CallOutcomeConfig>;

export function getCallOutcomeLabel(outcome: string | null | undefined): string {
  if (!outcome) return "—";
  return CALL_OUTCOME_MAP[outcome]?.label ?? outcome.replace(/_/g, " ");
}

export function getCallOutcomeBadgeClass(outcome: string | null | undefined): string {
  if (!outcome) return "bg-muted text-muted-foreground border-border";
  return CALL_OUTCOME_MAP[outcome]?.badgeClass ?? "bg-muted text-muted-foreground border-border";
}

export function getCallOutcomeDotColor(outcome: string | null | undefined): string {
  if (!outcome) return "#94a3b8";
  return CALL_OUTCOME_MAP[outcome]?.dotColor ?? "#94a3b8";
}

// ─── Lead Sources ─────────────────────────────────────────────────────────────

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
  { value: "nextCallDate",  label: "Next call date" },
  { value: "nextAction",    label: "Next action date" },
  { value: "callCount",     label: "Most calls" },
  { value: "touches",       label: "Most touches" },
  { value: "created",       label: "Recently created" },
  { value: "meetingDate",   label: "Meeting date" },
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
  return STAGE_CONFIG_MAP[stage]?.label ?? stage.replace(/_/g, " ");
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
