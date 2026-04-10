import { useState, useEffect, useMemo } from "react";
import {
  SlidersHorizontal, Search, RefreshCw, ArrowUpDown, ChevronDown,
  CalendarCheck, AlertTriangle, Trophy, Phone, PhoneCall, PhoneOff,
  Voicemail, PhoneForwarded, CheckCircle2, Plus,
} from "lucide-react";
import {
  useListEngagements, useUpdateEngagement, useCreateTask,
  useListUsers, useHandoverEngagement, useLogCall,
} from "@workspace/api-client-react";
import type { Engagement, SdrStage, CallOutcome } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Button, Input, Textarea, Label, Select, SelectOption,
} from "@/components/ui/core-ui";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Modal } from "@/components/ui/Modal";
import { formatDate, cn } from "@/lib/utils";
import {
  FunnelBar,
  FilterPanel, type FilterState, DEFAULT_FILTERS, countActiveFilters,
  ProspectDrawer, type DrawerAction,
} from "@/components/sdr";
import {
  getStageBadgeClass, getStageLabel, getStageDotColor,
  getCallOutcomeLabel, getCallOutcomeBadgeClass, getCallOutcomeDotColor,
  isOverdue, ALL_STAGES_NO_LEGACY, SORT_OPTIONS, today,
  CALL_OUTCOME_CONFIG,
} from "@/components/sdr/constants";

// ─── Modal state types ────────────────────────────────────────────────────────

type ActiveModal =
  | { type: "meeting";     eng: Engagement }
  | { type: "disqualify";  eng: Engagement }
  | { type: "task";        eng: Engagement }
  | { type: "stage";       eng: Engagement }
  | { type: "handover";    eng: Engagement }
  | { type: "logCall";     eng: Engagement; presetOutcome?: CallOutcome }
  | null;

// ─── Log Call Modal ───────────────────────────────────────────────────────────

