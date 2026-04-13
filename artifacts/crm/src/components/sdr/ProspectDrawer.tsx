import {
  X, Mail, Linkedin, CalendarCheck, Trophy, XCircle, Plus,
  ArrowRight, Sparkles, CheckSquare, Star, Phone,
  RefreshCw, User2, Hash, Target, ChevronDown,
  AlertTriangle, Send, PhoneCall, PhoneOff, Voicemail,
  PhoneForwarded, Clock, CheckCircle2, RotateCcw,
} from "lucide-react";
import { useListActivity } from "@workspace/api-client-react";
import type { Engagement, CallOutcome, SdrStage } from "@workspace/api-client-react";
import { Button } from "@/components/ui/core-ui";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { formatDate, cn } from "@/lib/utils";
import {
  getStageBadgeClass, getStageLabel, getStageDotColor,
  getCallOutcomeLabel, getCallOutcomeBadgeClass, getCallOutcomeDotColor,
  LEAD_SOURCES, isOverdue, CALL_OUTCOME_CONFIG,
} from "./constants";

export type DrawerAction =
  | { type: "logCallQuick"; eng: Engagement; outcome: CallOutcome }
  | { type: "logCallDetailed"; eng: Engagement; outcome: CallOutcome }
  | { type: "logEmail"; eng: Engagement }
  | { type: "logLinkedin"; eng: Engagement }
  | { type: "meeting"; eng: Engagement }
  | { type: "qualify"; eng: Engagement }
  | { type: "disqualify"; eng: Engagement }
  | { type: "createTask"; eng: Engagement }
  | { type: "changeStage"; eng: Engagement; stage: SdrStage }
  | { type: "openChangeStage"; eng: Engagement };

interface ProspectDrawerProps {
  engagement: Engagement | null;
  onClose: () => void;
  onAction: (action: DrawerAction) => void;
  isMutating: boolean;
}

function ActivityIcon({ action }: { action: string | null | undefined }) {
  if (!action) return <Sparkles size={12} className="text-muted-foreground flex-shrink-0" />;
  if (action === "call_logged") return <PhoneCall size={12} className="text-violet-500 flex-shrink-0" />;
  if (action.includes("stage_changed")) return <ArrowRight size={12} className="text-blue-500 flex-shrink-0" />;
  if (action.includes("task_created")) return <CheckSquare size={12} className="text-emerald-500 flex-shrink-0" />;
  if (action.includes("engagement_created")) return <Star size={12} className="text-amber-500 flex-shrink-0" />;
  if (action.includes("outreach")) return <Send size={12} className="text-indigo-500 flex-shrink-0" />;
  return <Sparkles size={12} className="text-muted-foreground flex-shrink-0" />;
}

function formatActivity(action: string | null | undefined, context: Record<string, any> | null): string {
  if (!action) return "Activity logged";
  if (!context) return action.replace(/_/g, " ");
  switch (action) {
    case "engagement_created": return "Prospect added to call queue";
    case "stage_changed":
      if (context.stageFrom && context.stageTo) {
        return `Stage: ${getStageLabel(context.stageFrom)} → ${getStageLabel(context.stageTo)}`;
      }
      return "Stage updated";
    case "task_created":
      return `Task: ${context.taskTitle ?? "Follow-up"}${context.via ? " (auto)" : ""}`;
    case "call_logged":
      return `Call logged: ${getCallOutcomeLabel(context.outcome)}${context.contactMade ? " ✓ Contact made" : ""}`;
    default:
      return action.replace(/_/g, " ");
  }
}

function relativeCallDate(dateStr: string | null | undefined): { label: string; overdue: boolean; today: boolean } | null {
  if (!dateStr) return null;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const d = new Date(dateStr); d.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - now.getTime()) / 86400000);
  if (diff === 0) return { label: "Today", overdue: false, today: true };
  if (diff === 1) return { label: "Tomorrow", overdue: false, today: false };
  if (diff === -1) return { label: "Yesterday", overdue: true, today: false };
  if (diff < 0) return { label: `${-diff}d overdue`, overdue: true, today: false };
  return { label: formatDate(dateStr), overdue: false, today: false };
}

function timeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  const hours = Math.floor(ms / 3600000);
  const days = Math.floor(ms / 86400000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatDate(dateStr.split("T")[0]);
}

