import { useState } from "react";
import {
  Plus, Search, LayoutGrid, List, Handshake, X, SlidersHorizontal,
  Building2, User2, CalendarClock, TrendingUp, GraduationCap, ChevronRight,
  CheckSquare,
} from "lucide-react";
import { Link } from "wouter";
import {
  useListEngagements,
  useCreateEngagement,
  useUpdateEngagement,
  useDeleteEngagement,
  useListOrganisations,
  useListContacts,
  useListUsers,
  useCreateTask,
} from "@workspace/api-client-react";
import type {
  Engagement,
  EngagementStage,
  EngagementStatus,
  CreateEngagementRequest,
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
import { Modal, ConfirmModal } from "@/components/ui/Modal";
import { usePermissions } from "@/hooks/usePermissions";
import { formatCurrency, formatDate, isOverdue } from "@/lib/utils";
import { cn } from "@/lib/utils";

// ─── Stage & Status config ────────────────────────────────────────────────────

const STAGES: EngagementStage[] = [
  "lead", "contacted", "meeting_booked", "proposal", "active", "won", "dormant",
];

type StageConfig = {
  label: string;
  columnBg: string;
  accentColor: string;
  badgeClass: string;
};

const STAGE_CONFIG: Record<EngagementStage, StageConfig> = {
  lead: {
    label: "Lead",
    columnBg: "bg-slate-50 border-slate-200",
    accentColor: "bg-slate-400",
    badgeClass: "bg-slate-100 text-slate-700 border border-slate-200",
  },
  contacted: {
    label: "Contacted",
    columnBg: "bg-blue-50 border-blue-100",
    accentColor: "bg-blue-500",
    badgeClass: "bg-blue-100 text-blue-700 border border-blue-200",
  },
  meeting_booked: {
    label: "Meeting Booked",
    columnBg: "bg-amber-50 border-amber-100",
    accentColor: "bg-amber-500",
    badgeClass: "bg-amber-100 text-amber-700 border border-amber-200",
  },
  proposal: {
    label: "Proposal",
    columnBg: "bg-violet-50 border-violet-100",
    accentColor: "bg-violet-500",
    badgeClass: "bg-violet-100 text-violet-700 border border-violet-200",
  },
  active: {
    label: "Active",
    columnBg: "bg-emerald-50 border-emerald-100",
    accentColor: "bg-emerald-500",
    badgeClass: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  },
  won: {
    label: "Won",
    columnBg: "bg-green-50 border-green-100",
    accentColor: "bg-green-600",
    badgeClass: "bg-green-100 text-green-700 border border-green-200",
  },
  dormant: {
    label: "Dormant",
    columnBg: "bg-gray-50 border-gray-200",
    accentColor: "bg-gray-400",
    badgeClass: "bg-gray-100 text-gray-500 border border-gray-200",
  },
};

const STATUS_LABELS: Record<EngagementStatus, string> = {
  open: "Open",
  closed_won: "Closed Won",
  closed_lost: "Closed Lost",
  on_hold: "On Hold",
};

const STATUS_BADGE: Record<EngagementStatus, "success" | "destructive" | "warning" | "secondary"> = {
  open: "secondary",
  closed_won: "success",
  closed_lost: "destructive",
  on_hold: "warning",
};

export function StageBadge({ stage, className }: { stage: EngagementStage; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", STAGE_CONFIG[stage].badgeClass, className)}>
      {STAGE_CONFIG[stage].label}
    </span>
  );
}

// ─── Form ─────────────────────────────────────────────────────────────────────

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

const DEFAULT_FORM: EngFormState = {
  title: "",
  organisationId: "",
  primaryContactId: "",
  ownerUserId: "",
  stage: "lead",
  status: "open",
  expectedValue: "",
  expectedLearnerVolume: "",
  probability: "",
  lastContactDate: "",
  nextActionDate: "",
  nextActionNote: "",
  notes: "",
};

function engToFormState(e: Engagement): EngFormState {
  return {
    title: e.title,
    organisationId: e.organisationId?.toString() ?? "",
    primaryContactId: e.primaryContactId?.toString() ?? "",
    ownerUserId: e.ownerUserId?.toString() ?? "",
    stage: e.stage,
    status: e.status,
    expectedValue: e.expectedValue?.toString() ?? "",
    expectedLearnerVolume: e.expectedLearnerVolume?.toString() ?? "",
    probability: e.probability?.toString() ?? "",
    lastContactDate: e.lastContactDate ?? "",
    nextActionDate: e.nextActionDate ?? "",
    nextActionNote: e.nextActionNote ?? "",
    notes: e.notes ?? "",
  };
}

function EngagementForm({
  initial,
  onSubmit,
  onCancel,
  isPending,
  prefillOrgId,
}: {
  initial: EngFormState;
  onSubmit: (d: EngFormState) => void;
  onCancel: () => void;
  isPending: boolean;
  prefillOrgId?: string;
}) {
  const [form, setForm] = useState<EngFormState>({
    ...initial,
    organisationId: prefillOrgId ?? initial.organisationId,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof EngFormState, string>>>({});

  const { data: orgs = [] } = useListOrganisations();
  const { data: contacts = [] } = useListContacts(
    { organisationId: form.organisationId ? parseInt(form.organisationId) : undefined },
    { query: { enabled: !!form.organisationId } }
  );
  const { data: users = [] } = useListUsers();

  const set = (k: keyof EngFormState, v: string) => {
    setForm((f) => {
      const next = { ...f, [k]: v };
      if (k === "organisationId") next.primaryContactId = "";
      return next;
    });
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  function validate(): boolean {
    const errs: Partial<Record<keyof EngFormState, string>> = {};
    if (!form.title.trim()) errs.title = "Title is required";
    if (!form.organisationId) errs.organisationId = "Organisation is required";
    if (form.probability && (Number(form.probability) < 0 || Number(form.probability) > 100)) {
      errs.probability = "Must be 0–100";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validate()) onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-5">
      {/* Title */}
      <div className="space-y-1.5">
        <Label>Title *</Label>
        <Input
          placeholder="e.g. Digital Apprenticeship Programme 2026"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          className={errors.title ? "border-destructive" : ""}
        />
        {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Org */}
        <div className="space-y-1.5">
          <Label>Organisation *</Label>
          <Select value={form.organisationId} onValueChange={(v) => set("organisationId", v)}>
            <SelectOption value="">— Select Organisation —</SelectOption>
            {orgs.map((o) => <SelectOption key={o.id} value={o.id.toString()}>{o.name}</SelectOption>)}
          </Select>
          {errors.organisationId && <p className="text-xs text-destructive">{errors.organisationId}</p>}
        </div>

        {/* Contact */}
        <div className="space-y-1.5">
          <Label>Primary Contact</Label>
          <Select
            value={form.primaryContactId}
            onValueChange={(v) => set("primaryContactId", v)}
          >
            <SelectOption value="">— None —</SelectOption>
            {contacts.map((c) => (
              <SelectOption key={c.id} value={c.id.toString()}>
                {c.firstName} {c.lastName}{c.jobTitle ? ` — ${c.jobTitle}` : ""}
              </SelectOption>
            ))}
          </Select>
        </div>

        {/* Stage */}
        <div className="space-y-1.5">
          <Label>Stage</Label>
          <Select value={form.stage} onValueChange={(v) => set("stage", v as EngagementStage)}>
            {STAGES.map((s) => <SelectOption key={s} value={s}>{STAGE_CONFIG[s].label}</SelectOption>)}
          </Select>
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => set("status", v as EngagementStatus)}>
            <SelectOption value="open">Open</SelectOption>
            <SelectOption value="on_hold">On Hold</SelectOption>
            <SelectOption value="closed_won">Closed Won</SelectOption>
            <SelectOption value="closed_lost">Closed Lost</SelectOption>
          </Select>
        </div>

        {/* Owner */}
        <div className="space-y-1.5">
          <Label>Owner</Label>
          <Select value={form.ownerUserId} onValueChange={(v) => set("ownerUserId", v)}>
            <SelectOption value="">— Unassigned —</SelectOption>
            {users.map((u) => <SelectOption key={u.id} value={u.id.toString()}>{u.fullName}</SelectOption>)}
          </Select>
        </div>

        {/* Probability */}
        <div className="space-y-1.5">
          <Label>Probability (%)</Label>
          <Input
            type="number" min="0" max="100"
            placeholder="e.g. 75"
            value={form.probability}
            onChange={(e) => set("probability", e.target.value)}
            className={errors.probability ? "border-destructive" : ""}
          />
          {errors.probability && <p className="text-xs text-destructive">{errors.probability}</p>}
        </div>

        {/* Expected Value */}
        <div className="space-y-1.5">
          <Label>Expected Value (£)</Label>
          <Input
            type="number" min="0"
            placeholder="0"
            value={form.expectedValue}
            onChange={(e) => set("expectedValue", e.target.value)}
          />
        </div>

        {/* Learner Volume */}
        <div className="space-y-1.5">
          <Label>Expected Learner Volume</Label>
          <Input
            type="number" min="0"
            placeholder="0"
            value={form.expectedLearnerVolume}
            onChange={(e) => set("expectedLearnerVolume", e.target.value)}
          />
        </div>

        {/* Last Contact Date */}
        <div className="space-y-1.5">
          <Label>Last Contact Date</Label>
          <Input type="date" value={form.lastContactDate} onChange={(e) => set("lastContactDate", e.target.value)} />
        </div>

        {/* Next Action Date */}
        <div className="space-y-1.5">
          <Label>Next Action Date</Label>
          <Input type="date" value={form.nextActionDate} onChange={(e) => set("nextActionDate", e.target.value)} />
        </div>

        {/* Next Action Note */}
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Next Action</Label>
          <Input
            placeholder="e.g. Send proposal to Angela"
            value={form.nextActionNote}
            onChange={(e) => set("nextActionNote", e.target.value)}
          />
        </div>

        {/* Notes */}
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Notes</Label>
          <Textarea
            placeholder="Internal notes about this engagement…"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            className="min-h-[90px]"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>Cancel</Button>
        <Button type="submit" disabled={isPending}>{isPending ? "Saving…" : "Save Engagement"}</Button>
      </div>
    </form>
  );
}

// ─── Kanban Card ──────────────────────────────────────────────────────────────

function ProbabilityBar({ value }: { value: number | null | undefined }) {
  if (value == null) return null;
  const pct = Math.max(0, Math.min(100, value));
  const color = pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-muted-foreground font-medium tabular-nums w-7 text-right">{pct}%</span>
    </div>
  );
}

function KanbanCard({
  eng,
  onEdit,
  canEdit,
  onDragStart,
  onDragEnd,
  isDragging,
}: {
  eng: Engagement;
  onEdit: (e: Engagement) => void;
  canEdit: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  isDragging: boolean;
}) {
  const nextActionOverdue = eng.nextActionDate && isOverdue(eng.nextActionDate) && eng.status === "open";

  return (
    <div
      draggable={canEdit}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "bg-white rounded-xl border shadow-sm cursor-pointer group transition-all duration-150",
        "hover:border-primary/40 hover:shadow-md",
        isDragging && "opacity-40 scale-95",
        canEdit && "active:cursor-grabbing"
      )}
    >
      <Link href={`/engagements/${eng.id}`} className="block p-4 space-y-3">
        {/* Status badge (only if non-open) */}
        {eng.status !== "open" && (
          <Badge variant={STATUS_BADGE[eng.status]} className="text-xs">
            {STATUS_LABELS[eng.status]}
          </Badge>
        )}

        {/* Title */}
        <h4 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {eng.title}
        </h4>

        {/* Org + Contact */}
        <div className="space-y-1">
          {eng.organisationName && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Building2 size={11} className="flex-shrink-0" />
              <span className="truncate">{eng.organisationName}</span>
            </div>
          )}
          {eng.contactName && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <User2 size={11} className="flex-shrink-0" />
              <span className="truncate">{eng.contactName}</span>
            </div>
          )}
        </div>

        {/* Probability bar */}
        {eng.probability != null && <ProbabilityBar value={eng.probability} />}

        {/* Value + Learners row */}
        <div className="flex items-center justify-between text-xs">
          {eng.expectedValue ? (
            <span className="font-semibold text-emerald-700">{formatCurrency(eng.expectedValue)}</span>
          ) : <span />}
          {eng.expectedLearnerVolume ? (
            <span className="flex items-center gap-1 text-muted-foreground">
              <GraduationCap size={11} />{eng.expectedLearnerVolume}
            </span>
          ) : null}
        </div>

        {/* Next action */}
        {eng.nextActionDate && (
          <div className={cn(
            "flex items-center gap-1.5 text-xs rounded-lg px-2 py-1.5",
            nextActionOverdue
              ? "bg-red-50 text-red-600 font-medium"
              : "bg-muted/50 text-muted-foreground"
          )}>
            <CalendarClock size={11} className="flex-shrink-0" />
            <span className="truncate">
              {nextActionOverdue ? "Overdue · " : ""}{formatDate(eng.nextActionDate)}
            </span>
          </div>
        )}
      </Link>

      {/* Edit on hover (accessible only for users who can edit) */}
      {canEdit && (
        <div className="px-4 pb-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(ev) => { ev.preventDefault(); ev.stopPropagation(); onEdit(eng); }}
            className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          >
            Edit
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({
  stage,
  engagements,
  onEdit,
  canEdit,
  onDropStage,
  dragOverStage,
  setDragOverStage,
  draggedId,
  setDraggedId,
  onAddClick,
}: {
  stage: EngagementStage;
  engagements: Engagement[];
  onEdit: (e: Engagement) => void;
  canEdit: boolean;
  onDropStage: (stage: EngagementStage) => void;
  dragOverStage: EngagementStage | null;
  setDragOverStage: (s: EngagementStage | null) => void;
  draggedId: number | null;
  setDraggedId: (id: number | null) => void;
  onAddClick: () => void;
}) {
  const cfg = STAGE_CONFIG[stage];
  const isOver = dragOverStage === stage;
  const totalValue = engagements.reduce((sum, e) => sum + (e.expectedValue ?? 0), 0);

  return (
    <div
      className={cn(
        "w-72 flex flex-col shrink-0 rounded-2xl border transition-all duration-150",
        cfg.columnBg,
        isOver && "ring-2 ring-primary ring-offset-1 bg-primary/5"
      )}
      onDragOver={(e) => { e.preventDefault(); setDragOverStage(stage); }}
      onDragLeave={() => setDragOverStage(null)}
      onDrop={() => { onDropStage(stage); setDragOverStage(null); }}
    >
      {/* Column header */}
      <div className="p-3 pb-2">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full flex-shrink-0", cfg.accentColor)} />
            <span className="font-semibold text-sm text-foreground">{cfg.label}</span>
            <span className="text-xs text-muted-foreground bg-white/70 rounded-full px-1.5 py-0.5 font-medium border">
              {engagements.length}
            </span>
          </div>
          {canEdit && (
            <button
              onClick={onAddClick}
              className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/80 transition-colors"
              title={`Add engagement in ${cfg.label}`}
            >
              <Plus size={14} />
            </button>
          )}
        </div>
        {totalValue > 0 && (
          <p className="text-xs text-muted-foreground pl-4">
            {formatCurrency(totalValue)}
          </p>
        )}
      </div>

      {/* Drop zone indicator */}
      {isOver && draggedId != null && (
        <div className="mx-3 mb-2 h-1 rounded-full bg-primary/40 animate-pulse" />
      )}

      {/* Cards */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2 min-h-[60px]">
        {engagements.map((eng) => (
          <KanbanCard
            key={eng.id}
            eng={eng}
            onEdit={onEdit}
            canEdit={canEdit}
            isDragging={draggedId === eng.id}
            onDragStart={() => setDraggedId(eng.id)}
            onDragEnd={() => setDraggedId(null)}
          />
        ))}
        {engagements.length === 0 && (
          <div className="py-6 text-center text-xs text-muted-foreground/50">
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Engagements() {
  const [view, setView] = useState<"pipeline" | "table">("pipeline");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createInitialStage, setCreateInitialStage] = useState<EngagementStage>("lead");
  const [editEng, setEditEng] = useState<Engagement | null>(null);
  const [deleteEng, setDeleteEng] = useState<Engagement | null>(null);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverStage, setDragOverStage] = useState<EngagementStage | null>(null);
  const [postCreateTask, setPostCreateTask] = useState<{
    engId: number; orgId: number | null; nextActionDate: string; note: string;
  } | null>(null);

  const queryClient = useQueryClient();
  const { canCreate, canEdit, canDelete } = usePermissions();

  const { data: engagements = [], isLoading } = useListEngagements({
    search: search || undefined,
    status: statusFilter || undefined,
  });

  const createTaskMutation = useCreateTask({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        setPostCreateTask(null);
      },
    },
  });

  const createMutation = useCreateEngagement({
    mutation: {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries({ queryKey: ["/api/engagements"] });
        queryClient.invalidateQueries({ queryKey: ["/api/organisations"] });
        setShowCreate(false);
        const nextDate = variables.data.nextActionDate;
        if (nextDate) {
          setPostCreateTask({
            engId: (data as Engagement).id,
            orgId: (data as Engagement).organisationId ?? null,
            nextActionDate: nextDate,
            note: variables.data.nextActionNote ?? (data as Engagement).title ?? "",
          });
        }
      },
    },
  });

  const updateMutation = useUpdateEngagement({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/engagements"] });
        setEditEng(null);
      },
    },
  });

  const deleteMutation = useDeleteEngagement({
    mutation: {
      onSuccess: (_data, variables) => {
        queryClient.setQueriesData<Engagement[]>(
          { queryKey: ["/api/engagements"] },
          (old) => old?.filter((e) => e.id !== variables.id) ?? old
        );
        queryClient.invalidateQueries({ queryKey: ["/api/engagements"] });
        setDeleteEng(null);
      },
    },
  });

  function handleCreate(form: EngFormState) {
    const req: CreateEngagementRequest = {
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
    };
    createMutation.mutate({ data: req });
  }

  function handleUpdate(form: EngFormState) {
    if (!editEng) return;
    updateMutation.mutate({
      id: editEng.id,
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

  function handleDrop(targetStage: EngagementStage) {
    if (!draggedId || !canEdit) return;
    const eng = engagements.find((e) => e.id === draggedId);
    if (!eng || eng.stage === targetStage) return;
    updateMutation.mutate({ id: draggedId, data: { stage: targetStage } });
    setDraggedId(null);
  }

  function openCreateForStage(stage: EngagementStage) {
    setCreateInitialStage(stage);
    setShowCreate(true);
  }

  const activeFilterCount = [statusFilter].filter(Boolean).length;

  return (
    <div className="h-full flex flex-col gap-5 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex sm:items-center justify-between flex-col sm:flex-row gap-4 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Engagements</h1>
          <p className="text-muted-foreground mt-1">
            Track employer opportunities through the pipeline.
            {!isLoading && engagements.length > 0 && (
              <span className="ml-2 text-xs font-medium bg-muted rounded-full px-2 py-0.5">
                {engagements.length}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* View toggle */}
          <div className="flex items-center bg-muted rounded-lg p-1 border">
            <button
              onClick={() => setView("pipeline")}
              className={cn("p-1.5 rounded-md transition-all", view === "pipeline" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
              title="Pipeline view"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setView("table")}
              className={cn("p-1.5 rounded-md transition-all", view === "table" ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
              title="Table view"
            >
              <List size={16} />
            </button>
          </div>
          {canCreate && (
            <Button className="gap-2" onClick={() => { setCreateInitialStage("lead"); setShowCreate(true); }}>
              <Plus size={18} /> Add Engagement
            </Button>
          )}
        </div>
      </div>

      {/* Search + Filters */}
      <div className="space-y-3 flex-shrink-0">
        <div className="flex gap-3 items-center">
          <div className="relative flex-1 bg-white rounded-xl border shadow-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search engagements…"
              className="pl-9 border-0 shadow-none focus-visible:ring-0 bg-transparent"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" onClick={() => setSearch("")}>
                <X size={14} />
              </button>
            )}
          </div>
          <Button variant="outline" className="gap-2 bg-white shrink-0" onClick={() => setShowFilters((v) => !v)}>
            <SlidersHorizontal size={16} />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1 w-5 h-5 text-xs rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>
        {showFilters && (
          <div className="bg-white rounded-xl border shadow-sm p-4 flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5 min-w-[160px]">
              <Label className="text-xs">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectOption value="">All Statuses</SelectOption>
                <SelectOption value="open">Open</SelectOption>
                <SelectOption value="on_hold">On Hold</SelectOption>
                <SelectOption value="closed_won">Closed Won</SelectOption>
                <SelectOption value="closed_lost">Closed Lost</SelectOption>
              </Select>
            </div>
            {activeFilterCount > 0 && (
              <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1" onClick={() => setStatusFilter("")}>
                <X size={12} /> Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main content */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : engagements.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white rounded-xl border">
          <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
            <Handshake className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">
            {search || activeFilterCount ? "No results found" : "No engagements yet"}
          </h3>
          <p className="text-muted-foreground max-w-sm mt-2 text-sm">
            {search || activeFilterCount
              ? "Try adjusting your search or filters."
              : "Start building your pipeline by adding a new engagement."}
          </p>
          {canCreate && !search && !activeFilterCount && (
            <Button className="mt-6 gap-2" onClick={() => setShowCreate(true)}>
              <Plus size={18} /> Add Engagement
            </Button>
          )}
        </div>
      ) : view === "pipeline" ? (
        /* ── Kanban ── */
        <div className="flex-1 overflow-x-auto pb-4 -mx-1 px-1">
          <div className="flex gap-3 h-full min-w-max">
            {STAGES.map((stage) => (
              <KanbanColumn
                key={stage}
                stage={stage}
                engagements={engagements.filter((e) => e.stage === stage)}
                onEdit={setEditEng}
                canEdit={canEdit}
                onDropStage={handleDrop}
                dragOverStage={dragOverStage}
                setDragOverStage={setDragOverStage}
                draggedId={draggedId}
                setDraggedId={setDraggedId}
                onAddClick={() => openCreateForStage(stage)}
              />
            ))}
          </div>
        </div>
      ) : (
        /* ── Table ── */
        <div className="flex-1 bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-auto flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Organisation</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Prob.</TableHead>
                  <TableHead>Next Action</TableHead>
                  <TableHead>Owner</TableHead>
                  {(canEdit || canDelete) && <TableHead className="w-24" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {engagements.map((eng) => {
                  const overdueAction = eng.nextActionDate && isOverdue(eng.nextActionDate) && eng.status === "open";
                  return (
                    <TableRow key={eng.id} className="group cursor-pointer relative hover:bg-muted/30">
                      <TableCell className="font-medium relative max-w-[220px]">
                        <Link href={`/engagements/${eng.id}`} className="absolute inset-0 z-10" />
                        <span className="group-hover:text-primary transition-colors line-clamp-1">
                          {eng.title}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        <div className="flex items-center gap-1.5">
                          <Building2 size={12} className="flex-shrink-0" />
                          <span className="truncate max-w-[140px]">{eng.organisationName ?? "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {eng.contactName ?? "—"}
                      </TableCell>
                      <TableCell>
                        <StageBadge stage={eng.stage} />
                      </TableCell>
                      <TableCell>
                        {eng.status !== "open" ? (
                          <Badge variant={STATUS_BADGE[eng.status]}>{STATUS_LABELS[eng.status]}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">Open</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium text-sm">
                        {eng.expectedValue ? formatCurrency(eng.expectedValue) : "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {eng.probability != null ? `${eng.probability}%` : "—"}
                      </TableCell>
                      <TableCell>
                        {eng.nextActionDate ? (
                          <span className={cn("flex items-center gap-1 text-xs", overdueAction ? "text-destructive font-semibold" : "text-muted-foreground")}>
                            <CalendarClock size={11} />{formatDate(eng.nextActionDate)}
                          </span>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {eng.ownerName ?? "—"}
                      </TableCell>
                      {(canEdit || canDelete) && (
                        <TableCell className="relative z-20">
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                            {canEdit && (
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                                onClick={(e) => { e.stopPropagation(); setEditEng(eng); }}>
                                Edit
                              </Button>
                            )}
                            {canDelete && (
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                                onClick={(e) => { e.stopPropagation(); setDeleteEng(eng); }}>
                                Delete
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Engagement" description="Create a new engagement opportunity." size="lg">
        <EngagementForm
          initial={{ ...DEFAULT_FORM, stage: createInitialStage }}
          onSubmit={handleCreate}
          onCancel={() => setShowCreate(false)}
          isPending={createMutation.isPending}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editEng} onClose={() => setEditEng(null)} title="Edit Engagement" size="lg">
        {editEng && (
          <EngagementForm
            initial={engToFormState(editEng)}
            onSubmit={handleUpdate}
            onCancel={() => setEditEng(null)}
            isPending={updateMutation.isPending}
          />
        )}
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal
        open={!!deleteEng}
        onClose={() => setDeleteEng(null)}
        onConfirm={() => deleteEng && deleteMutation.mutate({ id: deleteEng.id })}
        title="Delete Engagement"
        message={`Are you sure you want to delete "${deleteEng?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        isDestructive
        isPending={deleteMutation.isPending}
      />

      {/* Automation 2: Next action → create task prompt */}
      <Modal
        open={!!postCreateTask}
        onClose={() => setPostCreateTask(null)}
        title="Create a task for this next action?"
      >
        {postCreateTask && (
          <div className="p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center shrink-0 mt-0.5">
                <CheckSquare className="h-5 w-5 text-sky-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  You set a next action for <strong>{new Date(postCreateTask.nextActionDate).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</strong>.
                </p>
                {postCreateTask.note && (
                  <p className="text-sm font-medium text-foreground mt-1">"{postCreateTask.note}"</p>
                )}
                <p className="text-sm text-muted-foreground mt-2">
                  Would you like to auto-create a task with this due date so it shows up in your task list?
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 pt-1">
              <Button
                className="w-full"
                onClick={() =>
                  createTaskMutation.mutate({
                    data: {
                      title: postCreateTask.note || "Follow-up action",
                      status: "open",
                      priority: "medium",
                      dueDate: postCreateTask.nextActionDate,
                      engagementId: postCreateTask.engId,
                      organisationId: postCreateTask.orgId ?? undefined,
                    },
                  })
                }
                disabled={createTaskMutation.isPending}
              >
                {createTaskMutation.isPending ? "Creating task…" : "Yes, create task"}
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setPostCreateTask(null)}>
                No thanks
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