function LogCallModal({ open, onClose, engagement, presetOutcome, onConfirm, loading }: {
  open: boolean; onClose: () => void; engagement: Engagement | null;
  presetOutcome?: CallOutcome;
  onConfirm: (outcome: CallOutcome, nextCallDate: string, note: string, followUpReason: string) => void;
  loading: boolean;
}) {
  const [outcome, setOutcome] = useState<CallOutcome>("no_answer");
  const [nextCallDate, setNextCallDate] = useState("");
  const [note, setNote] = useState("");
  const [followUpReason, setFollowUpReason] = useState("");

  useEffect(() => {
    if (open) {
      setOutcome(presetOutcome ?? "no_answer");
      setNextCallDate(""); setNote(""); setFollowUpReason("");
    }
  }, [open, presetOutcome]);

  const needsFollowUp = outcome === "spoke_call_back_later" || outcome === "spoke_send_info" || outcome === "meeting_booked";
  const outcomeConfig = CALL_OUTCOME_CONFIG.find((o) => o.value === outcome);

  return (
    <Modal open={open} onClose={onClose} title="Log Call" size="sm">
      <div className="p-6 space-y-4">
        {engagement && (
          <div className="rounded-lg bg-muted/50 border px-3 py-2.5 space-y-0.5 text-sm">
            <div className="font-semibold">{engagement.organisationName ?? engagement.title}</div>
            {engagement.contactName && <div className="text-muted-foreground text-xs">{engagement.contactName}</div>}
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Call outcome <span className="text-destructive">*</span></Label>
          <Select value={outcome} onValueChange={(v) => setOutcome(v as CallOutcome)}>
            <SelectOption value="" disabled>Select outcome…</SelectOption>
            <SelectOption value="no_answer">No Answer</SelectOption>
            <SelectOption value="voicemail_left">Voicemail Left</SelectOption>
            <SelectOption value="gatekeeper">Gatekeeper</SelectOption>
            <SelectOption value="wrong_person">Wrong Person</SelectOption>
            <SelectOption value="spoke_call_back_later">Spoke – Call Back Later</SelectOption>
            <SelectOption value="spoke_send_info">Spoke – Send Info</SelectOption>
            <SelectOption value="spoke_not_interested">Spoke – Not Interested</SelectOption>
            <SelectOption value="spoke_interested">Spoke – Interested</SelectOption>
            <SelectOption value="meeting_booked">Meeting Booked</SelectOption>
          </Select>
          {outcomeConfig && (
            <p className="text-xs text-muted-foreground">
              {outcome === "no_answer" && "Will move stage to Attempted Call"}
              {outcome === "voicemail_left" && "Will move stage to Attempted Call"}
              {outcome === "gatekeeper" && "Will move stage to Attempted Call"}
              {outcome === "wrong_person" && "Will move stage to No Contact"}
              {outcome === "spoke_call_back_later" && "Will move stage to Follow-up Required"}
              {outcome === "spoke_send_info" && "Will move stage to Follow-up Required"}
              {outcome === "spoke_not_interested" && "Will move stage to Contact Made"}
              {outcome === "spoke_interested" && "Will move stage to Interested"}
              {outcome === "meeting_booked" && "Will move stage to Meeting Booked"}
            </p>
          )}
        </div>

        {needsFollowUp && (
          <div className="space-y-1.5">
            <Label>{outcome === "meeting_booked" ? "Meeting date" : "Follow-up / call-back date"} <span className="text-destructive">*</span></Label>
            <Input type="date" value={nextCallDate} onChange={(e) => setNextCallDate(e.target.value)} />
          </div>
        )}

        {(outcome === "spoke_call_back_later" || outcome === "spoke_send_info") && (
          <div className="space-y-1.5">
            <Label>Reason / context <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input value={followUpReason} onChange={(e) => setFollowUpReason(e.target.value)} placeholder='e.g. "Interested but busy — call in 4 days"' />
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Call note <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Brief notes from the call…" />
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            onClick={() => onConfirm(outcome, nextCallDate, note, followUpReason)}
            disabled={loading || !outcome || (needsFollowUp && !nextCallDate)}
            className="gap-1.5"
          >
            {loading ? <RefreshCw size={13} className="animate-spin" /> : <Phone size={13} />}
            Log Call
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Meeting Modal ────────────────────────────────────────────────────────────

function MeetingModal({ open, onClose, onConfirm, loading }: {
  open: boolean; onClose: () => void; onConfirm: (date: string) => void; loading: boolean;
}) {
  const [date, setDate] = useState(today);
  return (
    <Modal open={open} onClose={onClose} title="Mark Meeting Booked" size="sm">
      <div className="p-6 space-y-4">
        <div className="space-y-1.5">
          <Label>Meeting date</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => onConfirm(date)} disabled={loading || !date}>
            <CalendarCheck size={14} className="mr-1.5" /> Confirm
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Disqualify Modal ─────────────────────────────────────────────────────────

function DisqualifyModal({ open, onClose, onConfirm, loading }: {
  open: boolean; onClose: () => void; onConfirm: (reason: string) => void; loading: boolean;
}) {
  const [reason, setReason] = useState("");
  useEffect(() => { if (open) setReason(""); }, [open]);
  return (
    <Modal open={open} onClose={onClose} title="Disqualify Lead" size="sm">
      <div className="p-6 space-y-4">
        <div className="space-y-1.5">
          <Label>Reason <span className="text-destructive">*</span></Label>
          <Textarea rows={3} placeholder="e.g. No budget, wrong sector, not decision-maker…" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" variant="destructive" onClick={() => onConfirm(reason)} disabled={loading || !reason.trim()}>Disqualify</Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Create Task Modal ────────────────────────────────────────────────────────

function CreateTaskModal({ open, onClose, engagement, onConfirm, loading }: {
  open: boolean; onClose: () => void; engagement: Engagement | null;
  onConfirm: (title: string, dueDate: string, description: string) => void; loading: boolean;
}) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  useEffect(() => {
    if (open) { setTitle(engagement ? `Follow up — ${engagement.organisationName ?? engagement.title}` : ""); setDueDate(""); setDescription(""); }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Modal open={open} onClose={onClose} title="Create Follow-up Task" size="sm">
      <div className="p-6 space-y-4">
        <div className="space-y-1.5"><Label>Task title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Due date</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
        <div className="space-y-1.5">
          <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief context…" />
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => onConfirm(title, dueDate, description)} disabled={loading || !title || !dueDate}>
            <Plus size={14} className="mr-1.5" /> Create Task
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Change Stage Modal ───────────────────────────────────────────────────────

function ChangeStageModal({ open, onClose, current, onConfirm, loading }: {
  open: boolean; onClose: () => void; current: SdrStage | null | undefined;
  onConfirm: (stage: SdrStage) => void; loading: boolean;
}) {
  const [stage, setStage] = useState<string>(current ?? "new");
  useEffect(() => { if (open) setStage(current ?? "new"); }, [open, current]);
  return (
    <Modal open={open} onClose={onClose} title="Change SDR Stage" size="sm">
      <div className="p-6 space-y-4">
        <div className="space-y-1.5">
          <Label>New stage</Label>
          <Select value={stage} onValueChange={setStage}>
            {ALL_STAGES_NO_LEGACY.map((s) => (<SelectOption key={s.value} value={s.value}>{s.label}</SelectOption>))}
          </Select>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => onConfirm(stage as SdrStage)} disabled={loading}>Update Stage</Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Handover Modal ───────────────────────────────────────────────────────────

function HandoverModal({ open, onClose, engagement, users, onConfirm, loading }: {
  open: boolean; onClose: () => void; engagement: Engagement | null;
  users: { id: number; fullName: string }[];
  onConfirm: (ownerId: number, notes: string, taskTitle: string, taskDueDate: string, taskDesc: string) => void;
  loading: boolean;
}) {
  const [ownerId, setOwnerId] = useState("");
  const [notes, setNotes] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  useEffect(() => {
    if (open && engagement) { setOwnerId(""); setNotes(""); setTaskTitle(`Follow up — ${engagement.organisationName ?? engagement.title}`); setTaskDueDate(""); setTaskDesc(""); }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Modal open={open} onClose={onClose} title="Qualify & Hand Over" size="md">
      <div className="p-6 space-y-5">
        {engagement && (
          <div className="rounded-lg bg-muted/50 border px-4 py-3 space-y-1 text-sm">
            <div className="font-medium">{engagement.organisationName ?? engagement.title}</div>
            {engagement.contactName && <div className="text-muted-foreground text-xs">{engagement.contactName}</div>}
          </div>
        )}
        <div className="space-y-1.5">
          <Label>Assign to <span className="text-destructive">*</span></Label>
          <Select value={ownerId} onValueChange={setOwnerId}>
            <SelectOption value="">Select a team member…</SelectOption>
            {users.map((u) => (<SelectOption key={u.id} value={String(u.id)}>{u.fullName}</SelectOption>))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Handover notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Textarea rows={3} placeholder="Key context, next steps…" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="space-y-3 border-t pt-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Follow-up task (optional)</p>
          <div className="space-y-1.5"><Label>Task title</Label><Input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Due date</Label><Input type="date" value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Notes</Label><Input value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} /></div>
          </div>
        </div>
        <div className="flex gap-2 justify-end pt-1">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => onConfirm(Number(ownerId), notes, taskTitle, taskDueDate, taskDesc)} disabled={!ownerId || loading} className="gap-1.5">
            {loading ? <RefreshCw size={13} className="animate-spin" /> : <Trophy size={13} />}
            Qualify &amp; Hand Over
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Prospect Row ─────────────────────────────────────────────────────────────

function OwnerInitials({ name }: { name: string | null | undefined }) {
  if (!name) return <span className="text-muted-foreground text-xs">—</span>;
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex-shrink-0" title={name}>
      {initials}
    </span>
  );
}

function CallOutcomeIcon({ outcome }: { outcome: string | null | undefined }) {
  switch (outcome) {
    case "no_answer": return <PhoneOff size={9} />;
    case "voicemail_left": return <Voicemail size={9} />;
    case "gatekeeper": return <PhoneForwarded size={9} />;
    case "meeting_booked": return <CalendarCheck size={9} />;
    case "spoke_interested": return <CheckCircle2 size={9} />;
    default: return <PhoneCall size={9} />;
  }
}

function ProspectRow({ eng, selected, onClick }: {
  eng: Engagement; selected: boolean; onClick: () => void;
}) {
  const nextDate = eng.nextCallDate ?? eng.nextActionDate;
  const nextOverdue = isOverdue(nextDate);

  return (
    <div
      onClick={onClick}
      className={cn(
        "grid items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors border-b border-border/50 hover:bg-slate-50/80",
        "grid-cols-[minmax(0,2fr)_100px_110px_28px_80px_40px]",
        selected && "bg-primary/5 border-l-2 border-l-primary"
      )}
    >
      {/* Contact + Org */}
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground truncate leading-tight">
          {eng.organisationName ?? eng.title}
        </p>
        {eng.contactName ? (
          <p className="text-xs text-muted-foreground truncate mt-0.5">{eng.contactName}</p>
        ) : (
          <p className="text-xs text-muted-foreground/40 truncate mt-0.5 italic">No contact</p>
        )}
      </div>

      {/* Stage */}
      <div>
        <span className={cn(
          "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-medium border",
          getStageBadgeClass(eng.sdrStage)
        )}>
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: getStageDotColor(eng.sdrStage) }} />
          <span className="truncate">{getStageLabel(eng.sdrStage)}</span>
        </span>
      </div>

      {/* Last Call Outcome */}
      <div>
        {eng.lastCallOutcome ? (
          <span className={cn(
            "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] font-medium border",
            getCallOutcomeBadgeClass(eng.lastCallOutcome)
          )}>
            <CallOutcomeIcon outcome={eng.lastCallOutcome} />
            <span className="truncate">{getCallOutcomeLabel(eng.lastCallOutcome)}</span>
          </span>
        ) : (
          <span className="text-muted-foreground/30 text-xs">—</span>
        )}
      </div>

      {/* Owner */}
      <div className="flex justify-center">
        <OwnerInitials name={eng.sdrOwnerName ?? eng.ownerName} />
      </div>

      {/* Next Action / Call */}
      <div className="text-xs tabular-nums">
        {nextDate ? (
          <span className={cn("flex items-center gap-0.5", nextOverdue ? "text-red-600 font-semibold" : "text-muted-foreground")}>
            {nextOverdue && <AlertTriangle size={9} />}
            {formatDate(nextDate)}
          </span>
        ) : (
          <span className="text-muted-foreground/30">—</span>
        )}
      </div>

      {/* Call count */}
      <div className="text-xs text-center tabular-nums">
        {eng.callAttemptCount > 0 ? (
          <span className="inline-flex items-center justify-center gap-0.5 w-auto px-1.5 h-5 rounded-full bg-violet-100 text-violet-700 text-[11px] font-medium">
            <Phone size={9} /> {eng.callAttemptCount}
          </span>
        ) : (
          <span className="text-muted-foreground/30">—</span>
        )}
      </div>
    </div>
  );
}

// ─── Sorting ──────────────────────────────────────────────────────────────────

function sortEngagements(engs: Engagement[], sort: string): Engagement[] {
  return [...engs].sort((a, b) => {
    switch (sort) {
      case "nextCallDate": {
        const dateA = a.nextCallDate ?? a.nextActionDate;
        const dateB = b.nextCallDate ?? b.nextActionDate;
        if (!dateA && !dateB) return 0;
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateA.localeCompare(dateB);
      }
      case "nextAction": {
        if (!a.nextActionDate && !b.nextActionDate) return 0;
        if (!a.nextActionDate) return 1;
        if (!b.nextActionDate) return -1;
        return a.nextActionDate.localeCompare(b.nextActionDate);
      }
      case "callCount":
        return (b.callAttemptCount ?? 0) - (a.callAttemptCount ?? 0);
      case "touches":
        return (b.touchCount ?? 0) - (a.touchCount ?? 0);
      case "meetingDate": {
        if (!a.meetingDate && !b.meetingDate) return 0;
        if (!a.meetingDate) return 1;
        if (!b.meetingDate) return -1;
        return a.meetingDate.localeCompare(b.meetingDate);
      }
      case "created":
        return b.createdAt.localeCompare(a.createdAt);
      default: // lastActivity
        return b.updatedAt.localeCompare(a.updatedAt);
    }
  });
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SdrQueue() {
  const queryClient = useQueryClient();

  const [funnelFilter, setFunnelFilter] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("lastActivity");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [selectedEng, setSelectedEng] = useState<Engagement | null>(null);
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  const { data: rawEngagements = [], isLoading, refetch } = useListEngagements(
    { engagementType: "sdr", ...(search ? { search } : {}) },
    { query: { staleTime: 0 } }
  );
  const { data: users = [] } = useListUsers();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/engagements"] });

  const updateMutation = useUpdateEngagement({ mutation: { onSuccess: invalidate } });
  const createTaskMutation = useCreateTask({ mutation: { onSuccess: () => setActiveModal(null) } });
  const handoverMutation = useHandoverEngagement({ mutation: { onSuccess: () => { invalidate(); setActiveModal(null); } } });
  const logCallMutation = useLogCall({ mutation: { onSuccess: () => { invalidate(); setActiveModal(null); } } });

  const filtered = useMemo(() => {
    let list = rawEngagements;
    if (funnelFilter) list = list.filter((e) => e.sdrStage === funnelFilter);
    if (filters.owner) list = list.filter((e) => String(e.sdrOwnerUserId) === filters.owner);
    if (filters.leadSource) list = list.filter((e) => e.leadSource === filters.leadSource);
    if (filters.handoverStatus) list = list.filter((e) => e.handoverStatus === filters.handoverStatus);
    if (filters.callOutcome) list = list.filter((e) => e.lastCallOutcome === filters.callOutcome);
    if (filters.overdueOnly) list = list.filter((e) => isOverdue(e.nextCallDate ?? e.nextActionDate));
    if (filters.followUpRequired) list = list.filter((e) => e.followUpRequired || e.sdrStage === "follow_up_required");
    if (filters.contactMadeOnly) list = list.filter((e) => e.contactMade);
    if (filters.meetingBooked) list = list.filter((e) => e.meetingBooked);
    if (filters.hasHandover) list = list.filter((e) => e.handoverStatus === "pending" || e.handoverStatus === "in_progress");
    return list;
  }, [rawEngagements, funnelFilter, filters]);

  const sorted = useMemo(() => sortEngagements(filtered, sort), [filtered, sort]);

  const overdueCount = rawEngagements.filter((e) => isOverdue(e.nextCallDate ?? e.nextActionDate)).length;
  const followUpCount = rawEngagements.filter((e) => e.sdrStage === "follow_up_required").length;
  const activeFilterCount = countActiveFilters(filters);
  const isMutating = updateMutation.isPending || createTaskMutation.isPending || handoverMutation.isPending || logCallMutation.isPending;

  useEffect(() => {
    if (selectedEng) {
      const updated = rawEngagements.find((e) => e.id === selectedEng.id);
      if (updated) setSelectedEng(updated);
    }
  }, [rawEngagements]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Action handlers ──────────────────────────────────────────────────────────

  function handleDrawerAction(action: DrawerAction) {
    switch (action.type) {
      case "logCallQuick":
        logCallMutation.mutate({ id: action.eng.id, data: { outcome: action.outcome } });
        break;
      case "logCallDetailed":
        setActiveModal({ type: "logCall", eng: action.eng, presetOutcome: action.outcome });
        break;
      case "logEmail":
        updateMutation.mutate({ id: action.eng.id, data: { lastOutreachDate: today, touchCount: (action.eng.touchCount ?? 0) + 1, outreachChannel: "email" } as any });
        break;
      case "logLinkedin":
        updateMutation.mutate({ id: action.eng.id, data: { lastOutreachDate: today, touchCount: (action.eng.touchCount ?? 0) + 1, outreachChannel: "linkedin" } as any });
        break;
      case "meeting":   setActiveModal({ type: "meeting",   eng: action.eng }); break;
      case "qualify":   setActiveModal({ type: "handover",  eng: action.eng }); break;
      case "disqualify":setActiveModal({ type: "disqualify",eng: action.eng }); break;
      case "createTask":setActiveModal({ type: "task",      eng: action.eng }); break;
      case "openChangeStage": setActiveModal({ type: "stage", eng: action.eng }); break;
      case "changeStage":
        updateMutation.mutate({ id: action.eng.id, data: { sdrStage: action.stage } as any });
        break;
    }
  }

  function handleLogCall(outcome: CallOutcome, nextCallDate: string, note: string, followUpReason: string) {
    if (!activeModal || activeModal.type !== "logCall") return;
    logCallMutation.mutate({
      id: activeModal.eng.id,
      data: {
        outcome,
        ...(nextCallDate ? { nextCallDate } : {}),
        ...(note ? { latestNote: note } : {}),
        ...(followUpReason ? { followUpReason } : {}),
      },
    });
  }

  function handleMarkMeetingBooked(date: string) {
    if (!activeModal || activeModal.type !== "meeting") return;
    updateMutation.mutate({ id: activeModal.eng.id, data: { meetingBooked: true, meetingDate: date, sdrStage: "meeting_booked" } as any });
    setActiveModal(null);
  }

  function handleDisqualify(reason: string) {
    if (!activeModal || activeModal.type !== "disqualify") return;
    updateMutation.mutate({ id: activeModal.eng.id, data: { sdrStage: "disqualified", disqualificationReason: reason } as any });
    setActiveModal(null);
  }

  function handleCreateTask(title: string, dueDate: string, description: string) {
    if (!activeModal || activeModal.type !== "task") return;
    const eng = activeModal.eng;
    createTaskMutation.mutate({ data: { title, dueDate, description: description || undefined, organisationId: eng.organisationId ?? undefined, engagementId: eng.id, priority: "medium", status: "open" } as any });
  }

  function handleChangeStage(stage: SdrStage) {
    if (!activeModal || activeModal.type !== "stage") return;
    updateMutation.mutate({ id: activeModal.eng.id, data: { sdrStage: stage } as any });
    setActiveModal(null);
  }

  function handleHandover(ownerId: number, notes: string, taskTitle: string, taskDueDate: string, taskDesc: string) {
    if (!activeModal || activeModal.type !== "handover") return;
    handoverMutation.mutate({ id: activeModal.eng.id, data: { handoverOwnerUserId: ownerId, handoverNotes: notes || undefined, taskTitle: taskTitle || undefined, taskDueDate: taskDueDate || undefined, taskDescription: taskDesc || undefined } });
  }

  const sortLabel = SORT_OPTIONS.find((s) => s.value === sort)?.label ?? "Sort";

  return (
    <div className="h-full flex flex-col min-h-0 animate-in fade-in duration-300">

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-white flex-shrink-0">
        <div>
          <h1 className="text-xl font-display font-bold text-foreground">SDR Queue</h1>
          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3">
            <span>{isLoading ? "Loading…" : `${rawEngagements.length} prospects`}</span>
            {overdueCount > 0 && (
              <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                <AlertTriangle size={10} /> {overdueCount} overdue
              </span>
            )}
            {followUpCount > 0 && (
              <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                <Phone size={10} /> {followUpCount} follow-up req'd
              </span>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 h-8" onClick={() => refetch()}>
          <RefreshCw size={13} className={cn(isLoading && "animate-spin")} /> Refresh
        </Button>
      </div>

      {/* ── Funnel Bar ── */}
      <FunnelBar engagements={rawEngagements} activeStage={funnelFilter} onStageClick={setFunnelFilter} />

      {/* ── Action Bar ── */}
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-white flex-shrink-0">
        <Button
          variant={filtersOpen ? "default" : "outline"}
          size="sm"
          className={cn("h-8 gap-1.5", activeFilterCount > 0 && !filtersOpen && "border-primary text-primary")}
          onClick={() => setFiltersOpen((p) => !p)}
        >
          <SlidersHorizontal size={13} />
          Filters
          {activeFilterCount > 0 && (
            <span className={cn("inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold", filtersOpen ? "bg-white text-primary" : "bg-primary text-white")}>
              {activeFilterCount}
            </span>
          )}
        </Button>

        <div className="relative flex-1 max-w-80">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input placeholder="Search contacts, organisations…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
        </div>

        <div className="flex-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
              <ArrowUpDown size={12} /> {sortLabel} <ChevronDown size={11} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {SORT_OPTIONS.map((s) => (
              <DropdownMenuItem key={s.value} className={cn("text-xs", sort === s.value && "font-semibold text-primary")} onClick={() => setSort(s.value)}>
                {s.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {!isLoading && (
          <span className="text-xs text-muted-foreground tabular-nums">
            {sorted.length}{sorted.length !== rawEngagements.length ? ` of ${rawEngagements.length}` : ""}
          </span>
        )}
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        <FilterPanel open={filtersOpen} filters={filters} onChange={setFilters} users={users} />

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Table header */}
          <div className={cn(
            "grid items-center gap-3 px-4 py-2 bg-muted/40 border-b border-border/50 flex-shrink-0",
            "grid-cols-[minmax(0,2fr)_100px_110px_28px_80px_40px]"
          )}>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Contact / Org</span>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Stage</span>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Last Call</span>
            <span />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Next</span>
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide text-center">
              <Phone size={10} />
            </span>
          </div>

          {/* Table body */}
          <div className="flex-1 overflow-y-auto bg-white">
            {isLoading ? (
              <div className="flex items-center justify-center h-32 text-sm text-muted-foreground gap-2">
                <RefreshCw size={14} className="animate-spin" /> Loading prospects…
              </div>
            ) : sorted.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-sm text-muted-foreground gap-2">
                <p className="font-medium">No prospects match your filters</p>
                <button onClick={() => { setFunnelFilter(""); setFilters(DEFAULT_FILTERS); setSearch(""); }} className="text-xs text-primary hover:underline">
                  Clear all filters
                </button>
              </div>
            ) : (
              sorted.map((eng) => (
                <ProspectRow key={eng.id} eng={eng} selected={selectedEng?.id === eng.id} onClick={() => setSelectedEng(selectedEng?.id === eng.id ? null : eng)} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Prospect Drawer ── */}
      <ProspectDrawer engagement={selectedEng} onClose={() => setSelectedEng(null)} onAction={handleDrawerAction} isMutating={isMutating} />

      {/* ── Modals ── */}
      <LogCallModal
        open={activeModal?.type === "logCall"}
        onClose={() => setActiveModal(null)}
        engagement={activeModal?.type === "logCall" ? activeModal.eng : null}
        presetOutcome={activeModal?.type === "logCall" ? activeModal.presetOutcome : undefined}
        onConfirm={handleLogCall}
        loading={isMutating}
      />
      <MeetingModal open={activeModal?.type === "meeting"} onClose={() => setActiveModal(null)} onConfirm={handleMarkMeetingBooked} loading={isMutating} />
      <DisqualifyModal open={activeModal?.type === "disqualify"} onClose={() => setActiveModal(null)} onConfirm={handleDisqualify} loading={isMutating} />
      <CreateTaskModal open={activeModal?.type === "task"} onClose={() => setActiveModal(null)} engagement={activeModal?.type === "task" ? activeModal.eng : null} onConfirm={handleCreateTask} loading={isMutating} />
      <ChangeStageModal open={activeModal?.type === "stage"} onClose={() => setActiveModal(null)} current={activeModal?.type === "stage" ? activeModal.eng.sdrStage : undefined} onConfirm={handleChangeStage} loading={isMutating} />
      <HandoverModal open={activeModal?.type === "handover"} onClose={() => setActiveModal(null)} engagement={activeModal?.type === "handover" ? activeModal.eng : null} users={users} onConfirm={handleHandover} loading={isMutating} />
    </div>
  );
}
