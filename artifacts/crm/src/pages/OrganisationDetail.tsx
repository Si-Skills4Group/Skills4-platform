import { useState } from "react";
import { useRoute, Link } from "wouter";
import {
  Building2, ArrowLeft, Globe, Phone, MapPin, User2, Plus, Pencil, Trash2,
  Users, Handshake, CheckSquare, Tag, FileText, ChevronRight, CalendarClock, History,
} from "lucide-react";
import { ActivityFeed } from "@/components/ui/ActivityFeed";
import {
  useGetOrganisation,
  useUpdateOrganisation,
  useDeleteOrganisation,
  useListContacts,
  useCreateContact,
  useListEngagements,
  useCreateEngagement,
  useListTasks,
  useCreateTask,
  useListUsers,
} from "@workspace/api-client-react";
import type {
  Organisation,
  OrganisationType,
  OrganisationStatus,
  EngagementStage,
  EngagementStatus,
  TaskStatus,
  TaskPriority,
  PreferredContactMethod,
  CreateOrganisationRequest,
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
import { useLocation } from "wouter";

const ORG_TYPE_LABELS: Record<OrganisationType, string> = {
  employer: "Employer",
  training_provider: "Training Provider",
  partner: "Partner",
};

const ORG_STATUS_LABELS: Record<OrganisationStatus, string> = {
  prospect: "Prospect",
  active: "Active",
  dormant: "Dormant",
  closed: "Closed",
};

const STATUS_BADGE_VARIANTS: Record<OrganisationStatus, "success" | "warning" | "secondary" | "destructive"> = {
  active: "success",
  prospect: "warning",
  dormant: "secondary",
  closed: "destructive",
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

const SECTORS = [
  "Technology & Digital", "Manufacturing", "Energy & Utilities", "Retail & Hospitality",
  "Health & Social Care", "Education & Training", "Finance & Professional Services",
  "Construction & Infrastructure", "Creative & Media", "Public Sector & Charity",
  "Transport & Logistics", "Agriculture & Environment",
];

// --- Org Edit Form ---
type OrgFormState = {
  name: string; type: OrganisationType; sector: string; region: string;
  status: OrganisationStatus; ownerUserId: string; website: string; phone: string; notes: string;
};

function orgToFormState(org: Organisation): OrgFormState {
  return {
    name: org.name, type: org.type, sector: org.sector, region: org.region ?? "",
    status: org.status, ownerUserId: org.ownerUserId?.toString() ?? "",
    website: org.website ?? "", phone: org.phone ?? "", notes: org.notes ?? "",
  };
}

function OrgEditForm({ initial, onSubmit, onCancel, isPending }: {
  initial: OrgFormState; onSubmit: (d: OrgFormState) => void; onCancel: () => void; isPending: boolean;
}) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof OrgFormState, string>>>({});
  const { data: users = [] } = useListUsers();
  const set = (k: keyof OrgFormState, v: string) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })); };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Partial<Record<keyof OrgFormState, string>> = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.sector.trim()) errs.sector = "Sector is required";
    setErrors(errs);
    if (!Object.keys(errs).length) onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Name *</Label>
          <Input value={form.name} onChange={e => set("name", e.target.value)} className={errors.name ? "border-destructive" : ""} />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Type *</Label>
          <Select value={form.type} onValueChange={v => set("type", v as OrganisationType)}>
            <SelectOption value="employer">Employer</SelectOption>
            <SelectOption value="training_provider">Training Provider</SelectOption>
            <SelectOption value="partner">Partner</SelectOption>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Status *</Label>
          <Select value={form.status} onValueChange={v => set("status", v as OrganisationStatus)}>
            <SelectOption value="prospect">Prospect</SelectOption>
            <SelectOption value="active">Active</SelectOption>
            <SelectOption value="dormant">Dormant</SelectOption>
            <SelectOption value="closed">Closed</SelectOption>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Sector *</Label>
          <Input value={form.sector} list="sector-list-edit" onChange={e => set("sector", e.target.value)} className={errors.sector ? "border-destructive" : ""} />
          <datalist id="sector-list-edit">{SECTORS.map(s => <option key={s} value={s} />)}</datalist>
          {errors.sector && <p className="text-xs text-destructive">{errors.sector}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Region</Label>
          <Input value={form.region} onChange={e => set("region", e.target.value)} placeholder="e.g. Greater Manchester" />
        </div>
        <div className="space-y-1.5">
          <Label>Account Owner</Label>
          <Select value={form.ownerUserId} onValueChange={v => set("ownerUserId", v)}>
            <SelectOption value="">— Unassigned —</SelectOption>
            {users.map(u => <SelectOption key={u.id} value={u.id.toString()}>{u.fullName}</SelectOption>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Phone</Label>
          <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="+44 161 000 0000" />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Website</Label>
          <Input value={form.website} onChange={e => set("website", e.target.value)} placeholder="https://" />
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

// --- Quick Contact Form ---
function QuickContactForm({ orgId, onSuccess, onCancel }: { orgId: number; onSuccess: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({ firstName: "", lastName: "", jobTitle: "", email: "", phone: "", preferredContactMethod: "email" as PreferredContactMethod, notes: "" });
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const queryClient = useQueryClient();

  const mutation = useCreateContact({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
        queryClient.invalidateQueries({ queryKey: ["/api/organisations"] });
        onSuccess();
      },
    },
  });

  const set = (k: keyof typeof form, v: string) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: undefined })); };

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Partial<typeof form> = {};
    if (!form.firstName.trim()) errs.firstName = "First name is required";
    if (!form.lastName.trim()) errs.lastName = "Last name is required";
    setErrors(errs);
    if (!Object.keys(errs).length) {
      mutation.mutate({
        data: {
          firstName: form.firstName, lastName: form.lastName,
          jobTitle: form.jobTitle || null, email: form.email || null,
          phone: form.phone || null, preferredContactMethod: form.preferredContactMethod,
          organisationId: orgId, notes: form.notes || null,
        },
      });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
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
          <Label>Job Title</Label>
          <Input value={form.jobTitle} onChange={e => set("jobTitle", e.target.value)} placeholder="e.g. HR Manager" />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Phone</Label>
          <Input value={form.phone} onChange={e => set("phone", e.target.value)} />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Preferred Contact</Label>
          <Select value={form.preferredContactMethod} onValueChange={v => set("preferredContactMethod", v as PreferredContactMethod)}>
            <SelectOption value="email">Email</SelectOption>
            <SelectOption value="phone">Phone</SelectOption>
            <SelectOption value="post">Post</SelectOption>
            <SelectOption value="no_preference">No Preference</SelectOption>
          </Select>
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} className="min-h-[80px]" />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Saving…" : "Add Contact"}</Button>
      </div>
    </form>
  );
}

