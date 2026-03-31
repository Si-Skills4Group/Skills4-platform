import { useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
import {
  ArrowLeft, Handshake, Building2, User2, Users, Pencil, Trash2, Plus,
  CalendarClock, CheckSquare, FileText, TrendingUp, GraduationCap,
  Clock, AlertCircle, Trophy, History,
} from "lucide-react";
import {
  useGetEngagement,
  useUpdateEngagement,
  useDeleteEngagement,
  useListTasks,
  useCreateTask,
  useListUsers,
  useListOrganisations,
  useListContacts,
  getGetEngagementQueryKey,
} from "@workspace/api-client-react";
import type {
  EngagementStage,
  EngagementStatus,
  TaskStatus,
  TaskPriority,
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
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/core-ui";
import { Modal, ConfirmModal } from "@/components/ui/Modal";
import { ActivityFeed } from "@/components/ui/ActivityFeed";
import { usePermissions } from "@/hooks/usePermissions";
import { formatCurrency, formatDate, isOverdue, cn } from "@/lib/utils";
import { StageBadge } from "./Engagements";

// ─── Stage pipeline stepper ───────────────────────────────────────────────────

const PIPELINE_STAGES: EngagementStage[] = [
  "lead", "contacted", "meeting_booked", "proposal", "active", "won",
];

const STAGE_LABELS: Record<EngagementStage, string> = {
  lead: "Lead",
  contacted: "Contacted",
  meeting_booked: "Meeting Booked",
  proposal: "Proposal",
  active: "Active",
  won: "Won",
  dormant: "Dormant",
};

type StageStepperProps = {
  currentStage: EngagementStage;
  onChangeStage: (s: EngagementStage) => void;
  canEdit: boolean;
  isPending: boolean;
};

function StageStepper({ currentStage, onChangeStage, canEdit, isPending }: StageStepperProps) {
  const isDormant = currentStage === "dormant";
  const currentIdx = PIPELINE_STAGES.indexOf(currentStage);

  return (
    <div className="bg-white border rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Pipeline Stage</p>
        {isDormant && (
          <Badge variant="secondary">Dormant</Badge>
        )}
      </div>
      <div className="flex items-center gap-1">
        {PIPELINE_STAGES.map((stage, idx) => {
          const isCompleted = currentIdx > idx;
          const isCurrent = currentStage === stage;
          const canClick = canEdit && !isPending;

          return (
            <div key={stage} className="flex-1 flex items-center">
              <button
                disabled={!canClick}
                onClick={() => canClick && onChangeStage(stage)}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1.5 py-2 px-1 rounded-xl text-center transition-all",
                  canClick && "hover:bg-muted/50 cursor-pointer",
                  !canClick && "cursor-default"
                )}
              >
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                  isCurrent && "bg-primary text-primary-foreground shadow-md scale-110",
                  isCompleted && "bg-primary/20 text-primary",
                  !isCurrent && !isCompleted && "bg-muted text-muted-foreground"
                )}>
                  {isCompleted ? "✓" : idx + 1}
                </div>
                <span className={cn(
                  "text-[10px] font-medium leading-tight hidden sm:block",
                  isCurrent ? "text-primary font-bold" : isCompleted ? "text-primary/70" : "text-muted-foreground"
                )}>
                  {STAGE_LABELS[stage]}
                </span>
              </button>
              {idx < PIPELINE_STAGES.length - 1 && (
                <div className={cn("h-0.5 w-2 flex-shrink-0 rounded-full transition-colors", isCompleted ? "bg-primary/30" : "bg-muted")} />
              )}
            </div>
          );
        })}
      </div>
      {isDormant && (
        <p className="text-xs text-muted-foreground mt-2 text-center">
          This engagement is dormant. Click a stage above to reactivate.
        </p>
      )}
    </div>
  );
}

// ─── Task status config ───────────────────────────────────────────────────────

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  completed: "Completed",
  overdue: "Overdue",
};

const TASK_STATUS_VARIANT: Record<TaskStatus, "success" | "warning" | "secondary" | "destructive"> = {
  open: "secondary",
  in_progress: "warning",
  completed: "success",
  overdue: "destructive",
};

