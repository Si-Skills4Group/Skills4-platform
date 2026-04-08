import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  PhoneCall, Mail, Linkedin, CalendarCheck, Trophy, XCircle, Plus,
  MoreHorizontal, RefreshCw, Building2, User2, Clock, AlertTriangle,
  ChevronDown, CheckCircle2, Target, ArrowUpRight,
} from "lucide-react";
import {
  useListEngagements,
  useUpdateEngagement,
  useCreateTask,
  useListUsers,
} from "@workspace/api-client-react";
import type {
  Engagement,
  SdrStage,
  OutreachChannel,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Input,
  Textarea,
  Badge,
  Label,
  Select,
  SelectOption,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/core-ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Modal, ConfirmModal } from "@/components/ui/Modal";
import { formatDate, cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";

// ─── Constants ────────────────────────────────────────────────────────────────

const SDR_STAGES: { value: SdrStage; label: string }[] = [
  { value: "new", label: "New" },
  { value: "researching", label: "Researching" },
  { value: "outreach_started", label: "Outreach Started" },
  { value: "contacted", label: "Contacted" },
  { value: "response_received", label: "Response Received" },
  { value: "meeting_booked", label: "Meeting Booked" },
  { value: "qualified", label: "Qualified" },
  { value: "disqualified", label: "Disqualified" },
  { value: "nurture", label: "Nurture" },
];

const STAGE_STYLES: Record<string, string> = {
  new: "bg-slate-100 text-slate-700 border-slate-200",
  researching: "bg-blue-50 text-blue-700 border-blue-200",
  outreach_started: "bg-purple-50 text-purple-700 border-purple-200",
  contacted: "bg-indigo-50 text-indigo-700 border-indigo-200",
  response_received: "bg-teal-50 text-teal-700 border-teal-200",
  meeting_booked: "bg-orange-50 text-orange-700 border-orange-200",
  qualified: "bg-emerald-50 text-emerald-700 border-emerald-200",
  disqualified: "bg-red-50 text-red-700 border-red-200",
  nurture: "bg-amber-50 text-amber-700 border-amber-200",
};

const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  email: <Mail size={12} />,
  phone: <PhoneCall size={12} />,
  linkedin: <Linkedin size={12} />,
  in_person: <User2 size={12} />,
  event: <CalendarCheck size={12} />,
};

const LEAD_SOURCES = ["linkedin", "event", "referral", "inbound", "cold_list", "website", "other"];

const today = new Date().toISOString().split("T")[0];

function isOverdue(date: string | null | undefined): boolean {
  if (!date) return false;
  return date < today;
}

// ─── Stage Badge ──────────────────────────────────────────────────────────────

function SdrStageBadge({ stage }: { stage: SdrStage | null | undefined }) {
  if (!stage) return <span className="text-xs text-muted-foreground">—</span>;
  const label = SDR_STAGES.find((s) => s.value === stage)?.label ?? stage;
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border", STAGE_STYLES[stage] ?? "bg-muted text-muted-foreground")}>
      {label}
    </span>
  );
}

// ─── Log Outreach Popover (inline channel picker) ─────────────────────────────

