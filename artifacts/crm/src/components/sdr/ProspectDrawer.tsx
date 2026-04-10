import {
  X, Mail, PhoneCall, Linkedin, CalendarCheck, Trophy, XCircle, Plus,
  ArrowRight, Sparkles, CheckSquare, Star, Clock, Building2, User2,
  Hash, Target, ChevronDown, RefreshCw, AlertTriangle, Send,
} from "lucide-react";
import { useListActivity } from "@workspace/api-client-react";
import type { Engagement, OutreachChannel, SdrStage } from "@workspace/api-client-react";
import { Button } from "@/components/ui/core-ui";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { formatDate, cn } from "@/lib/utils";
import { getStageBadgeClass, getStageLabel, getStageDotColor, LEAD_SOURCES, isOverdue } from "./constants";

type DrawerAction =
  | { type: "logOutreach"; eng: Engagement; channel: OutreachChannel }
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

function ActivityIcon({ action }: { action: string }) {
  if (action.includes("stage_changed")) return <ArrowRight size={12} className="text-blue-500 flex-shrink-0" />;
  if (action.includes("task_created")) return <CheckSquare size={12} className="text-emerald-500 flex-shrink-0" />;
  if (action.includes("engagement_created")) return <Star size={12} className="text-amber-500 flex-shrink-0" />;
  if (action.includes("outreach")) return <Send size={12} className="text-indigo-500 flex-shrink-0" />;
  return <Sparkles size={12} className="text-muted-foreground flex-shrink-0" />;
}

function formatActivity(action: string, context: Record<string, any> | null): string {
  if (!context) return action.replace(/_/g, " ");
  switch (action) {
    case "engagement_created": return "Prospect added to SDR queue";
    case "stage_changed":
      if (context.stageFrom && context.stageTo) {
        return `Stage: ${getStageLabel(context.stageFrom)} → ${getStageLabel(context.stageTo)}`;
      }
      return "Stage updated";
    case "task_created":
      return `Task created: ${context.taskTitle ?? "Follow-up"}${context.via ? ` (auto)` : ""}`;
    default:
      return action.replace(/_/g, " ");
  }
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
      <p className={cn("text-sm font-medium mt-0.5", highlight ? "text-amber-600" : "text-foreground")}>{value}</p>
    </div>
  );
}