const PRIORITY_LABELS: Record<TaskPriority, string> = { low: "Low", medium: "Medium", high: "High" };

// ─── Quick Task Form ──────────────────────────────────────────────────────────

function QuickTaskForm({
  engagementId,
  organisationId,
  onSuccess,
  onCancel,
  prefill,
}: {
  engagementId: number;
  organisationId: number | null | undefined;
  onSuccess: () => void;
  onCancel: () => void;
  prefill?: { title?: string; dueDate?: string };
}) {
  const [form, setForm] = useState({
    title: prefill?.title ?? "",
    status: "open" as TaskStatus,
    priority: "medium" as TaskPriority,
    dueDate: prefill?.dueDate ?? "",
    description: "",
    assignedUserId: "",
  });
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const { data: users = [] } = useListUsers();
  const queryClient = useQueryClient();

  const mutation = useCreateTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        onSuccess();
      },
    },
  });

  const set = (k: keyof typeof form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Partial<typeof form> = {};
    if (!form.title.trim()) errs.title = "Title is required";
    setErrors(errs);
    if (!Object.keys(errs).length) {
      mutation.mutate({
        data: {
          title: form.title,
          status: form.status,
          priority: form.priority,
          engagementId,
          organisationId: organisationId ?? null,
          dueDate: form.dueDate || null,
          description: form.description || null,
          assignedUserId: form.assignedUserId ? parseInt(form.assignedUserId) : null,
        },
      });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Title *</Label>
          <Input value={form.title} onChange={(e) => set("title", e.target.value)}
            placeholder="e.g. Send proposal document"
            className={errors.title ? "border-destructive" : ""} />
          {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Priority</Label>
          <Select value={form.priority} onValueChange={(v) => set("priority", v as TaskPriority)}>
            <SelectOption value="low">Low</SelectOption>
            <SelectOption value="medium">Medium</SelectOption>
            <SelectOption value="high">High</SelectOption>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => set("status", v as TaskStatus)}>
            <SelectOption value="open">Open</SelectOption>
            <SelectOption value="in_progress">In Progress</SelectOption>
            <SelectOption value="completed">Completed</SelectOption>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Due Date</Label>
          <Input type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Assigned To</Label>
          <Select value={form.assignedUserId} onValueChange={(v) => set("assignedUserId", v)}>
            <SelectOption value="">— Unassigned —</SelectOption>
            {users.map((u) => <SelectOption key={u.id} value={u.id.toString()}>{u.fullName}</SelectOption>)}
          </Select>
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Description</Label>
          <Textarea value={form.description} onChange={(e) => set("description", e.target.value)}
            className="min-h-[80px]" placeholder="Additional details…" />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Saving…" : "Add Task"}</Button>
      </div>
    </form>
  );
}

// ─── Engagement Edit Form (inline, reuses same form as list page) ─────────────

type EngFormState = {
  title: string;
  organisationId: string;
  primaryContactId: string;
  ownerUserId: string;
  stage: EngagementStage;
  status: EngagementStatus;
  expectedValue: string;
  expectedLearnerVolume: string;
  probability: string;
  lastContactDate: string;
  nextActionDate: string;
  nextActionNote: string;
  notes: string;
};

