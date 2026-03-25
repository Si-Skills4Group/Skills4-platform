import { useState, useMemo } from "react";
import {
  Plus, Search, CheckSquare, Check, X, SlidersHorizontal,
  Building2, Handshake, User2, CalendarClock, Circle, AlertCircle,
  Clock,
} from "lucide-react";
import { Link } from "wouter";
import {
  useListTasks,
  useCreateTask,
  useUpdateTask,
  useDeleteTask,
  useListOrganisations,
  useListEngagements,
  useListUsers,
} from "@workspace/api-client-react";
import type { Task, TaskStatus, TaskPriority, CreateTaskRequest } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Button,
  Input,
  Textarea,
  Badge,
  Label,
  Select,
  SelectOption,
} from "@/components/ui/core-ui";
import { Modal, ConfirmModal } from "@/components/ui/Modal";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate, isOverdue, cn } from "@/lib/utils";

// ─── Config ──────────────────────────────────────────────────────────────────

type ViewKey = "all" | "mine" | "overdue" | "this_week" | "completed";

const VIEWS: { key: ViewKey; label: string }[] = [
  { key: "all", label: "All Tasks" },
  { key: "mine", label: "My Tasks" },
  { key: "overdue", label: "Overdue" },
  { key: "this_week", label: "Due This Week" },
  { key: "completed", label: "Completed" },
];

const STATUS_LABELS: Record<TaskStatus, string> = {
  open: "Open",
  in_progress: "In Progress",
  completed: "Completed",
  overdue: "Overdue",
};

const STATUS_VARIANT: Record<TaskStatus, "success" | "warning" | "secondary" | "destructive"> = {
  open: "secondary",
  in_progress: "warning",
  completed: "success",
  overdue: "destructive",
};

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; dot: string; text: string }> = {
  high: { label: "High", dot: "bg-destructive", text: "text-destructive" },
  medium: { label: "Medium", dot: "bg-amber-500", text: "text-amber-600" },
  low: { label: "Low", dot: "bg-slate-400", text: "text-slate-500" },
};

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWeek() {
  const d = startOfToday();
  d.setDate(d.getDate() + 7);
  return d;
}

// ─── Task Form ────────────────────────────────────────────────────────────────

type TaskFormState = {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  organisationId: string;
  engagementId: string;
  assignedUserId: string;
};

const DEFAULT_FORM: TaskFormState = {
  title: "",
  description: "",
  status: "open",
  priority: "medium",
  dueDate: "",
  organisationId: "",
  engagementId: "",
  assignedUserId: "",
};

function taskToFormState(t: Task): TaskFormState {
  return {
    title: t.title,
    description: t.description ?? "",
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate ?? "",
    organisationId: t.organisationId?.toString() ?? "",
    engagementId: t.engagementId?.toString() ?? "",
    assignedUserId: t.assignedUserId?.toString() ?? "",
  };
}

