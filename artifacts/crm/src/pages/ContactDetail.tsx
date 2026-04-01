import { useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
import {
  User2, ArrowLeft, Mail, Phone, Building2, MessageSquare, Pencil, Trash2,
  Handshake, CheckSquare, Plus, CalendarClock, ChevronRight,
} from "lucide-react";
import {
  useGetContact,
  useUpdateContact,
  useDeleteContact,
  useListEngagements,
  useListTasks,
  useCreateTask,
  useListUsers,
} from "@workspace/api-client-react";
import type {
  Contact,
  PreferredContactMethod,
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
import { usePermissions } from "@/hooks/usePermissions";
import { formatCurrency, formatDate, formatInitials, isOverdue } from "@/lib/utils";
import { useListOrganisations } from "@workspace/api-client-react";

const CONTACT_METHOD_LABELS: Record<PreferredContactMethod, string> = {
  email: "Email",
  phone: "Phone",
  post: "Post",
  no_preference: "No Preference",
};

const STAGE_LABELS: Record<EngagementStage, string> = {
  lead: "Lead",
  contacted: "Contacted",
  meeting_booked: "Meeting Booked",
  proposal: "Proposal",
  active: "Active",
  won: "Won",
  dormant: "Dormant",
};

const STAGE_VARIANT: Record<EngagementStage, "success" | "warning" | "default" | "secondary" | "outline"> = {
  lead: "secondary",
  contacted: "warning",
  meeting_booked: "warning",
  proposal: "default",
  active: "success",
  won: "success",
  dormant: "secondary",
};

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

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

type ContactFormState = {
  firstName: string;
  lastName: string;
  jobTitle: string;
  email: string;
  phone: string;
  preferredContactMethod: PreferredContactMethod;
  organisationId: string;
  notes: string;
};

function contactToFormState(c: Contact): ContactFormState {
  return {
    firstName: c.firstName,
    lastName: c.lastName,
    jobTitle: c.jobTitle ?? "",
    email: c.email ?? "",
    phone: c.phone ?? "",
    preferredContactMethod: c.preferredContactMethod ?? "email",
    organisationId: c.organisationId?.toString() ?? "",
    notes: c.notes ?? "",
  };
}

function ContactEditForm({ initial, onSubmit, onCancel, isPending }: {
  initial: ContactFormState;
  onSubmit: (d: ContactFormState) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof ContactFormState, string>>>({});
  const { data: orgs = [] } = useListOrganisations();

  const set = (k: keyof ContactFormState, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Partial<Record<keyof ContactFormState, string>> = {};
    if (!form.firstName.trim()) errs.firstName = "First name is required";
    if (!form.lastName.trim()) errs.lastName = "Last name is required";
    if (!form.organisationId) errs.organisationId = "Organisation is required";
    if (form.email && !isValidEmail(form.email)) errs.email = "Enter a valid email address";
    setErrors(errs);
    if (!Object.keys(errs).length) onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>First Name *</Label>
          <Input value={form.firstName} onChange={e => set("firstName", e.target.value)} className={errors.firstName ? "border-destructive" : ""} />
          {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Last Name *</Label>
          <Input value={form.lastName} onChange={e => set("lastName", e.target.value)} className={errors.lastName ? "border-destructive" : ""} />
          {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Organisation *</Label>
          <Select value={form.organisationId} onValueChange={v => set("organisationId", v)}>
            <SelectOption value="">— Select Organisation —</SelectOption>
            {orgs.map(o => <SelectOption key={o.id} value={o.id.toString()}>{o.name}</SelectOption>)}
          </Select>
          {errors.organisationId && <p className="text-xs text-destructive">{errors.organisationId}</p>}
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Job Title</Label>
          <Input value={form.jobTitle} onChange={e => set("jobTitle", e.target.value)} placeholder="e.g. Head of HR" />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} className={errors.email ? "border-destructive" : ""} />
          {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Phone</Label>
          <Input value={form.phone} onChange={e => set("phone", e.target.value)} />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Preferred Contact Method</Label>
          <Select value={form.preferredContactMethod} onValueChange={v => set("preferredContactMethod", v as PreferredContactMethod)}>
            <SelectOption value="email">Email</SelectOption>
            <SelectOption value="phone">Phone</SelectOption>
            <SelectOption value="post">Post</SelectOption>
            <SelectOption value="no_preference">No Preference</SelectOption>
          </Select>
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} className="min-h-[90px]" />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>Cancel</Button>
        <Button type="submit" disabled={isPending}>{isPending ? "Saving…" : "Save Changes"}</Button>
      </div>
    </form>
  );
}

function QuickTaskForm({ orgId, contactId, onSuccess, onCancel }: { orgId: number; contactId: number; onSuccess: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({ title: "", status: "open" as TaskStatus, priority: "medium" as TaskPriority, dueDate: "", description: "", assignedUserId: "" });
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

  const set = (k: keyof typeof form, v: string) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })); };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Partial<typeof form> = {};
    if (!form.title.trim()) errs.title = "Title is required";
    setErrors(errs);
    if (!Object.keys(errs).length) {
      mutation.mutate({
        data: {
          title: form.title, status: form.status, priority: form.priority,
          organisationId: orgId,
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
          <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Follow up on proposal" className={errors.title ? "border-destructive" : ""} />
          {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Priority</Label>
          <Select value={form.priority} onValueChange={v => set("priority", v as TaskPriority)}>
            <SelectOption value="low">Low</SelectOption>
            <SelectOption value="medium">Medium</SelectOption>
            <SelectOption value="high">High</SelectOption>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={v => set("status", v as TaskStatus)}>
            <SelectOption value="open">Open</SelectOption>
            <SelectOption value="in_progress">In Progress</SelectOption>
            <SelectOption value="completed">Completed</SelectOption>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Due Date</Label>
          <Input type="date" value={form.dueDate} onChange={e => set("dueDate", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Assigned To</Label>
          <Select value={form.assignedUserId} onValueChange={v => set("assignedUserId", v)}>
            <SelectOption value="">— Unassigned —</SelectOption>
            {users.map(u => <SelectOption key={u.id} value={u.id.toString()}>{u.fullName}</SelectOption>)}
          </Select>
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Description</Label>
          <Textarea value={form.description} onChange={e => set("description", e.target.value)} className="min-h-[80px]" placeholder="Additional details…" />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Saving…" : "Add Task"}</Button>
      </div>
    </form>
  );
}

export default function ContactDetail() {
  const [, params] = useRoute("/contacts/:id");
  const id = params?.id ? parseInt(params.id, 10) : 0;
  const [, navigate] = useLocation();

  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);

  const queryClient = useQueryClient();
  const { canEdit, canDelete, canCreate } = usePermissions();

  const { data: contact, isLoading } = useGetContact(id, { query: { enabled: !!id } });

  const orgId = contact?.organisationId ?? undefined;

  const { data: allEngagements = [] } = useListEngagements(
    { organisationId: orgId },
    { query: { enabled: !!orgId } }
  );

  const { data: tasks = [] } = useListTasks(
    { organisationId: orgId },
    { query: { enabled: !!orgId } }
  );

  const linkedEngagements = allEngagements.filter((e) => e.primaryContactId === id);
  const openTasks = tasks.filter((t) => t.status !== "completed");
  const completedTasks = tasks.filter((t) => t.status === "completed");

  const updateMutation = useUpdateContact({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
        setShowEdit(false);
      },
    },
  });

  const deleteMutation = useDeleteContact({
    mutation: {
      onSuccess: (_data, variables) => {
        queryClient.setQueriesData<Contact[]>(
          { queryKey: ["/api/contacts"] },
          (old) => old?.filter((c) => c.id !== variables.id) ?? old
        );
        queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
        navigate("/contacts");
      },
    },
  });

  function handleUpdate(form: ContactFormState) {
    if (!contact) return;
    updateMutation.mutate({
      id: contact.id,
      data: {
        firstName: form.firstName,
        lastName: form.lastName,
        jobTitle: form.jobTitle || null,
        email: form.email || null,
        phone: form.phone || null,
        preferredContactMethod: form.preferredContactMethod,
        organisationId: form.organisationId ? parseInt(form.organisationId) : null,
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

  if (!contact) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <User2 size={48} className="text-muted-foreground" />
        <h2 className="text-xl font-semibold">Contact not found</h2>
        <Link href="/contacts">
          <Button variant="outline"><ArrowLeft size={16} className="mr-2" />Back to list</Button>
        </Link>
      </div>
    );
  }

  const fullName = `${contact.firstName} ${contact.lastName}`;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Breadcrumb */}
      <Link href="/contacts" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors gap-1.5">
        <ArrowLeft size={14} /> Contacts
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center text-xl font-bold flex-shrink-0">
            {formatInitials(fullName)}
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">{fullName}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {contact.jobTitle && (
                <span className="text-muted-foreground text-sm">{contact.jobTitle}</span>
              )}
              {contact.organisationName && (
                <>
                  {contact.jobTitle && <span className="text-muted-foreground">·</span>}
                  <Link href={`/organisations/${contact.organisationId}`}>
                    <span className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
                      <Building2 size={13} />
                      {contact.organisationName}
                    </span>
                  </Link>
                </>
              )}
            </div>
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

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: "Linked Engagements", value: linkedEngagements.length, icon: Handshake },
          { label: "Open Tasks", value: openTasks.length, icon: CheckSquare },
          { label: "Completed Tasks", value: completedTasks.length, icon: CheckSquare },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label} className="border shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground leading-none">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main content: details + linked records */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Details card */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border shadow-sm">
            <CardContent className="p-0 divide-y">
              <div className="p-5">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                  Contact Details
                </h3>
                <dl className="space-y-3 text-sm">
                  {contact.email && (
                    <div className="flex items-start gap-3">
                      <Mail size={15} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <dt className="text-xs text-muted-foreground">Email</dt>
                        <dd>
                          <a href={`mailto:${contact.email}`} className="text-primary hover:underline font-medium">
                            {contact.email}
                          </a>
                        </dd>
                      </div>
                    </div>
                  )}
                  {contact.phone && (
                    <div className="flex items-start gap-3">
                      <Phone size={15} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <dt className="text-xs text-muted-foreground">Phone</dt>
                        <dd className="font-medium">{contact.phone}</dd>
                      </div>
                    </div>
                  )}
                  {contact.organisationId && (
                    <div className="flex items-start gap-3">
                      <Building2 size={15} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <dt className="text-xs text-muted-foreground">Organisation</dt>
                        <dd>
                          <Link href={`/organisations/${contact.organisationId}`} className="text-primary hover:underline font-medium">
                            {contact.organisationName}
                          </Link>
                        </dd>
                      </div>
                    </div>
                  )}
                  {contact.preferredContactMethod && (
                    <div className="flex items-start gap-3">
                      <MessageSquare size={15} className="text-muted-foreground mt-0.5 flex-shrink-0" />
                      <div>
                        <dt className="text-xs text-muted-foreground">Preferred Contact</dt>
                        <dd className="font-medium">{CONTACT_METHOD_LABELS[contact.preferredContactMethod]}</dd>
                      </div>
                    </div>
                  )}
                </dl>
              </div>

              {contact.notes && (
                <div className="p-5">
                  <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Notes</h3>
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{contact.notes}</p>
                </div>
              )}

              <div className="p-5">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Record Info</h3>
                <dl className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <dt>Created</dt>
                    <dd>{formatDate(contact.createdAt)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Last Updated</dt>
                    <dd>{formatDate(contact.updatedAt)}</dd>
                  </div>
                </dl>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Linked engagements + tasks */}
        <div className="lg:col-span-2 space-y-6">
          {/* Engagements */}
          <Card className="border shadow-sm">
            <CardContent className="p-0">
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <div className="flex items-center gap-2">
                  <Handshake size={16} className="text-muted-foreground" />
                  <h3 className="font-semibold text-sm">Engagements</h3>
                  <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                    {linkedEngagements.length}
                  </span>
                </div>
              </div>
              {linkedEngagements.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center px-6">
                  <Handshake size={28} className="text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">No engagements linked</p>
                  <p className="text-xs text-muted-foreground mt-1">This contact hasn't been set as the primary contact on any engagement yet.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Next Action</TableHead>
                      <TableHead className="w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linkedEngagements.map((eng) => (
                      <TableRow key={eng.id} className="group cursor-pointer relative hover:bg-muted/30">
                        <TableCell className="font-medium relative">
                          <Link href={`/engagements/${eng.id}`} className="absolute inset-0 z-10" />
                          <span className="group-hover:text-primary transition-colors">{eng.title}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={STAGE_VARIANT[eng.stage]}>{STAGE_LABELS[eng.stage]}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {eng.expectedValue ? formatCurrency(Number(eng.expectedValue)) : "—"}
                        </TableCell>
                        <TableCell>
                          {eng.nextActionDate ? (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <CalendarClock size={12} />
                              <span className={isOverdue(eng.nextActionDate) ? "text-destructive font-medium" : ""}>
                                {formatDate(eng.nextActionDate)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Tasks */}
          <Card className="border shadow-sm">
            <CardContent className="p-0">
              <div className="flex items-center justify-between px-5 py-4 border-b">
                <div className="flex items-center gap-2">
                  <CheckSquare size={16} className="text-muted-foreground" />
                  <h3 className="font-semibold text-sm">Organisation Tasks</h3>
                  <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                    {tasks.length}
                  </span>
                </div>
                {canCreate && orgId && (
                  <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs" onClick={() => setShowAddTask(true)}>
                    <Plus size={13} /> Add Task
                  </Button>
                )}
              </div>
              {tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center px-6">
                  <CheckSquare size={28} className="text-muted-foreground mb-2" />
                  <p className="text-sm font-medium">No tasks yet</p>
                  {canCreate && orgId && (
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
                      <TableHead className="w-8" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tasks.map((task) => (
                      <TableRow key={task.id} className="group cursor-pointer relative hover:bg-muted/30">
                        <TableCell className="font-medium relative">
                          <span className="group-hover:text-primary transition-colors">{task.title}</span>
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs font-semibold ${task.priority === "high" ? "text-destructive" : task.priority === "medium" ? "text-amber-600" : "text-muted-foreground"}`}>
                            {PRIORITY_LABELS[task.priority]}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={TASK_STATUS_VARIANT[task.status]}>
                            {TASK_STATUS_LABELS[task.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {task.dueDate ? (
                            <span className={`text-xs ${isOverdue(task.dueDate) && task.status !== "completed" ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                              {formatDate(task.dueDate)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Contact" size="lg">
        {contact && (
          <ContactEditForm
            initial={contactToFormState(contact)}
            onSubmit={handleUpdate}
            onCancel={() => setShowEdit(false)}
            isPending={updateMutation.isPending}
          />
        )}
      </Modal>

      {/* Delete confirm */}
      <ConfirmModal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={() => deleteMutation.mutate({ id: contact.id })}
        title="Delete Contact"
        message={`Are you sure you want to delete ${fullName}? This cannot be undone.`}
        confirmLabel="Delete"
        isDestructive
        isPending={deleteMutation.isPending}
      />

      {/* Add Task modal */}
      {orgId && (
        <Modal open={showAddTask} onClose={() => setShowAddTask(false)} title="Add Task" size="lg">
          <QuickTaskForm
            orgId={orgId}
            contactId={id}
            onSuccess={() => setShowAddTask(false)}
            onCancel={() => setShowAddTask(false)}
          />
        </Modal>
      )}
    </div>
  );
}