function LogOutreachMenu({
  engagement,
  onLog,
  loading,
}: {
  engagement: Engagement;
  onLog: (channel: OutreachChannel) => void;
  loading: boolean;
}) {
  const channels: { value: OutreachChannel; label: string }[] = [
    { value: "email", label: "Email" },
    { value: "phone", label: "Phone" },
    { value: "linkedin", label: "LinkedIn" },
    { value: "in_person", label: "In Person" },
    { value: "event", label: "Event" },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 gap-1 text-xs font-medium"
          disabled={loading}
        >
          <RefreshCw size={11} className={cn(loading && "animate-spin")} />
          Log
          <ChevronDown size={10} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-40">
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Log outreach via</div>
        {channels.map((c) => (
          <DropdownMenuItem key={c.value} onClick={() => onLog(c.value)} className="gap-2 text-xs">
            {CHANNEL_ICONS[c.value]}
            {c.label}
            {engagement.outreachChannel === c.value && (
              <CheckCircle2 size={11} className="ml-auto text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Meeting Modal ─────────────────────────────────────────────────────────────

function MeetingModal({
  open,
  onClose,
  onConfirm,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (date: string) => void;
  loading: boolean;
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
            <CalendarCheck size={14} className="mr-1.5" />
            Confirm
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Disqualify Modal ─────────────────────────────────────────────────────────

function DisqualifyModal({
  open,
  onClose,
  onConfirm,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState("");
  return (
    <Modal open={open} onClose={onClose} title="Disqualify Lead" size="sm">
      <div className="p-6 space-y-4">
        <div className="space-y-1.5">
          <Label>Reason <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Textarea
            rows={3}
            placeholder="e.g. No budget, wrong sector, not decision-maker…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" variant="destructive" onClick={() => onConfirm(reason)} disabled={loading}>
            <XCircle size={14} className="mr-1.5" />
            Disqualify
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Create Task Modal ────────────────────────────────────────────────────────

function CreateTaskModal({
  open,
  onClose,
  engagement,
  onConfirm,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  engagement: Engagement | null;
  onConfirm: (title: string, dueDate: string, description: string) => void;
  loading: boolean;
}) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (open) {
      setTitle(engagement ? `Follow up — ${engagement.organisationName ?? engagement.title}` : "");
      setDueDate("");
      setDescription("");
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal open={open} onClose={onClose} title="Create Follow-up Task" size="sm">
      <div className="p-6 space-y-4">
        <div className="space-y-1.5">
          <Label>Task title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Call Neil Barker" />
        </div>
        <div className="space-y-1.5">
          <Label>Due date</Label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief context…" />
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => onConfirm(title, dueDate, description)} disabled={loading || !title || !dueDate}>
            <Plus size={14} className="mr-1.5" />
            Create Task
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Change Stage Modal ───────────────────────────────────────────────────────

function ChangeStageModal({
  open,
  onClose,
  current,
  onConfirm,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  current: SdrStage | null | undefined;
  onConfirm: (stage: SdrStage) => void;
  loading: boolean;
}) {
  const [stage, setStage] = useState<string>(current ?? "new");
  return (
    <Modal open={open} onClose={onClose} title="Change SDR Stage" size="sm">
      <div className="p-6 space-y-4">
        <div className="space-y-1.5">
          <Label>New stage</Label>
          <Select value={stage} onValueChange={setStage}>
            {SDR_STAGES.map((s) => (
              <SelectOption key={s.value} value={s.value}>{s.label}</SelectOption>
            ))}
          </Select>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={() => onConfirm(stage as SdrStage)} disabled={loading}>
            Update Stage
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Row Actions ──────────────────────────────────────────────────────────────

type ActiveModal =
  | { type: "meeting"; eng: Engagement }
  | { type: "disqualify"; eng: Engagement }
  | { type: "task"; eng: Engagement }
  | { type: "stage"; eng: Engagement }
  | { type: "qualify"; eng: Engagement }
  | null;

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SdrQueue() {
  const queryClient = useQueryClient();
  const { canEdit } = usePermissions();

  // Filters
  const [stageFilter, setStageFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [leadSourceFilter, setLeadSourceFilter] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [search, setSearch] = useState("");

  // Modal state
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);

  // Data
  const { data: rawEngagements = [], isLoading, refetch } = useListEngagements(
    { engagementType: "sdr", ...(search ? { search } : {}) },
    { query: { staleTime: 0 } }
  );

  const { data: users = [] } = useListUsers();

  // Mutations
  const updateMutation = useUpdateEngagement({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/engagements"] });
      },
    },
  });

  const createTaskMutation = useCreateTask({
    mutation: { onSuccess: () => setActiveModal(null) },
  });

  // Derived list with filters
  const engagements = rawEngagements.filter((e) => {
    if (stageFilter && e.sdrStage !== stageFilter) return false;
    if (ownerFilter && String(e.sdrOwnerUserId) !== ownerFilter) return false;
    if (leadSourceFilter && e.leadSource !== leadSourceFilter) return false;
    if (overdueOnly && !isOverdue(e.nextOutreachDate)) return false;
    return true;
  });

  const overdueCount = rawEngagements.filter((e) => isOverdue(e.nextOutreachDate)).length;

  // ─── Quick action handlers ───────────────────────────────────────────────

  function handleLogOutreach(eng: Engagement, channel: OutreachChannel) {
    updateMutation.mutate({
      id: eng.id,
      data: {
        lastOutreachDate: today,
        touchCount: (eng.touchCount ?? 0) + 1,
        outreachChannel: channel,
      } as any,
    });
  }

  function handleChangeStage(eng: Engagement, stage: SdrStage) {
    updateMutation.mutate({
      id: eng.id,
      data: { sdrStage: stage } as any,
    });
    setActiveModal(null);
  }

  function handleMarkMeetingBooked(date: string) {
    if (!activeModal || activeModal.type !== "meeting") return;
    updateMutation.mutate({
      id: activeModal.eng.id,
      data: { meetingBooked: true, meetingDate: date, sdrStage: "meeting_booked" } as any,
    });
    setActiveModal(null);
  }

  function handleQualify(eng: Engagement) {
    updateMutation.mutate({
      id: eng.id,
      data: { sdrStage: "qualified", qualificationStatus: "qualified" } as any,
    });
    setActiveModal(null);
  }

  function handleDisqualify(reason: string) {
    if (!activeModal || activeModal.type !== "disqualify") return;
    updateMutation.mutate({
      id: activeModal.eng.id,
      data: {
        sdrStage: "disqualified",
        disqualificationReason: reason || null,
      } as any,
    });
    setActiveModal(null);
  }

  function handleCreateTask(title: string, dueDate: string, description: string) {
    if (!activeModal || activeModal.type !== "task") return;
    const eng = activeModal.eng;
    createTaskMutation.mutate({
      data: {
        title,
        dueDate,
        description: description || undefined,
        organisationId: eng.organisationId ?? undefined,
        engagementId: eng.id,
        priority: "medium",
        status: "open",
      } as any,
    });
  }

  const isMutating = updateMutation.isPending || createTaskMutation.isPending;

  return (
    <div className="h-full flex flex-col gap-5 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex sm:items-center justify-between flex-col sm:flex-row gap-3 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">SDR Queue</h1>
          <p className="text-muted-foreground mt-1">
            Active SDR prospects &amp; outreach pipeline.
            {!isLoading && rawEngagements.length > 0 && (
              <span className="ml-2 text-xs font-medium bg-muted rounded-full px-2 py-0.5">
                {rawEngagements.length}
              </span>
            )}
            {overdueCount > 0 && (
              <span className="ml-2 text-xs font-medium bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 border border-amber-200 inline-flex items-center gap-1">
                <AlertTriangle size={10} />
                {overdueCount} overdue
              </span>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 self-start" onClick={() => refetch()}>
          <RefreshCw size={14} />
          Refresh
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 items-center flex-shrink-0">
        <Input
          placeholder="Search prospects…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 w-48 text-sm"
        />
        <Select value={stageFilter} onValueChange={setStageFilter} className="h-8 w-44 text-sm">
          <SelectOption value="">All stages</SelectOption>
          {SDR_STAGES.map((s) => (
            <SelectOption key={s.value} value={s.value}>{s.label}</SelectOption>
          ))}
        </Select>
        <Select value={ownerFilter} onValueChange={setOwnerFilter} className="h-8 w-40 text-sm">
          <SelectOption value="">All owners</SelectOption>
          {users.map((u) => (
            <SelectOption key={u.id} value={String(u.id)}>{u.fullName}</SelectOption>
          ))}
        </Select>
        <Select value={leadSourceFilter} onValueChange={setLeadSourceFilter} className="h-8 w-40 text-sm">
          <SelectOption value="">All sources</SelectOption>
          {LEAD_SOURCES.map((s) => (
            <SelectOption key={s} value={s} className="capitalize">{s.replace("_", " ")}</SelectOption>
          ))}
        </Select>
        <button
          onClick={() => setOverdueOnly((p) => !p)}
          className={cn(
            "h-8 px-3 rounded-md border text-xs font-medium transition-colors inline-flex items-center gap-1.5",
            overdueOnly
              ? "bg-amber-100 border-amber-300 text-amber-700"
              : "bg-white border-border text-muted-foreground hover:text-foreground"
          )}
        >
          <AlertTriangle size={12} />
          Overdue only
        </button>
        {(stageFilter || ownerFilter || leadSourceFilter || overdueOnly || search) && (
          <button
            onClick={() => { setStageFilter(""); setOwnerFilter(""); setLeadSourceFilter(""); setOverdueOnly(false); setSearch(""); }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto rounded-xl border bg-white">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">Loading…</div>
        ) : engagements.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
            <Target size={32} className="opacity-30" />
            <p className="text-sm">No SDR prospects match your filters.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-48">Organisation</TableHead>
                <TableHead className="w-36">Contact</TableHead>
                <TableHead className="w-36">SDR Stage</TableHead>
                <TableHead className="w-32">Owner</TableHead>
                <TableHead className="w-32">Next Outreach</TableHead>
                <TableHead className="w-32">Last Outreach</TableHead>
                <TableHead className="w-20 text-center">Meeting</TableHead>
                <TableHead className="w-16 text-center">Touches</TableHead>
                <TableHead className="w-16 text-center">Source</TableHead>
                <TableHead className="w-36 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {engagements.map((eng) => {
                const overdue = isOverdue(eng.nextOutreachDate);
                const isUpdating = isMutating;

                return (
                  <TableRow
                    key={eng.id}
                    className={cn(
                      "group transition-colors",
                      overdue ? "bg-amber-50/60 hover:bg-amber-50" : "hover:bg-muted/20"
                    )}
                  >
                    {/* Organisation */}
                    <TableCell className="py-2.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {overdue && (
                          <AlertTriangle size={12} className="text-amber-500 shrink-0" />
                        )}
                        <div className="min-w-0">
                          {eng.organisationId ? (
                            <Link href={`/organisations/${eng.organisationId}`}>
                              <span className="text-sm font-medium hover:text-primary transition-colors truncate block max-w-[160px] cursor-pointer">
                                {eng.organisationName ?? "—"}
                              </span>
                            </Link>
                          ) : (
                            <span className="text-sm font-medium truncate block max-w-[160px]">
                              {eng.organisationName ?? "—"}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground truncate block max-w-[160px]">{eng.title}</span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Contact */}
                    <TableCell className="py-2.5">
                      {eng.contactName ? (
                        <span className="text-sm truncate block max-w-[130px]">{eng.contactName}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* SDR Stage */}
                    <TableCell className="py-2.5">
                      <SdrStageBadge stage={eng.sdrStage} />
                    </TableCell>

                    {/* Owner */}
                    <TableCell className="py-2.5">
                      <span className="text-sm truncate block max-w-[120px]">
                        {eng.sdrOwnerName ?? eng.ownerName ?? <span className="text-muted-foreground">—</span>}
                      </span>
                    </TableCell>

                    {/* Next Outreach */}
                    <TableCell className="py-2.5">
                      {eng.nextOutreachDate ? (
                        <span className={cn(
                          "text-sm inline-flex items-center gap-1",
                          overdue ? "text-amber-600 font-semibold" : "text-foreground"
                        )}>
                          {overdue && <Clock size={11} className="shrink-0" />}
                          {formatDate(eng.nextOutreachDate)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Last Outreach */}
                    <TableCell className="py-2.5">
                      {eng.lastOutreachDate ? (
                        <span className="text-sm text-muted-foreground inline-flex items-center gap-1">
                          {eng.outreachChannel && CHANNEL_ICONS[eng.outreachChannel]}
                          {formatDate(eng.lastOutreachDate)}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Never</span>
                      )}
                    </TableCell>

                    {/* Meeting Booked */}
                    <TableCell className="py-2.5 text-center">
                      {eng.meetingBooked ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                          <CheckCircle2 size={13} />
                          {eng.meetingDate ? formatDate(eng.meetingDate) : "Yes"}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Touch Count */}
                    <TableCell className="py-2.5 text-center">
                      <span className={cn(
                        "text-sm font-medium tabular-nums",
                        (eng.touchCount ?? 0) === 0 ? "text-muted-foreground" : "text-foreground"
                      )}>
                        {eng.touchCount ?? 0}
                      </span>
                    </TableCell>

                    {/* Lead Source */}
                    <TableCell className="py-2.5 text-center">
                      {eng.leadSource ? (
                        <span className="text-xs text-muted-foreground capitalize">
                          {eng.leadSource.replace("_", " ")}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="py-2.5">
                      {canEdit && (
                        <div className="flex items-center gap-1.5 justify-end">
                          {/* Log Outreach */}
                          <LogOutreachMenu
                            engagement={eng}
                            onLog={(channel) => handleLogOutreach(eng, channel)}
                            loading={isUpdating}
                          />

                          {/* More actions */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                <MoreHorizontal size={14} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                className="gap-2 text-xs"
                                onClick={() => setActiveModal({ type: "stage", eng })}
                              >
                                <ArrowUpRight size={13} />
                                Change stage
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="gap-2 text-xs"
                                onClick={() => setActiveModal({ type: "meeting", eng })}
                                disabled={eng.meetingBooked}
                              >
                                <CalendarCheck size={13} />
                                Mark meeting booked
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="gap-2 text-xs text-emerald-600 focus:text-emerald-600"
                                onClick={() => setActiveModal({ type: "qualify", eng })}
                                disabled={eng.sdrStage === "qualified"}
                              >
                                <Trophy size={13} />
                                Mark qualified
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="gap-2 text-xs text-destructive focus:text-destructive"
                                onClick={() => setActiveModal({ type: "disqualify", eng })}
                                disabled={eng.sdrStage === "disqualified"}
                              >
                                <XCircle size={13} />
                                Mark disqualified
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="gap-2 text-xs"
                                onClick={() => setActiveModal({ type: "task", eng })}
                              >
                                <Plus size={13} />
                                Create follow-up task
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem asChild className="gap-2 text-xs">
                                <Link href={`/engagements/${eng.id}`}>
                                  <Building2 size={13} />
                                  View engagement
                                </Link>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Modals */}
      <MeetingModal
        open={activeModal?.type === "meeting"}
        onClose={() => setActiveModal(null)}
        onConfirm={handleMarkMeetingBooked}
        loading={isMutating}
      />

      <DisqualifyModal
        open={activeModal?.type === "disqualify"}
        onClose={() => setActiveModal(null)}
        onConfirm={handleDisqualify}
        loading={isMutating}
      />

      <CreateTaskModal
        open={activeModal?.type === "task"}
        onClose={() => setActiveModal(null)}
        engagement={activeModal?.type === "task" ? activeModal.eng : null}
        onConfirm={handleCreateTask}
        loading={isMutating}
      />

      <ChangeStageModal
        open={activeModal?.type === "stage"}
        onClose={() => setActiveModal(null)}
        current={activeModal?.type === "stage" ? activeModal.eng.sdrStage : undefined}
        onConfirm={(stage) => {
          if (activeModal?.type === "stage") handleChangeStage(activeModal.eng, stage);
        }}
        loading={isMutating}
      />

      <ConfirmModal
        open={activeModal?.type === "qualify"}
        onClose={() => setActiveModal(null)}
        onConfirm={() => activeModal?.type === "qualify" && handleQualify(activeModal.eng)}
        title="Mark as Qualified"
        message={`Mark "${activeModal?.type === "qualify" ? (activeModal.eng.organisationName ?? activeModal.eng.title) : ""}" as qualified and ready for handover?`}
        confirmLabel="Mark Qualified"
        isPending={isMutating}
      />
    </div>
  );
}