export function TaskForm({
  initial,
  onSubmit,
  onCancel,
  isPending,
  prefillOrgId,
  prefillEngagementId,
}: {
  initial: TaskFormState;
  onSubmit: (d: TaskFormState) => void;
  onCancel: () => void;
  isPending: boolean;
  prefillOrgId?: string;
  prefillEngagementId?: string;
}) {
  const [form, setForm] = useState<TaskFormState>({
    ...initial,
    organisationId: prefillOrgId ?? initial.organisationId,
    engagementId: prefillEngagementId ?? initial.engagementId,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof TaskFormState, string>>>({});

  const { data: orgs = [] } = useListOrganisations();
  const { data: engagements = [] } = useListEngagements(
    { organisationId: form.organisationId ? parseInt(form.organisationId) : undefined },
    { query: { enabled: true } }
  );
  const { data: users = [] } = useListUsers();

  const filteredEngagements = form.organisationId
    ? engagements.filter((e) => e.organisationId === parseInt(form.organisationId))
    : engagements;

  const set = (k: keyof TaskFormState, v: string) => {
    setForm((f) => {
      const next = { ...f, [k]: v };
      if (k === "organisationId") next.engagementId = "";
      return next;
    });
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  function validate(): boolean {
    const errs: Partial<Record<keyof TaskFormState, string>> = {};
    if (!form.title.trim()) errs.title = "Title is required";
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
          placeholder="e.g. Send proposal to Angela"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          className={errors.title ? "border-destructive" : ""}
        />
        {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Priority */}
        <div className="space-y-1.5">
          <Label>Priority</Label>
          <Select value={form.priority} onValueChange={(v) => set("priority", v as TaskPriority)}>
            <SelectOption value="low">Low</SelectOption>
            <SelectOption value="medium">Medium</SelectOption>
            <SelectOption value="high">High</SelectOption>
          </Select>
        </div>

        {/* Status */}
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => set("status", v as TaskStatus)}>
            <SelectOption value="open">Open</SelectOption>
            <SelectOption value="in_progress">In Progress</SelectOption>
            <SelectOption value="completed">Completed</SelectOption>
          </Select>
        </div>

        {/* Due Date */}
        <div className="space-y-1.5">
          <Label>Due Date</Label>
          <Input type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
        </div>

        {/* Assigned To */}
        <div className="space-y-1.5">
          <Label>Assigned To</Label>
          <Select value={form.assignedUserId} onValueChange={(v) => set("assignedUserId", v)}>
            <SelectOption value="">— Unassigned —</SelectOption>
            {users.map((u) => (
              <SelectOption key={u.id} value={u.id.toString()}>{u.fullName}</SelectOption>
            ))}
          </Select>
        </div>

        {/* Organisation */}
        <div className="space-y-1.5">
          <Label>Organisation</Label>
          <Select value={form.organisationId} onValueChange={(v) => set("organisationId", v)}>
            <SelectOption value="">— None —</SelectOption>
            {orgs.map((o) => (
              <SelectOption key={o.id} value={o.id.toString()}>{o.name}</SelectOption>
            ))}
          </Select>
        </div>

        {/* Engagement */}
        <div className="space-y-1.5">
          <Label>Engagement</Label>
          <Select value={form.engagementId} onValueChange={(v) => set("engagementId", v)}>
            <SelectOption value="">— None —</SelectOption>
            {filteredEngagements.map((e) => (
              <SelectOption key={e.id} value={e.id.toString()}>{e.title}</SelectOption>
            ))}
          </Select>
        </div>

        {/* Description */}
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Description</Label>
          <Textarea
            placeholder="Additional details or context…"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            className="min-h-[80px]"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>Cancel</Button>
        <Button type="submit" disabled={isPending}>{isPending ? "Saving…" : "Save Task"}</Button>
      </div>
    </form>
  );
}

// ─── Mark Complete Checkbox ───────────────────────────────────────────────────

function CompleteToggle({ task, onToggle, isPending }: { task: Task; onToggle: () => void; isPending: boolean }) {
  const isCompleted = task.status === "completed";
  return (
    <button
      onClick={onToggle}
      disabled={isPending}
      className={cn(
        "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all",
        isCompleted
          ? "bg-emerald-500 border-emerald-500 text-white"
          : "border-muted-foreground/30 hover:border-primary/50 hover:bg-primary/5",
        isPending && "opacity-50 cursor-wait"
      )}
      title={isCompleted ? "Mark as open" : "Mark as complete"}
    >
      {isCompleted && <Check size={11} strokeWidth={3} />}
    </button>
  );
}

// ─── Task Row ─────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  onEdit,
  onDelete,
  canEdit,
  canDelete,
  completeMutation,
}: {
  task: Task;
  onEdit: (t: Task) => void;
  onDelete: (t: Task) => void;
  canEdit: boolean;
  canDelete: boolean;
  completeMutation: { mutate: (args: { id: number; data: { status: TaskStatus } }) => void; isPending: boolean };
}) {
  const isCompleted = task.status === "completed";
  const overdueTask = !isCompleted && task.dueDate && isOverdue(task.dueDate);
  const pCfg = PRIORITY_CONFIG[task.priority];

  function handleToggle() {
    completeMutation.mutate({
      id: task.id,
      data: { status: isCompleted ? "open" : "completed" },
    });
  }

  return (
    <tr className={cn("border-b last:border-0 group hover:bg-muted/30 transition-colors", isCompleted && "bg-gray-50/50")}>
      {/* Checkbox */}
      <td className="pl-5 py-3 w-10">
        <CompleteToggle task={task} onToggle={handleToggle} isPending={completeMutation.isPending} />
      </td>

      {/* Title + description */}
      <td className="py-3 pr-4 max-w-[220px]">
        <p className={cn("font-medium text-sm leading-snug", isCompleted && "line-through text-muted-foreground")}>
          {task.title}
        </p>
        {task.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{task.description}</p>
        )}
      </td>

      {/* Related to */}
      <td className="py-3 pr-4 text-sm min-w-[140px]">
        {task.engagementTitle ? (
          <Link href={`/engagements/${task.engagementId}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
            <Handshake size={12} className="flex-shrink-0" />
            <span className="truncate max-w-[150px]">{task.engagementTitle}</span>
          </Link>
        ) : task.organisationName ? (
          <Link href={`/organisations/${task.organisationId}`} className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors">
            <Building2 size={12} className="flex-shrink-0" />
            <span className="truncate max-w-[150px]">{task.organisationName}</span>
          </Link>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>

      {/* Assigned */}
      <td className="py-3 pr-4 text-sm text-muted-foreground hidden md:table-cell">
        {task.assignedUserName ? (
          <span className="flex items-center gap-1.5">
            <User2 size={12} className="flex-shrink-0" />
            {task.assignedUserName}
          </span>
        ) : "—"}
      </td>

      {/* Due date */}
      <td className="py-3 pr-4 text-sm hidden sm:table-cell">
        {task.dueDate ? (
          <span className={cn(
            "flex items-center gap-1.5",
            overdueTask ? "text-destructive font-semibold" : isCompleted ? "text-muted-foreground line-through" : "text-muted-foreground"
          )}>
            {overdueTask ? <AlertCircle size={12} /> : <CalendarClock size={12} />}
            {formatDate(task.dueDate)}
          </span>
        ) : <span className="text-muted-foreground">—</span>}
      </td>

      {/* Priority */}
      <td className="py-3 pr-4 hidden lg:table-cell">
        <span className={cn("flex items-center gap-1.5 text-xs font-medium", pCfg.text)}>
          <span className={cn("w-2 h-2 rounded-full flex-shrink-0", pCfg.dot)} />
          {pCfg.label}
        </span>
      </td>

      {/* Status */}
      <td className="py-3 pr-4">
        <Badge variant={STATUS_VARIANT[task.status]} className="text-xs">
          {STATUS_LABELS[task.status]}
        </Badge>
      </td>

      {/* Actions */}
      {(canEdit || canDelete) && (
        <td className="py-3 pr-4 w-24">
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
            {canEdit && (
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => onEdit(task)}>
                Edit
              </Button>
            )}
            {canDelete && (
              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive hover:text-destructive" onClick={() => onDelete(task)}>
                Delete
              </Button>
            )}
          </div>
        </td>
      )}
    </tr>
  );
}

// ─── View Tab Bar ─────────────────────────────────────────────────────────────

function ViewTab({ label, active, count, onClick }: { label: string; active: boolean; count?: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 whitespace-nowrap",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
      )}
    >
      {label}
      {count != null && count > 0 && (
        <span className={cn(
          "text-xs rounded-full px-1.5 py-0.5 min-w-[20px] text-center font-bold",
          active ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
        )}>
          {count}
        </span>
      )}
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Tasks() {
  const [activeView, setActiveView] = useState<ViewKey>("all");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [deleteTask, setDeleteTask] = useState<Task | null>(null);
  const [prefillForm, setPrefillForm] = useState<Partial<TaskFormState>>({});

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { canCreate, canEdit, canDelete } = usePermissions();

  const { data: allTasks = [], isLoading } = useListTasks({
    search: search || undefined,
    priority: priorityFilter || undefined,
    status: activeView === "completed" ? "completed" : undefined,
  });

  const filteredTasks = useMemo(() => {
    const today = startOfToday();
    const weekEnd = endOfWeek();

    switch (activeView) {
      case "mine":
        return allTasks.filter((t) => t.assignedUserId === user?.id);
      case "overdue":
        return allTasks.filter(
          (t) => t.status !== "completed" && t.dueDate && new Date(t.dueDate) < today
        );
      case "this_week":
        return allTasks.filter(
          (t) => t.status !== "completed" && t.dueDate && new Date(t.dueDate) >= today && new Date(t.dueDate) <= weekEnd
        );
      case "completed":
        return allTasks;
      default:
        return allTasks;
    }
  }, [allTasks, activeView, user?.id]);

  const viewCounts = useMemo(() => {
    const today = startOfToday();
    const weekEnd = endOfWeek();
    const openTasks = allTasks.filter((t) => t.status !== "completed");
    return {
      mine: openTasks.filter((t) => t.assignedUserId === user?.id).length,
      overdue: openTasks.filter((t) => t.dueDate && new Date(t.dueDate) < today).length,
      this_week: openTasks.filter((t) => t.dueDate && new Date(t.dueDate) >= today && new Date(t.dueDate) <= weekEnd).length,
    };
  }, [allTasks, user?.id]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });

  const createMutation = useCreateTask({
    mutation: { onSuccess: () => { invalidate(); setShowCreate(false); } },
  });

  const updateMutation = useUpdateTask({
    mutation: { onSuccess: () => { invalidate(); setEditTask(null); } },
  });

  const completeMutation = useUpdateTask({
    mutation: { onSuccess: () => invalidate() },
  });

  const deleteMutation = useDeleteTask({
    mutation: { onSuccess: () => { invalidate(); setDeleteTask(null); } },
  });

  function handleCreate(form: TaskFormState) {
    const req: CreateTaskRequest = {
      title: form.title,
      description: form.description || null,
      status: form.status,
      priority: form.priority,
      dueDate: form.dueDate || null,
      organisationId: form.organisationId ? parseInt(form.organisationId) : null,
      engagementId: form.engagementId ? parseInt(form.engagementId) : null,
      assignedUserId: form.assignedUserId ? parseInt(form.assignedUserId) : null,
    };
    createMutation.mutate({ data: req });
  }

  function handleUpdate(form: TaskFormState) {
    if (!editTask) return;
    updateMutation.mutate({
      id: editTask.id,
      data: {
        title: form.title,
        description: form.description || null,
        status: form.status,
        priority: form.priority,
        dueDate: form.dueDate || null,
        organisationId: form.organisationId ? parseInt(form.organisationId) : null,
        engagementId: form.engagementId ? parseInt(form.engagementId) : null,
        assignedUserId: form.assignedUserId ? parseInt(form.assignedUserId) : null,
      },
    });
  }

  function openCreate(prefill: Partial<TaskFormState> = {}) {
    setPrefillForm(prefill);
    setShowCreate(true);
  }

  const activeFilterCount = [priorityFilter].filter(Boolean).length;

  return (
    <div className="h-full flex flex-col gap-5 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex sm:items-center justify-between flex-col sm:flex-row gap-4 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Tasks</h1>
          <p className="text-muted-foreground mt-1">
            Follow-ups and actions across all engagements.
          </p>
        </div>
        {canCreate && (
          <Button className="gap-2 shrink-0" onClick={() => openCreate()}>
            <Plus size={18} /> Add Task
          </Button>
        )}
      </div>

      {/* View tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 flex-shrink-0">
        {VIEWS.map((v) => (
          <ViewTab
            key={v.key}
            label={v.label}
            active={activeView === v.key}
            count={v.key !== "all" && v.key !== "completed" ? viewCounts[v.key as keyof typeof viewCounts] : undefined}
            onClick={() => setActiveView(v.key)}
          />
        ))}
      </div>

      {/* Search + Filters */}
      <div className="space-y-3 flex-shrink-0">
        <div className="flex gap-3 items-center">
          <div className="relative flex-1 bg-white rounded-xl border shadow-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search tasks…"
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
              <Label className="text-xs">Priority</Label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectOption value="">All Priorities</SelectOption>
                <SelectOption value="high">High</SelectOption>
                <SelectOption value="medium">Medium</SelectOption>
                <SelectOption value="low">Low</SelectOption>
              </Select>
            </div>
            {activeFilterCount > 0 && (
              <button className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1" onClick={() => setPriorityFilter("")}>
                <X size={12} /> Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Task list */}
      <div className="flex-1 bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
              {activeView === "overdue" ? (
                <AlertCircle className="h-8 w-8 text-muted-foreground" />
              ) : activeView === "completed" ? (
                <Check className="h-8 w-8 text-muted-foreground" />
              ) : (
                <CheckSquare className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <h3 className="text-lg font-semibold">
              {activeView === "overdue"
                ? "No overdue tasks"
                : activeView === "completed"
                ? "No completed tasks"
                : activeView === "mine"
                ? "No tasks assigned to you"
                : activeView === "this_week"
                ? "Nothing due this week"
                : "No tasks found"}
            </h3>
            <p className="text-muted-foreground max-w-sm mt-2 text-sm">
              {activeView === "overdue"
                ? "You're on top of things — no overdue actions."
                : "Create a task to track a follow-up or action."}
            </p>
            {canCreate && activeView === "all" && (
              <Button className="mt-6 gap-2" onClick={() => openCreate()}>
                <Plus size={18} /> Add Task
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-auto flex-1">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50/50">
                  <th className="pl-5 py-3 w-10" />
                  <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Task</th>
                  <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Related To</th>
                  <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Assigned</th>
                  <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Due</th>
                  <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Priority</th>
                  <th className="py-3 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                  {(canEdit || canDelete) && <th className="py-3 pr-4 w-24" />}
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    onEdit={setEditTask}
                    onDelete={setDeleteTask}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    completeMutation={completeMutation}
                  />
                ))}
              </tbody>
            </table>

            {/* Task count footer */}
            <div className="px-5 py-3 border-t bg-gray-50/30 text-xs text-muted-foreground">
              {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}
              {activeView !== "all" && ` · ${VIEWS.find((v) => v.key === activeView)?.label}`}
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Add Task"
        description="Create a new task or follow-up."
        size="lg"
      >
        <TaskForm
          initial={{ ...DEFAULT_FORM, ...prefillForm }}
          onSubmit={handleCreate}
          onCancel={() => setShowCreate(false)}
          isPending={createMutation.isPending}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editTask} onClose={() => setEditTask(null)} title="Edit Task" size="lg">
        {editTask && (
          <TaskForm
            initial={taskToFormState(editTask)}
            onSubmit={handleUpdate}
            onCancel={() => setEditTask(null)}
            isPending={updateMutation.isPending}
          />
        )}
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal
        open={!!deleteTask}
        onClose={() => setDeleteTask(null)}
        onConfirm={() => deleteTask && deleteMutation.mutate({ id: deleteTask.id })}
        title="Delete Task"
        message={`Are you sure you want to delete "${deleteTask?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        isDestructive
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