function EngagementEditForm({ initial, onSubmit, onCancel, isPending }: {
  initial: EngFormState;
  onSubmit: (d: EngFormState) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof EngFormState, string>>>({});

  const { data: orgs = [] } = useListOrganisations();
  const { data: contacts = [] } = useListContacts(
    { organisationId: form.organisationId ? parseInt(form.organisationId) : undefined },
    { query: { enabled: !!form.organisationId } }
  );
  const { data: users = [] } = useListUsers();

  const STAGES: EngagementStage[] = ["lead", "contacted", "meeting_booked", "proposal", "active", "won", "dormant"];
  const STAGE_LABELS_LOCAL: Record<EngagementStage, string> = {
    lead: "Lead", contacted: "Contacted", meeting_booked: "Meeting Booked",
    proposal: "Proposal", active: "Active", won: "Won", dormant: "Dormant",
  };

  const set = (k: keyof EngFormState, v: string) => {
    setForm((f) => {
      const next = { ...f, [k]: v };
      if (k === "organisationId") next.primaryContactId = "";
      return next;
    });
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Partial<Record<keyof EngFormState, string>> = {};
    if (!form.title.trim()) errs.title = "Title is required";
    if (!form.organisationId) errs.organisationId = "Organisation is required";
    setErrors(errs);
    if (!Object.keys(errs).length) onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-5">
      <div className="space-y-1.5">
        <Label>Title *</Label>
        <Input value={form.title} onChange={(e) => set("title", e.target.value)} className={errors.title ? "border-destructive" : ""} />
        {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Organisation *</Label>
          <Select value={form.organisationId} onValueChange={(v) => set("organisationId", v)}>
            <SelectOption value="">— Select —</SelectOption>
            {orgs.map((o) => <SelectOption key={o.id} value={o.id.toString()}>{o.name}</SelectOption>)}
          </Select>
          {errors.organisationId && <p className="text-xs text-destructive">{errors.organisationId}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Primary Contact</Label>
          <Select value={form.primaryContactId} onValueChange={(v) => set("primaryContactId", v)}>
            <SelectOption value="">— None —</SelectOption>
            {contacts.map((c) => (
              <SelectOption key={c.id} value={c.id.toString()}>{c.firstName} {c.lastName}</SelectOption>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Stage</Label>
          <Select value={form.stage} onValueChange={(v) => set("stage", v as EngagementStage)}>
            {STAGES.map((s) => <SelectOption key={s} value={s}>{STAGE_LABELS_LOCAL[s]}</SelectOption>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => set("status", v as EngagementStatus)}>
            <SelectOption value="open">Open</SelectOption>
            <SelectOption value="on_hold">On Hold</SelectOption>
            <SelectOption value="closed_won">Closed Won</SelectOption>
            <SelectOption value="closed_lost">Closed Lost</SelectOption>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Owner</Label>
          <Select value={form.ownerUserId} onValueChange={(v) => set("ownerUserId", v)}>
            <SelectOption value="">— Unassigned —</SelectOption>
            {users.map((u) => <SelectOption key={u.id} value={u.id.toString()}>{u.fullName}</SelectOption>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Probability (%)</Label>
          <Input type="number" min="0" max="100" value={form.probability} onChange={(e) => set("probability", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Expected Value (£)</Label>
          <Input type="number" min="0" value={form.expectedValue} onChange={(e) => set("expectedValue", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Expected Learner Volume</Label>
          <Input type="number" min="0" value={form.expectedLearnerVolume} onChange={(e) => set("expectedLearnerVolume", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Last Contact Date</Label>
          <Input type="date" value={form.lastContactDate} onChange={(e) => set("lastContactDate", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Next Action Date</Label>
          <Input type="date" value={form.nextActionDate} onChange={(e) => set("nextActionDate", e.target.value)} />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Next Action</Label>
          <Input value={form.nextActionNote} onChange={(e) => set("nextActionNote", e.target.value)} placeholder="e.g. Send proposal to contact" />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} className="min-h-[90px]" />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>Cancel</Button>
        <Button type="submit" disabled={isPending}>{isPending ? "Saving…" : "Save Changes"}</Button>
      </div>
    </form>
  );
}

// ─── Main Detail Page ─────────────────────────────────────────────────────────

export default function EngagementDetail() {
  const [, params] = useRoute("/engagements/:id");
  const id = params?.id ? parseInt(params.id, 10) : 0;
  const [, navigate] = useLocation();

  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [taskPrefill, setTaskPrefill] = useState<{ title?: string; dueDate?: string } | undefined>(undefined);
  const [showWonConfirm, setShowWonConfirm] = useState(false);
  const [showDormantModal, setShowDormantModal] = useState(false);
  const [dormantReason, setDormantReason] = useState("");

  const queryClient = useQueryClient();
  const { canEdit, canDelete, canCreate } = usePermissions();

  const { data: eng, isLoading } = useGetEngagement(id, { query: { enabled: !!id } });
  const { data: tasks = [] } = useListTasks({ engagementId: id }, { query: { enabled: !!id } });

  const updateMutation = useUpdateEngagement({
    mutation: {
      onSuccess: (data) => {
        queryClient.setQueryData(getGetEngagementQueryKey(id), data);
        queryClient.invalidateQueries({ queryKey: ["/api/engagements"] });
        setShowEdit(false);
      },
    },
  });

  const deleteMutation = useDeleteEngagement({
    mutation: { onSuccess: () => navigate("/engagements") },
  });

  function handleStageChange(stage: EngagementStage) {
    if (!eng) return;
    if (stage === "won") {
      setShowWonConfirm(true);
      return;
    }
    if (stage === "dormant") {
      setDormantReason("");
      setShowDormantModal(true);
      return;
    }
    updateMutation.mutate({ id: eng.id, data: { stage } });
  }

  function confirmWon(closeAsWon: boolean) {
    if (!eng) return;
    updateMutation.mutate({
      id: eng.id,
      data: closeAsWon ? { stage: "won", status: "closed_won" } : { stage: "won" },
    });
    setShowWonConfirm(false);
  }

  function confirmDormant() {
    if (!eng) return;
    const appendedNotes = dormantReason.trim()
      ? [eng.notes, `[Dormant – ${new Date().toLocaleDateString("en-GB")}] ${dormantReason.trim()}`].filter(Boolean).join("\n\n")
      : eng.notes ?? null;
    updateMutation.mutate({
      id: eng.id,
      data: { stage: "dormant", notes: appendedNotes },
    });
    setShowDormantModal(false);
    setDormantReason("");
  }

  function handleUpdate(form: EngFormState) {
    if (!eng) return;
    updateMutation.mutate({
      id: eng.id,
      data: {
        title: form.title,
        stage: form.stage,
        status: form.status,
        organisationId: form.organisationId ? parseInt(form.organisationId) : null,
        primaryContactId: form.primaryContactId ? parseInt(form.primaryContactId) : null,
        ownerUserId: form.ownerUserId ? parseInt(form.ownerUserId) : null,
        expectedValue: form.expectedValue ? parseFloat(form.expectedValue) : null,
        expectedLearnerVolume: form.expectedLearnerVolume ? parseInt(form.expectedLearnerVolume) : null,
        probability: form.probability ? parseInt(form.probability) : null,
        lastContactDate: form.lastContactDate || null,
        nextActionDate: form.nextActionDate || null,
        nextActionNote: form.nextActionNote || null,
        notes: form.notes || null,
      },
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!eng) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Handshake size={48} className="text-muted-foreground" />
        <h2 className="text-xl font-semibold">Engagement not found</h2>
        <Link href="/engagements">
          <Button variant="outline"><ArrowLeft size={16} className="mr-2" />Back to list</Button>
        </Link>
      </div>
    );
  }

  const openTasks = tasks.filter((t) => t.status !== "completed");
  const completedTasks = tasks.filter((t) => t.status === "completed");
  const nextActionOverdue = eng.nextActionDate && isOverdue(eng.nextActionDate) && eng.status === "open";

  const engFormInitial: EngFormState = {
    title: eng.title,
    organisationId: eng.organisationId?.toString() ?? "",
    primaryContactId: eng.primaryContactId?.toString() ?? "",
    ownerUserId: eng.ownerUserId?.toString() ?? "",
    stage: eng.stage,
    status: eng.status,
    expectedValue: eng.expectedValue?.toString() ?? "",
    expectedLearnerVolume: eng.expectedLearnerVolume?.toString() ?? "",
    probability: eng.probability?.toString() ?? "",
    lastContactDate: eng.lastContactDate ?? "",
    nextActionDate: eng.nextActionDate ?? "",
    nextActionNote: eng.nextActionNote ?? "",
    notes: eng.notes ?? "",
  };

  const statusLabel: Record<EngagementStatus, string> = {
    open: "Open",
    closed_won: "Closed Won",
    closed_lost: "Closed Lost",
    on_hold: "On Hold",
  };

  const statusVariant: Record<EngagementStatus, "success" | "destructive" | "warning" | "secondary"> = {
    open: "secondary",
    closed_won: "success",
    closed_lost: "destructive",
    on_hold: "warning",
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Breadcrumb */}
      <Link href="/engagements" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors gap-1.5">
        <ArrowLeft size={14} /> Engagements
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <StageBadge stage={eng.stage} />
            <Badge variant={statusVariant[eng.status]}>{statusLabel[eng.status]}</Badge>
          </div>
          <h1 className="text-2xl font-display font-bold text-foreground leading-tight">{eng.title}</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {eng.organisationName && (
              <Link href={`/organisations/${eng.organisationId}`} className="flex items-center gap-1.5 hover:text-primary transition-colors">
                <Building2 size={14} />{eng.organisationName}
              </Link>
            )}
            {eng.contactName && (
              <Link href={`/contacts/${eng.primaryContactId}`} className="flex items-center gap-1.5 hover:text-primary transition-colors">
                <User2 size={14} />{eng.contactName}
              </Link>
            )}
            {eng.ownerName && (
              <span className="flex items-center gap-1.5">
                <Users size={14} />{eng.ownerName}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {canEdit && (
            <Button variant="outline" className="gap-2" onClick={() => setShowEdit(true)}>
              <Pencil size={15} /> Edit
            </Button>
          )}
          {canDelete && (
            <Button variant="outline" className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/5" onClick={() => setShowDelete(true)}>
              <Trash2 size={15} /> Delete
            </Button>
          )}
        </div>
      </div>

      {/* Stage stepper */}
      <StageStepper
        currentStage={eng.stage}
        onChangeStage={handleStageChange}
        canEdit={canEdit}
        isPending={updateMutation.isPending}
      />

      {/* Next action alert */}
      {eng.nextActionDate && (
        <div className={cn(
          "rounded-xl border p-4 flex items-start gap-3",
          nextActionOverdue
            ? "bg-red-50 border-red-200"
            : "bg-amber-50 border-amber-200"
        )}>
          <div className={cn("mt-0.5 flex-shrink-0", nextActionOverdue ? "text-red-500" : "text-amber-500")}>
            {nextActionOverdue ? <AlertCircle size={18} /> : <CalendarClock size={18} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn("font-semibold text-sm", nextActionOverdue ? "text-red-700" : "text-amber-700")}>
              {nextActionOverdue ? "Overdue action" : "Upcoming action"} · {formatDate(eng.nextActionDate)}
            </p>
            {eng.nextActionNote && (
              <p className={cn("text-sm mt-0.5", nextActionOverdue ? "text-red-600" : "text-amber-600")}>
                {eng.nextActionNote}
              </p>
            )}
          </div>
          {canCreate && (
            <button
              onClick={() => {
                setTaskPrefill({
                  title: eng.nextActionNote ?? undefined,
                  dueDate: eng.nextActionDate ?? undefined,
                });
                setShowAddTask(true);
              }}
              className={cn(
                "text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors shrink-0",
                nextActionOverdue
                  ? "border-red-300 text-red-700 hover:bg-red-100"
                  : "border-amber-300 text-amber-700 hover:bg-amber-100"
              )}
            >
              + Create Task
            </button>
          )}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Expected Value",
            value: formatCurrency(eng.expectedValue),
            icon: <TrendingUp size={16} className="text-emerald-600" />,
            accent: "text-emerald-700",
          },
          {
            label: "Learner Volume",
            value: eng.expectedLearnerVolume != null ? `${eng.expectedLearnerVolume}` : "—",
            icon: <GraduationCap size={16} className="text-blue-500" />,
            accent: "",
          },
          {
            label: "Probability",
            value: eng.probability != null ? `${eng.probability}%` : "—",
            icon: <TrendingUp size={16} className="text-primary" />,
            accent: "",
          },
          {
            label: "Open Tasks",
            value: `${openTasks.length}`,
            icon: <CheckSquare size={16} className="text-amber-500" />,
            accent: "",
          },
        ].map(({ label, value, icon, accent }) => (
          <Card key={label} className="border shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                {icon}
              </div>
              <div>
                <p className={cn("text-xl font-bold leading-none", accent)}>{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Details */}
        <div className="space-y-4">
          <Card className="border shadow-sm">
            <CardContent className="p-0 divide-y">
              <div className="p-5">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Details</h3>
                <dl className="space-y-3 text-sm">
                  {[
                    { icon: Building2, label: "Organisation", value: eng.organisationName, href: `/organisations/${eng.organisationId}` },
                    { icon: User2, label: "Primary Contact", value: eng.contactName, href: `/contacts/${eng.primaryContactId}` },
                    { icon: Users, label: "Owner", value: eng.ownerName },
                  ].map(({ icon: Icon, label, value, href }) => (
                    <div key={label} className="flex items-start gap-3">
                      <Icon size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <dt className="text-xs text-muted-foreground">{label}</dt>
                        <dd className="font-medium mt-0.5">
                          {value ? (
                            href ? (
                              <Link href={href} className="text-primary hover:underline">{value}</Link>
                            ) : value
                          ) : "—"}
                        </dd>
                      </div>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="p-5">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Activity</h3>
                <dl className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <Clock size={14} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <dt className="text-xs text-muted-foreground">Last Contact</dt>
                      <dd className="font-medium mt-0.5">{formatDate(eng.lastContactDate)}</dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CalendarClock size={14} className={cn("mt-0.5 flex-shrink-0", nextActionOverdue ? "text-destructive" : "text-muted-foreground")} />
                    <div>
                      <dt className="text-xs text-muted-foreground">Next Action</dt>
                      <dd className={cn("font-medium mt-0.5", nextActionOverdue ? "text-destructive" : "")}>
                        {formatDate(eng.nextActionDate)}
                      </dd>
                    </div>
                  </div>
                </dl>
              </div>

              <div className="p-5">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Record Info</h3>
                <dl className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <dt>Created</dt>
                    <dd>{formatDate(eng.createdAt)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Updated</dt>
                    <dd>{formatDate(eng.updatedAt)}</dd>
                  </div>
                </dl>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Tasks + Notes */}
        <div className="lg:col-span-2 space-y-6">
          {/* Tasks */}
          <Card className="border shadow-sm">
            <CardContent className="p-0">
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <div className="flex items-center gap-2">
                  <CheckSquare size={16} className="text-muted-foreground" />
                  <h3 className="font-semibold text-sm">Tasks</h3>
                  <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">{tasks.length}</span>
                </div>
                {canCreate && (
                  <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => setShowAddTask(true)}>
                    <Plus size={13} /> Add Task
                  </Button>
                )}
              </div>

              {tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center px-6">
                  <CheckSquare size={28} className="text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">No tasks yet</p>
                  <p className="text-xs text-muted-foreground mt-1">Add tasks to track actions for this engagement.</p>
                  {canCreate && (
                    <Button size="sm" className="mt-4 gap-1.5" onClick={() => setShowAddTask(true)}>
                      <Plus size={13} /> Add Task
                    </Button>
                  )}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Assigned</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((task) => (
                      <TableRow key={task.id} className="hover:bg-muted/30">
                        <TableCell className="font-medium text-sm max-w-[200px]">
                          <span className="line-clamp-1">{task.title}</span>
                          {task.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={cn(
                            "text-xs font-semibold",
                            task.priority === "high" ? "text-destructive" :
                              task.priority === "medium" ? "text-amber-600" : "text-muted-foreground"
                          )}>
                            {PRIORITY_LABELS[task.priority]}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={TASK_STATUS_VARIANT[task.status]}>{TASK_STATUS_LABELS[task.status]}</Badge>
                        </TableCell>
                        <TableCell>
                          {task.dueDate ? (
                            <span className={cn(
                              "text-xs",
                              isOverdue(task.dueDate) && task.status !== "completed" ? "text-destructive font-semibold" : "text-muted-foreground"
                            )}>
                              {formatDate(task.dueDate)}
                            </span>
                          ) : <span className="text-muted-foreground text-sm">—</span>}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {task.assignedUserName ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          {eng.notes && (
            <Card className="border shadow-sm">
              <CardContent className="p-0">
                <div className="flex items-center gap-2 px-5 py-4 border-b">
                  <FileText size={16} className="text-muted-foreground" />
                  <h3 className="font-semibold text-sm">Notes</h3>
                </div>
                <div className="p-5">
                  <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{eng.notes}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary: completed tasks */}
          {completedTasks.length > 0 && (
            <Card className="border shadow-sm bg-muted/30">
              <CardContent className="p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                  Completed Tasks ({completedTasks.length})
                </p>
                <ul className="space-y-1.5">
                  {completedTasks.map((t) => (
                    <li key={t.id} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckSquare size={13} className="mt-0.5 flex-shrink-0 text-emerald-500" />
                      <span className="line-through">{t.title}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Activity Feed */}
          <Card className="border shadow-sm">
            <CardContent className="p-0">
              <div className="flex items-center gap-2 px-5 py-4 border-b">
                <History size={16} className="text-muted-foreground" />
                <h3 className="font-semibold text-sm">Activity</h3>
              </div>
              <ActivityFeed entityType="engagement" entityId={eng.id} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Engagement" size="lg">
        <EngagementEditForm
          initial={engFormInitial}
          onSubmit={handleUpdate}
          onCancel={() => setShowEdit(false)}
          isPending={updateMutation.isPending}
        />
      </Modal>

      {/* Delete confirm */}
      <ConfirmModal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={() => deleteMutation.mutate({ id: eng.id })}
        title="Delete Engagement"
        message={`Are you sure you want to delete "${eng.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        isDestructive
        isPending={deleteMutation.isPending}
      />

      {/* Add task modal */}
      <Modal
        open={showAddTask}
        onClose={() => { setShowAddTask(false); setTaskPrefill(undefined); }}
        title={taskPrefill?.title ? "Create Task from Next Action" : "Add Task"}
        size="lg"
      >
        <QuickTaskForm
          engagementId={id}
          organisationId={eng.organisationId}
          onSuccess={() => { setShowAddTask(false); setTaskPrefill(undefined); }}
          onCancel={() => { setShowAddTask(false); setTaskPrefill(undefined); }}
          prefill={taskPrefill}
        />
      </Modal>

      {/* Automation 4: Won stage confirmation */}
      <Modal
        open={showWonConfirm}
        onClose={() => setShowWonConfirm(false)}
        title="Moving to Won"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0 mt-0.5">
              <Trophy className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="font-semibold text-foreground">Mark as Won</p>
              <p className="text-sm text-muted-foreground mt-1">
                Would you also like to close this engagement as <strong>Closed Won</strong>? This updates the status to reflect a confirmed win.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2 pt-1">
            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={() => confirmWon(true)}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving…" : "Yes — mark as Won & Closed Won"}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => confirmWon(false)}
              disabled={updateMutation.isPending}
            >
              Just change stage to Won
            </Button>
            <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setShowWonConfirm(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </Modal>

      {/* Automation 5: Dormant stage reason */}
      <Modal
        open={showDormantModal}
        onClose={() => setShowDormantModal(false)}
        title="Moving to Dormant"
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Optionally capture why this engagement is going dormant. This will be appended to the engagement notes.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="dormant-reason">Reason (optional)</Label>
            <Textarea
              id="dormant-reason"
              value={dormantReason}
              onChange={(e) => setDormantReason(e.target.value)}
              placeholder="e.g. Employer paused hiring, budget constraints, contact left organisation…"
              className="min-h-[100px]"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t">
            <Button variant="outline" onClick={() => { confirmDormant(); }} disabled={updateMutation.isPending}>
              Skip & move to Dormant
            </Button>
            <Button onClick={() => confirmDormant()} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving…" : dormantReason.trim() ? "Save reason & move to Dormant" : "Move to Dormant"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