function InfoRow({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide">{label}</p>
      <p className={cn("text-sm font-medium mt-0.5 leading-snug", highlight ? "text-amber-600" : "text-foreground")}>{value}</p>
    </div>
  );
}

function CallOutcomeIcon({ outcome }: { outcome: string | null | undefined }) {
  switch (outcome) {
    case "no_answer": return <PhoneOff size={10} className="flex-shrink-0" />;
    case "voicemail_left": return <Voicemail size={10} className="flex-shrink-0" />;
    case "gatekeeper": return <PhoneForwarded size={10} className="flex-shrink-0" />;
    case "meeting_booked": return <CalendarCheck size={10} className="flex-shrink-0" />;
    case "spoke_interested": return <CheckCircle2 size={10} className="flex-shrink-0" />;
    default: return <PhoneCall size={10} className="flex-shrink-0" />;
  }
}

export function ProspectDrawer({ engagement, onClose, onAction, isMutating }: ProspectDrawerProps) {
  const open = !!engagement;
  const engId = engagement?.id ?? 0;

  const { data: activities = [], isLoading: activitiesLoading } = useListActivity(
    { entityType: "engagement", entityId: engId },
    { query: { enabled: open && engId > 0, staleTime: 10_000 } }
  );

  const leadSourceLabel = LEAD_SOURCES.find((s) => s.value === engagement?.leadSource)?.label ?? engagement?.leadSource ?? null;
  const nextOverdue = engagement ? isOverdue(engagement.nextCallDate ?? engagement.nextActionDate) : false;

  const QUICK_OUTCOMES = CALL_OUTCOME_CONFIG.filter((o) => o.quick);
  const DETAILED_OUTCOMES = CALL_OUTCOME_CONFIG.filter((o) => !o.quick);

  const TERMINAL_STAGES: SdrStage[] = ["unresponsive", "bad_data", "changed_job"];

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/20 z-40 transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div className={cn(
        "fixed right-0 top-0 h-full bg-white shadow-xl z-50 flex flex-col transition-transform duration-200 ease-in-out",
        "w-[440px] max-w-[95vw]",
        open ? "translate-x-0" : "translate-x-full"
      )}>
        {engagement ? (
          <>
            {/* ── Header ── */}
            <div className="flex items-start gap-3 p-4 border-b flex-shrink-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border",
                    getStageBadgeClass(engagement.sdrStage)
                  )}>
                    <span className="w-1.5 h-1.5 rounded-full mr-1.5 flex-shrink-0" style={{ backgroundColor: getStageDotColor(engagement.sdrStage) }} />
                    {getStageLabel(engagement.sdrStage)}
                  </span>
                  {engagement.contactMade && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-sky-50 text-sky-700 border-sky-200">
                      <PhoneCall size={9} /> Contact Made
                    </span>
                  )}
                  {engagement.meetingBooked && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">
                      <CalendarCheck size={9} /> Meeting
                    </span>
                  )}
                  {engagement.sqlStatus && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-green-50 text-green-700 border-green-200">
                      <Trophy size={9} /> SQL
                    </span>
                  )}
                </div>
                <h2 className="text-base font-bold text-foreground mt-2 leading-tight">
                  {engagement.organisationName ?? engagement.title}
                </h2>
                {engagement.contactName && (
                  <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
                    <User2 size={12} />
                    {engagement.contactName}
                    {engagement.sdrOwnerName && (
                      <span className="text-muted-foreground/60"> · {engagement.sdrOwnerName}</span>
                    )}
                  </p>
                )}
                {engagement.lastCallOutcome && (
                  <div className="mt-1.5">
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border",
                      getCallOutcomeBadgeClass(engagement.lastCallOutcome)
                    )}>
                      <CallOutcomeIcon outcome={engagement.lastCallOutcome} />
                      {getCallOutcomeLabel(engagement.lastCallOutcome)}
                    </span>
                    {engagement.callAttemptCount > 0 && (
                      <span className="ml-1.5 text-[11px] text-muted-foreground">
                        {engagement.callAttemptCount} call{engagement.callAttemptCount !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
                <X size={16} />
              </button>
            </div>

            {/* ── Call Log Actions ── */}
            <div className="flex items-center gap-1.5 px-4 py-2.5 border-b bg-slate-50/50 flex-shrink-0 flex-wrap">
              {/* Log Call Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    disabled={isMutating}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    <Phone size={12} /> Log Call <ChevronDown size={11} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-52">
                  <DropdownMenuLabel className="text-[11px] text-muted-foreground font-medium">No conversation</DropdownMenuLabel>
                  {QUICK_OUTCOMES.map((o) => (
                    <DropdownMenuItem
                      key={o.value}
                      className="text-xs gap-2"
                      onClick={() => onAction({ type: "logCallQuick", eng: engagement, outcome: o.value })}
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: o.dotColor }} />
                      {o.label}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[11px] text-muted-foreground font-medium">Had a conversation</DropdownMenuLabel>
                  {DETAILED_OUTCOMES.map((o) => (
                    <DropdownMenuItem
                      key={o.value}
                      className="text-xs gap-2"
                      onClick={() => onAction({ type: "logCallDetailed", eng: engagement, outcome: o.value })}
                    >
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: o.dotColor }} />
                      {o.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Quick email/linkedin */}
              <button
                onClick={() => onAction({ type: "logEmail", eng: engagement })}
                disabled={isMutating}
                className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-md bg-white border hover:bg-muted hover:border-primary/30 transition-colors disabled:opacity-50"
              >
                <Mail size={12} /> Email
              </button>
              <button
                onClick={() => onAction({ type: "logLinkedin", eng: engagement })}
                disabled={isMutating}
                className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-md bg-white border hover:bg-muted hover:border-primary/30 transition-colors disabled:opacity-50"
              >
                <Linkedin size={12} /> LinkedIn
              </button>

              <div className="flex-1" />
              <button
                onClick={() => onAction({ type: "createTask", eng: engagement })}
                disabled={isMutating}
                className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-md bg-white border hover:bg-muted transition-colors disabled:opacity-50"
              >
                <Plus size={12} /> Task
              </button>
            </div>

            {/* ── Stage Actions ── */}
            <div className="flex items-center gap-1.5 px-4 py-2 border-b bg-slate-50/30 flex-shrink-0 flex-wrap">
              <button
                onClick={() => onAction({ type: "changeStage", eng: engagement, stage: "interested" })}
                disabled={isMutating || engagement.sdrStage === "interested"}
                className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md bg-white border hover:bg-cyan-50 hover:text-cyan-700 hover:border-cyan-200 transition-colors disabled:opacity-40"
              >
                <Target size={12} /> Interested
              </button>
              <button
                onClick={() => onAction({ type: "meeting", eng: engagement })}
                disabled={isMutating || !!engagement.meetingBooked}
                className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md bg-white border hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors disabled:opacity-40"
              >
                <CalendarCheck size={12} /> Book Meeting
              </button>
              <button
                onClick={() => onAction({ type: "qualify", eng: engagement })}
                disabled={isMutating || engagement.sdrStage === "qualified"}
                className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md bg-white border hover:bg-green-50 hover:text-green-700 hover:border-green-200 transition-colors disabled:opacity-40"
              >
                <Trophy size={12} /> Qualify
              </button>
              <button
                onClick={() => onAction({ type: "disqualify", eng: engagement })}
                disabled={isMutating || engagement.sdrStage === "disqualified"}
                className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md bg-white border hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors disabled:opacity-40"
              >
                <XCircle size={12} /> Disqualify
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button disabled={isMutating} className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md bg-white border hover:bg-muted transition-colors disabled:opacity-40">
                    More <ChevronDown size={11} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem className="text-xs gap-2" onClick={() => onAction({ type: "changeStage", eng: engagement, stage: "follow_up_required" })}>
                    <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" /> Follow-up Required
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-xs gap-2" onClick={() => onAction({ type: "changeStage", eng: engagement, stage: "nurture" })}>
                    <span className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0" /> Nurture
                  </DropdownMenuItem>
                  {TERMINAL_STAGES.map((stage) => (
                    <DropdownMenuItem key={stage} className="text-xs gap-2" onClick={() => onAction({ type: "changeStage", eng: engagement, stage })}>
                      <span className="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0" />
                      {getStageLabel(stage)}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-xs gap-2" onClick={() => onAction({ type: "openChangeStage", eng: engagement })}>
                    <ArrowRight size={12} /> Change stage…
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* ── Call Status Strip ── */}
            {(() => {
              const nextCallRel = relativeCallDate(engagement.nextCallDate);
              const lastCallRel = relativeCallDate(engagement.lastCallDate);
              const callCount = engagement.callAttemptCount ?? 0;
              return (
                <div className={cn(
                  "flex items-stretch gap-0 border-b flex-shrink-0 divide-x divide-border",
                  nextCallRel?.overdue ? "bg-red-50" : nextCallRel?.today ? "bg-emerald-50/60" : "bg-slate-50/60"
                )}>
                  {/* Next call */}
                  <div className="flex-1 px-4 py-3 min-w-0">
                    <p className="text-[10px] uppercase font-semibold tracking-wide text-muted-foreground flex items-center gap-1">
                      <Phone size={9} /> Next Call
                    </p>
                    {nextCallRel ? (
                      <p className={cn(
                        "text-sm font-bold mt-0.5 truncate",
                        nextCallRel.overdue ? "text-red-700" : nextCallRel.today ? "text-emerald-700" : "text-foreground"
                      )}>
                        {nextCallRel.overdue && <AlertTriangle size={12} className="inline mr-0.5" />}
                        {nextCallRel.label}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-0.5">Not scheduled</p>
                    )}
                  </div>
                  {/* Call count */}
                  <div className="px-4 py-3 text-center">
                    <p className="text-[10px] uppercase font-semibold tracking-wide text-muted-foreground">Calls</p>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <span className={cn(
                        "text-lg font-bold tabular-nums leading-none",
                        callCount >= 5 ? "text-red-600" : callCount > 0 ? "text-violet-700" : "text-muted-foreground"
                      )}>
                        {callCount}
                      </span>
                    </div>
                    {/* Call pips — up to 6 */}
                    {callCount > 0 && (
                      <div className="flex items-center justify-center gap-0.5 mt-1">
                        {Array.from({ length: Math.min(callCount, 6) }).map((_, i) => (
                          <span key={i} className={cn(
                            "inline-block w-1.5 h-1.5 rounded-full",
                            i < callCount ? (callCount >= 5 ? "bg-red-400" : "bg-violet-400") : "bg-muted"
                          )} />
                        ))}
                        {callCount > 6 && <span className="text-[9px] text-muted-foreground">+{callCount - 6}</span>}
                      </div>
                    )}
                  </div>
                  {/* Last called */}
                  <div className="px-4 py-3 text-center">
                    <p className="text-[10px] uppercase font-semibold tracking-wide text-muted-foreground">Last called</p>
                    <p className="text-sm font-medium text-foreground mt-0.5 whitespace-nowrap">
                      {lastCallRel ? lastCallRel.label : "—"}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* ── Scrollable body ── */}
            <div className="flex-1 overflow-y-auto">

              {/* Follow-up alert — contextual per outcome type */}
              {engagement.followUpRequired && engagement.lastCallOutcome === "spoke_call_back_later" && (
                <div className="px-4 py-3 border-b bg-amber-50 border-amber-100">
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex-shrink-0 w-7 h-7 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center">
                      <RotateCcw size={13} className="text-amber-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase font-semibold text-amber-700 tracking-wide">Callback Requested</p>
                      <p className="text-sm text-amber-900 leading-snug mt-0.5">
                        {engagement.followUpReason ?? "They asked to be called back — confirm timing before dialling."}
                      </p>
                      {engagement.nextCallDate && (
                        <p className="text-[11px] text-amber-700 mt-1 font-medium">
                          Call back on {new Date(engagement.nextCallDate + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {engagement.followUpRequired && engagement.lastCallOutcome === "spoke_send_info" && (
                <div className="px-4 py-3 border-b bg-cyan-50 border-cyan-100">
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex-shrink-0 w-7 h-7 rounded-full bg-cyan-100 border border-cyan-200 flex items-center justify-center">
                      <Send size={13} className="text-cyan-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase font-semibold text-cyan-700 tracking-wide">Send Info Before Calling Back</p>
                      <p className="text-sm text-cyan-900 leading-snug mt-0.5">
                        {engagement.followUpReason ?? "They asked to receive materials before the next conversation."}
                      </p>
                      {engagement.nextCallDate && (
                        <p className="text-[11px] text-cyan-700 mt-1 font-medium">
                          Follow-up call scheduled for {new Date(engagement.nextCallDate + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {engagement.followUpRequired && engagement.lastCallOutcome !== "spoke_call_back_later" && engagement.lastCallOutcome !== "spoke_send_info" && (
                <div className="px-4 py-3 border-b bg-amber-50 border-amber-100">
                  <div className="flex items-center gap-1.5 mb-1">
                    <AlertTriangle size={12} className="text-amber-600 flex-shrink-0" />
                    <p className="text-[10px] uppercase font-semibold text-amber-700 tracking-wide">Follow-up Required</p>
                  </div>
                  <p className="text-sm text-amber-900 leading-snug">
                    {engagement.followUpReason ?? "Follow-up action needed before next call."}
                  </p>
                </div>
              )}

              {/* Latest note */}
              {engagement.latestNote && (
                <div className="px-4 py-3 border-b bg-blue-50/30">
                  <p className="text-[10px] uppercase font-semibold text-blue-700 tracking-wide mb-1 flex items-center gap-1">
                    <Clock size={10} /> Last call note
                  </p>
                  <p className="text-sm text-foreground leading-relaxed">{engagement.latestNote}</p>
                </div>
              )}

              {/* Info grid — call data first */}
              <div className="px-4 py-4 grid grid-cols-2 gap-x-6 gap-y-4 border-b">
                <InfoRow
                  label="Last call outcome"
                  value={engagement.lastCallOutcome ? (
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border",
                      getCallOutcomeBadgeClass(engagement.lastCallOutcome)
                    )}>
                      <CallOutcomeIcon outcome={engagement.lastCallOutcome} />
                      {getCallOutcomeLabel(engagement.lastCallOutcome)}
                    </span>
                  ) : "—"}
                />
                <InfoRow
                  label="Total touches"
                  value={
                    <span className="flex items-center gap-1">
                      <Hash size={12} className="text-muted-foreground" />
                      {engagement.touchCount ?? 0}
                    </span>
                  }
                />
                {engagement.nextActionDate && (
                  <InfoRow
                    label="Next action"
                    value={formatDate(engagement.nextActionDate)}
                    highlight={isOverdue(engagement.nextActionDate)}
                  />
                )}
                {engagement.meetingDate && (
                  <InfoRow label="Meeting date" value={formatDate(engagement.meetingDate)} />
                )}
                <InfoRow label="Lead source" value={leadSourceLabel ?? "—"} />
                {engagement.handoverStatus && (
                  <InfoRow label="Handover" value={<span className="capitalize">{engagement.handoverStatus.replace("_", " ")}</span>} />
                )}
              </div>

              {/* Notes */}
              {engagement.notes && (
                <div className="px-4 py-4 border-b">
                  <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide mb-2">Notes</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{engagement.notes}</p>
                </div>
              )}

              {/* Disqualification reason */}
              {engagement.disqualificationReason && (
                <div className="px-4 py-3 border-b bg-red-50/50">
                  <p className="text-[10px] uppercase font-semibold text-red-600 tracking-wide mb-1">Disqualification reason</p>
                  <p className="text-sm text-red-800">{engagement.disqualificationReason}</p>
                </div>
              )}

              {/* Activity timeline */}
              <div className="px-4 py-4">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide mb-3">Call & Activity Log</p>
                {activitiesLoading ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <RefreshCw size={12} className="animate-spin" /> Loading…
                  </div>
                ) : activities.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No activity logged yet</p>
                ) : (
                  <ol className="space-y-3">
                    {activities.map((entry) => (
                      <li key={entry.id} className="flex items-start gap-2.5">
                        <div className={cn(
                          "mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center",
                          entry.action === "call_logged" ? "bg-violet-100" : "bg-muted"
                        )}>
                          <ActivityIcon action={entry.action} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-foreground leading-snug">
                            {formatActivity(entry.action, entry.context as Record<string, any>)}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {entry.actorName ? `${entry.actorName} · ` : ""}
                            {timeAgo(entry.createdAt)}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