export function ProspectDrawer({ engagement, onClose, onAction, isMutating }: ProspectDrawerProps) {
  const open = !!engagement;
  const engId = engagement?.id ?? 0;

  const { data: activities = [], isLoading: activitiesLoading } = useListActivity(
    { entityType: "engagement", entityId: engId },
    { query: { enabled: open && engId > 0, staleTime: 30_000 } }
  );

  const leadSourceLabel = LEAD_SOURCES.find((s) => s.value === engagement?.leadSource)?.label ?? engagement?.leadSource ?? null;
  const nextActionOverdue = engagement ? isOverdue(engagement.nextActionDate) : false;

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
        "w-[420px] max-w-[95vw]",
        open ? "translate-x-0" : "translate-x-full"
      )}>
        {engagement ? (
          <>
            {/* ── Header ── */}
            <div className="flex items-start gap-3 p-4 border-b flex-shrink-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border",
                    getStageBadgeClass(engagement.sdrStage)
                  )}>
                    <span
                      className="w-1.5 h-1.5 rounded-full mr-1.5 flex-shrink-0"
                      style={{ backgroundColor: getStageDotColor(engagement.sdrStage) }}
                    />
                    {getStageLabel(engagement.sdrStage)}
                  </span>
                  {engagement.meetingBooked && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-orange-50 text-orange-700 border-orange-200">
                      <CalendarCheck size={10} /> Meeting
                    </span>
                  )}
                  {engagement.handoverStatus === "complete" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">
                      <Trophy size={10} /> Handed over
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
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            {/* ── Quick Log Actions ── */}
            <div className="flex items-center gap-1.5 px-4 py-2.5 border-b bg-slate-50/50 flex-shrink-0 flex-wrap">
              <span className="text-[11px] font-semibold text-muted-foreground mr-1">Log:</span>
              {([
                { channel: "email" as OutreachChannel, icon: <Mail size={12} />, label: "Email" },
                { channel: "phone" as OutreachChannel, icon: <PhoneCall size={12} />, label: "Call" },
                { channel: "linkedin" as OutreachChannel, icon: <Linkedin size={12} />, label: "LinkedIn" },
              ]).map(({ channel, icon, label }) => (
                <button
                  key={channel}
                  onClick={() => onAction({ type: "logOutreach", eng: engagement, channel })}
                  disabled={isMutating}
                  className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md bg-white border hover:bg-muted hover:border-primary/30 transition-colors disabled:opacity-50"
                >
                  {icon} {label}
                </button>
              ))}
              <div className="flex-1" />
              <button
                onClick={() => onAction({ type: "createTask", eng: engagement })}
                disabled={isMutating}
                className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md bg-white border hover:bg-muted transition-colors disabled:opacity-50"
              >
                <Plus size={12} /> Task
              </button>
            </div>

            {/* ── Stage Actions ── */}
            <div className="flex items-center gap-1.5 px-4 py-2.5 border-b bg-slate-50/50 flex-shrink-0 flex-wrap">
              <button
                onClick={() => onAction({ type: "meeting", eng: engagement })}
                disabled={isMutating || !!engagement.meetingBooked}
                className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md bg-white border hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 transition-colors disabled:opacity-40"
              >
                <CalendarCheck size={12} /> Book Meeting
              </button>
              <button
                onClick={() => onAction({ type: "changeStage", eng: engagement, stage: "interested" })}
                disabled={isMutating || engagement.sdrStage === "interested"}
                className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md bg-white border hover:bg-cyan-50 hover:text-cyan-700 hover:border-cyan-200 transition-colors disabled:opacity-40"
              >
                <Target size={12} /> Interested
              </button>
              <button
                onClick={() => onAction({ type: "qualify", eng: engagement })}
                disabled={isMutating || engagement.sdrStage === "qualified"}
                className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md bg-white border hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors disabled:opacity-40"
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
                  <button
                    disabled={isMutating}
                    className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md bg-white border hover:bg-muted transition-colors disabled:opacity-40"
                  >
                    More <ChevronDown size={11} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem
                    className="text-xs gap-2"
                    onClick={() => onAction({ type: "changeStage", eng: engagement, stage: "nurture" })}
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" /> Nurture
                  </DropdownMenuItem>
                  {TERMINAL_STAGES.map((stage) => (
                    <DropdownMenuItem
                      key={stage}
                      className="text-xs gap-2"
                      onClick={() => onAction({ type: "changeStage", eng: engagement, stage })}
                    >
                      <span className="w-2 h-2 rounded-full bg-gray-400 flex-shrink-0" />
                      {getStageLabel(stage)}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuItem
                    className="text-xs gap-2"
                    onClick={() => onAction({ type: "openChangeStage", eng: engagement })}
                  >
                    <ArrowRight size={12} /> Change stage…
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* ── Scrollable body ── */}
            <div className="flex-1 overflow-y-auto">
              {/* Info grid */}
              <div className="px-4 py-4 grid grid-cols-2 gap-x-6 gap-y-4 border-b">
                <InfoRow
                  label="Lead source"
                  value={leadSourceLabel ?? "—"}
                />
                <InfoRow
                  label="Touch count"
                  value={
                    <span className="flex items-center gap-1">
                      <Hash size={12} className="text-muted-foreground" />
                      {engagement.touchCount ?? 0} touches
                    </span>
                  }
                />
                <InfoRow
                  label="Last outreach"
                  value={engagement.lastOutreachDate ? formatDate(engagement.lastOutreachDate) : "—"}
                />
                <InfoRow
                  label="Outreach channel"
                  value={engagement.outreachChannel?.replace("_", " ") ?? "—"}
                />
                {engagement.nextActionDate && (
                  <InfoRow
                    label="Next action"
                    value={formatDate(engagement.nextActionDate)}
                    highlight={nextActionOverdue}
                  />
                )}
                {engagement.meetingDate && (
                  <InfoRow
                    label="Meeting date"
                    value={formatDate(engagement.meetingDate)}
                  />
                )}
                {engagement.handoverStatus && (
                  <InfoRow
                    label="Handover"
                    value={
                      <span className="capitalize">{engagement.handoverStatus.replace("_", " ")}</span>
                    }
                  />
                )}
                {engagement.handoverOwnerName && (
                  <InfoRow
                    label="Handover owner"
                    value={engagement.handoverOwnerName}
                  />
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
                <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wide mb-3">Activity</p>
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
                        <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-muted flex items-center justify-center">
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