// --- Quick Engagement Form ---
function QuickEngagementForm({ orgId, onSuccess, onCancel }: { orgId: number; onSuccess: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({ title: "", stage: "lead" as EngagementStage, status: "open" as EngagementStatus, expectedValue: "", expectedLearnerVolume: "", nextActionDate: "", nextActionNote: "", notes: "" });
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const queryClient = useQueryClient();

  const mutation = useCreateEngagement({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/engagements"] });
        queryClient.invalidateQueries({ queryKey: ["/api/organisations"] });
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
          title: form.title, stage: form.stage, status: form.status,
          organisationId: orgId,
          expectedValue: form.expectedValue ? parseFloat(form.expectedValue) : null,
          expectedLearnerVolume: form.expectedLearnerVolume ? parseInt(form.expectedLearnerVolume) : null,
          nextActionDate: form.nextActionDate || null,
          nextActionNote: form.nextActionNote || null,
          notes: form.notes || null,
        },
      });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Title *</Label>
          <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Apprenticeship Partnership 2026" className={errors.title ? "border-destructive" : ""} />
          {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Stage</Label>
          <Select value={form.stage} onValueChange={v => set("stage", v as EngagementStage)}>
            <SelectOption value="lead">Lead</SelectOption>
            <SelectOption value="contacted">Contacted</SelectOption>
            <SelectOption value="meeting_booked">Meeting Booked</SelectOption>
            <SelectOption value="proposal">Proposal</SelectOption>
            <SelectOption value="active">Active</SelectOption>
            <SelectOption value="won">Won</SelectOption>
            <SelectOption value="dormant">Dormant</SelectOption>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={v => set("status", v as EngagementStatus)}>
            <SelectOption value="open">Open</SelectOption>
            <SelectOption value="on_hold">On Hold</SelectOption>
            <SelectOption value="closed_won">Closed Won</SelectOption>
            <SelectOption value="closed_lost">Closed Lost</SelectOption>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Expected Value (£)</Label>
          <Input type="number" min="0" value={form.expectedValue} onChange={e => set("expectedValue", e.target.value)} placeholder="0" />
        </div>
        <div className="space-y-1.5">
          <Label>Expected Learner Volume</Label>
          <Input type="number" min="0" value={form.expectedLearnerVolume} onChange={e => set("expectedLearnerVolume", e.target.value)} placeholder="0" />
        </div>
        <div className="space-y-1.5">
          <Label>Next Action Date</Label>
          <Input type="date" value={form.nextActionDate} onChange={e => set("nextActionDate", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Next Action</Label>
          <Input value={form.nextActionNote} onChange={e => set("nextActionNote", e.target.value)} placeholder="e.g. Send proposal" />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} className="min-h-[80px]" />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={mutation.isPending}>{mutation.isPending ? "Saving…" : "Add Engagement"}</Button>
      </div>
    </form>
  );
}

// --- Quick Task Form ---
function QuickTaskForm({ orgId, onSuccess, onCancel }: { orgId: number; onSuccess: () => void; onCancel: () => void }) {
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

// --- Main Detail Page ---
export default function OrganisationDetail() {
  const [, params] = useRoute("/organisations/:id");
  const id = params?.id ? parseInt(params.id, 10) : 0;
  const [, navigate] = useLocation();

  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [showAddEngagement, setShowAddEngagement] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);

  const queryClient = useQueryClient();
  const { canEdit, canDelete, canCreate } = usePermissions();

  const { data: org, isLoading } = useGetOrganisation(id, { query: { enabled: !!id } });
  const { data: contacts = [] } = useListContacts({ organisationId: id }, { query: { enabled: !!id } });
  const { data: engagements = [] } = useListEngagements({ organisationId: id }, { query: { enabled: !!id } });
  const { data: tasks = [] } = useListTasks({ organisationId: id }, { query: { enabled: !!id } });

  const updateMutation = useUpdateOrganisation({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/organisations"] });
        setShowEdit(false);
      },
    },
  });

  const deleteMutation = useDeleteOrganisation({
    mutation: {
      onSuccess: () => navigate("/organisations"),
    },
  });

  function handleUpdate(form: {
    name: string; type: OrganisationType; sector: string; region: string;
    status: OrganisationStatus; ownerUserId: string; website: string; phone: string; notes: string;
  }) {
    if (!org) return;
    updateMutation.mutate({
      id: org.id,
      data: {
        name: form.name, type: form.type, sector: form.sector, status: form.status,
        region: form.region || null, ownerUserId: form.ownerUserId ? parseInt(form.ownerUserId) : null,
        website: form.website || null, phone: form.phone || null, notes: form.notes || null,
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

  if (!org) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <Building2 size={48} className="text-muted-foreground" />
        <h2 className="text-xl font-semibold">Organisation not found</h2>
        <Link href="/organisations"><Button variant="outline"><ArrowLeft size={16} className="mr-2" />Back to list</Button></Link>
      </div>
    );
  }

  const openTasks = tasks.filter(t => t.status !== "completed");
  const completedTasks = tasks.filter(t => t.status === "completed");

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      {/* Breadcrumb */}
      <Link href="/organisations" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors gap-1.5">
        <ArrowLeft size={14} /> Organisations
      </Link>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center text-xl font-bold shrink-0">
            {formatInitials(org.name)}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-display font-bold text-foreground">{org.name}</h1>
              <Badge variant={STATUS_BADGE_VARIANTS[org.status]} className="text-sm px-3">
                {ORG_STATUS_LABELS[org.status]}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-2 text-sm">
              <span className="flex items-center gap-1"><Tag size={13} />{ORG_TYPE_LABELS[org.type]}</span>
              <span className="text-border">•</span>
              <span>{org.sector}</span>
              {org.region && <><span className="text-border">•</span><span className="flex items-center gap-1"><MapPin size={13} />{org.region}</span></>}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {canCreate && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowAddEngagement(true)}>
              <Plus size={14} /> Engagement
            </Button>
          )}
          {canEdit && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowEdit(true)}>
              <Pencil size={14} /> Edit
            </Button>
          )}
          {canDelete && (
            <Button variant="outline" size="sm" className="gap-1.5 text-destructive hover:bg-destructive/10 border-destructive/30" onClick={() => setShowDelete(true)}>
              <Trash2 size={14} /> Delete
            </Button>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Contacts", value: org.contactCount, icon: <Users size={16} className="text-primary" /> },
          { label: "Engagements", value: org.engagementCount, icon: <Handshake size={16} className="text-primary" /> },
          { label: "Open Tasks", value: openTasks.length, icon: <CheckSquare size={16} className="text-amber-600" /> },
          { label: "Completed Tasks", value: completedTasks.length, icon: <CheckSquare size={16} className="text-emerald-600" /> },
        ].map(stat => (
          <Card key={stat.label} className="p-4 flex items-center gap-3 shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">{stat.icon}</div>
            <div>
              <p className="text-2xl font-bold font-display">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Key Info */}
        <div className="space-y-4">
          <Card className="shadow-sm">
            <div className="px-5 py-4 border-b">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Organisation Details</h3>
            </div>
            <CardContent className="p-5 space-y-4">
              {[
                { icon: <Tag size={15} className="text-muted-foreground" />, label: "Type", value: ORG_TYPE_LABELS[org.type] },
                { icon: <Building2 size={15} className="text-muted-foreground" />, label: "Sector", value: org.sector },
                { icon: <MapPin size={15} className="text-muted-foreground" />, label: "Region", value: org.region ?? "—" },
                { icon: <User2 size={15} className="text-muted-foreground" />, label: "Owner", value: org.ownerName ?? "Unassigned" },
                { icon: <Phone size={15} className="text-muted-foreground" />, label: "Phone", value: org.phone ?? "—" },
                {
                  icon: <Globe size={15} className="text-muted-foreground" />, label: "Website",
                  value: org.website ? (
                    <a href={org.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate block">
                      {org.website.replace(/^https?:\/\//, "")}
                    </a>
                  ) : "—",
                },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0">{item.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{item.label}</p>
                    <div className="text-sm font-medium mt-0.5">{item.value}</div>
                  </div>
                </div>
              ))}

              <div className="pt-3 border-t grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Created</p>
                  <p className="text-sm">{formatDate(org.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Last updated</p>
                  <p className="text-sm">{formatDate(org.updatedAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {org.notes && (
            <Card className="shadow-sm">
              <div className="px-5 py-4 border-b flex items-center gap-2">
                <FileText size={14} className="text-muted-foreground" />
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Notes</h3>
              </div>
              <CardContent className="p-5">
                <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{org.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Linked Records */}
        <div className="lg:col-span-2 space-y-6">
          {/* Engagements */}
          <Card className="shadow-sm">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Handshake size={16} className="text-muted-foreground" />
                <h3 className="font-display font-bold text-lg">Engagements</h3>
                <span className="text-xs bg-muted rounded-full px-2 py-0.5 font-medium">{engagements.length}</span>
              </div>
              {canCreate && (
                <Button variant="ghost" size="sm" className="h-8 gap-1 text-primary" onClick={() => setShowAddEngagement(true)}>
                  <Plus size={14} /> Add
                </Button>
              )}
            </div>
            {engagements.length === 0 ? (
              <div className="py-10 flex flex-col items-center gap-2 text-center px-6">
                <Handshake size={32} className="text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No engagements yet.</p>
                {canCreate && <Button size="sm" variant="outline" className="mt-1 gap-1" onClick={() => setShowAddEngagement(true)}><Plus size={13} /> Add Engagement</Button>}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50/50">
                      <th className="text-left px-6 py-3 font-medium text-muted-foreground">Title</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Stage</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Value</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Next Action</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {engagements.map(eng => (
                      <tr key={eng.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-3 font-medium">
                          <Link href={`/engagements/${eng.id}`} className="hover:text-primary transition-colors hover:underline">
                            {eng.title}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={STAGE_VARIANT[eng.stage]}>{STAGE_LABELS[eng.stage]}</Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{formatCurrency(eng.expectedValue)}</td>
                        <td className="px-4 py-3">
                          {eng.nextActionDate ? (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <CalendarClock size={12} />{formatDate(eng.nextActionDate)}
                            </span>
                          ) : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/engagements/${eng.id}`} className="text-muted-foreground hover:text-foreground">
                            <ChevronRight size={16} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Contacts */}
          <Card className="shadow-sm">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-muted-foreground" />
                <h3 className="font-display font-bold text-lg">Contacts</h3>
                <span className="text-xs bg-muted rounded-full px-2 py-0.5 font-medium">{contacts.length}</span>
              </div>
              {canCreate && (
                <Button variant="ghost" size="sm" className="h-8 gap-1 text-primary" onClick={() => setShowAddContact(true)}>
                  <Plus size={14} /> Add
                </Button>
              )}
            </div>
            {contacts.length === 0 ? (
              <div className="py-10 flex flex-col items-center gap-2 text-center px-6">
                <Users size={32} className="text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No contacts linked yet.</p>
                {canCreate && <Button size="sm" variant="outline" className="mt-1 gap-1" onClick={() => setShowAddContact(true)}><Plus size={13} /> Add Contact</Button>}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50/50">
                      <th className="text-left px-6 py-3 font-medium text-muted-foreground">Name</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Job Title</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Email</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Phone</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.map(c => (
                      <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-3">
                          <Link href={`/contacts/${c.id}`} className="font-medium hover:text-primary hover:underline flex items-center gap-2">
                            <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                              {formatInitials(`${c.firstName} ${c.lastName}`)}
                            </span>
                            {c.firstName} {c.lastName}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{c.jobTitle ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{c.email ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{c.phone ?? "—"}</td>
                        <td className="px-4 py-3 text-right">
                          <Link href={`/contacts/${c.id}`} className="text-muted-foreground hover:text-foreground">
                            <ChevronRight size={16} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Activity Feed */}
          <Card className="shadow-sm">
            <div className="px-6 py-4 border-b flex items-center gap-2">
              <History size={16} className="text-muted-foreground" />
              <h3 className="font-display font-bold text-lg">Activity</h3>
            </div>
            <ActivityFeed entityType="organisation" entityId={org.id} />
          </Card>

          {/* Tasks */}
          <Card className="shadow-sm">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare size={16} className="text-muted-foreground" />
                <h3 className="font-display font-bold text-lg">Tasks</h3>
                <span className="text-xs bg-muted rounded-full px-2 py-0.5 font-medium">{tasks.length}</span>
              </div>
              {canCreate && (
                <Button variant="ghost" size="sm" className="h-8 gap-1 text-primary" onClick={() => setShowAddTask(true)}>
                  <Plus size={14} /> Add
                </Button>
              )}
            </div>
            {tasks.length === 0 ? (
              <div className="py-10 flex flex-col items-center gap-2 text-center px-6">
                <CheckSquare size={32} className="text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">No tasks yet.</p>
                {canCreate && <Button size="sm" variant="outline" className="mt-1 gap-1" onClick={() => setShowAddTask(true)}><Plus size={13} /> Add Task</Button>}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50/50">
                      <th className="text-left px-6 py-3 font-medium text-muted-foreground">Task</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Priority</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Due</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Assigned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map(t => (
                      <tr key={t.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-3 font-medium">{t.title}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold ${t.priority === "high" ? "text-destructive" : t.priority === "medium" ? "text-amber-600" : "text-muted-foreground"}`}>
                            {PRIORITY_LABELS[t.priority]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={TASK_STATUS_VARIANT[t.status]}>{TASK_STATUS_LABELS[t.status]}</Badge>
                        </td>
                        <td className={`px-4 py-3 ${t.dueDate && isOverdue(t.dueDate) && t.status !== "completed" ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                          {formatDate(t.dueDate)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{t.assignedUserName ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Modals */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Organisation" size="lg">
        <OrgEditForm
          initial={orgToFormState(org)}
          onSubmit={handleUpdate}
          onCancel={() => setShowEdit(false)}
          isPending={updateMutation.isPending}
        />
      </Modal>

      <ConfirmModal
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={() => deleteMutation.mutate({ id: org.id })}
        title="Delete Organisation"
        message={`Are you sure you want to delete "${org.name}"? This action is permanent and cannot be undone.`}
        confirmLabel="Delete Organisation"
        isDestructive
        isPending={deleteMutation.isPending}
      />

      <Modal open={showAddContact} onClose={() => setShowAddContact(false)} title="Add Contact" description={`Linked to ${org.name}`} size="md">
        <QuickContactForm orgId={org.id} onSuccess={() => setShowAddContact(false)} onCancel={() => setShowAddContact(false)} />
      </Modal>

      <Modal open={showAddEngagement} onClose={() => setShowAddEngagement(false)} title="Add Engagement" description={`Linked to ${org.name}`} size="lg">
        <QuickEngagementForm orgId={org.id} onSuccess={() => setShowAddEngagement(false)} onCancel={() => setShowAddEngagement(false)} />
      </Modal>

      <Modal open={showAddTask} onClose={() => setShowAddTask(false)} title="Add Task" description={`Linked to ${org.name}`} size="md">
        <QuickTaskForm orgId={org.id} onSuccess={() => setShowAddTask(false)} onCancel={() => setShowAddTask(false)} />
      </Modal>
    </div>
  );
}
