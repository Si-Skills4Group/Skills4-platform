import { useState } from "react";
import { Plus, Search, Users, Mail, Phone, Building2, X, SlidersHorizontal } from "lucide-react";
import { Link } from "wouter";
import {
  useListContacts,
  useCreateContact,
  useUpdateContact,
  useDeleteContact,
  useListOrganisations,
} from "@workspace/api-client-react";
import type {
  Contact,
  PreferredContactMethod,
  CreateContactRequest,
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
import { formatInitials } from "@/lib/utils";

const CONTACT_METHOD_LABELS: Record<PreferredContactMethod, string> = {
  email: "Email",
  phone: "Phone",
  post: "Post",
  no_preference: "No Preference",
};

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

const DEFAULT_FORM: ContactFormState = {
  firstName: "",
  lastName: "",
  jobTitle: "",
  email: "",
  phone: "",
  preferredContactMethod: "email",
  organisationId: "",
  notes: "",
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

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function ContactForm({
  initial,
  onSubmit,
  onCancel,
  isPending,
  prefillOrgId,
}: {
  initial: ContactFormState;
  onSubmit: (data: ContactFormState) => void;
  onCancel: () => void;
  isPending: boolean;
  prefillOrgId?: string;
}) {
  const [form, setForm] = useState<ContactFormState>({ ...initial, organisationId: prefillOrgId ?? initial.organisationId });
  const [errors, setErrors] = useState<Partial<Record<keyof ContactFormState, string>>>({});
  const { data: orgs = [] } = useListOrganisations();

  const set = (field: keyof ContactFormState, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  function validate(): boolean {
    const errs: Partial<Record<keyof ContactFormState, string>> = {};
    if (!form.firstName.trim()) errs.firstName = "First name is required";
    if (!form.lastName.trim()) errs.lastName = "Last name is required";
    if (!form.organisationId) errs.organisationId = "Organisation is required";
    if (form.email && !isValidEmail(form.email)) errs.email = "Enter a valid email address";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (validate()) onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="c-first">First Name *</Label>
          <Input
            id="c-first"
            placeholder="e.g. Angela"
            value={form.firstName}
            onChange={(e) => set("firstName", e.target.value)}
            className={errors.firstName ? "border-destructive" : ""}
          />
          {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="c-last">Last Name *</Label>
          <Input
            id="c-last"
            placeholder="e.g. Thompson"
            value={form.lastName}
            onChange={(e) => set("lastName", e.target.value)}
            className={errors.lastName ? "border-destructive" : ""}
          />
          {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
        </div>

        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="c-org">Organisation *</Label>
          <Select
            id="c-org"
            value={form.organisationId}
            onValueChange={(v) => set("organisationId", v)}
          >
            <SelectOption value="">— Select Organisation —</SelectOption>
            {orgs.map((o) => (
              <SelectOption key={o.id} value={o.id.toString()}>{o.name}</SelectOption>
            ))}
          </Select>
          {errors.organisationId && <p className="text-xs text-destructive">{errors.organisationId}</p>}
        </div>

        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="c-title">Job Title</Label>
          <Input
            id="c-title"
            placeholder="e.g. Head of HR"
            value={form.jobTitle}
            onChange={(e) => set("jobTitle", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="c-email">Email</Label>
          <Input
            id="c-email"
            type="email"
            placeholder="name@company.com"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            className={errors.email ? "border-destructive" : ""}
          />
          {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="c-phone">Phone</Label>
          <Input
            id="c-phone"
            placeholder="07700 900 000"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
        </div>

        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="c-method">Preferred Contact Method</Label>
          <Select
            id="c-method"
            value={form.preferredContactMethod}
            onValueChange={(v) => set("preferredContactMethod", v as PreferredContactMethod)}
          >
            <SelectOption value="email">Email</SelectOption>
            <SelectOption value="phone">Phone</SelectOption>
            <SelectOption value="post">Post</SelectOption>
            <SelectOption value="no_preference">No Preference</SelectOption>
          </Select>
        </div>

        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="c-notes">Notes</Label>
          <Textarea
            id="c-notes"
            placeholder="Any additional context about this contact…"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            className="min-h-[90px]"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save Contact"}
        </Button>
      </div>
    </form>
  );
}

export default function Contacts() {
  const [search, setSearch] = useState("");
  const [orgFilter, setOrgFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [deleteContact, setDeleteContact] = useState<Contact | null>(null);

  const queryClient = useQueryClient();
  const { canCreate, canEdit, canDelete } = usePermissions();

  const { data: contacts = [], isLoading } = useListContacts({
    search: search || undefined,
    organisationId: orgFilter ? parseInt(orgFilter) : undefined,
  });

  const { data: orgs = [] } = useListOrganisations();

  const createMutation = useCreateContact({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
        queryClient.invalidateQueries({ queryKey: ["/api/organisations"] });
        setShowCreate(false);
      },
    },
  });

  const updateMutation = useUpdateContact({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
        setEditContact(null);
      },
    },
  });

  const deleteMutation = useDeleteContact({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/contacts"] });
        queryClient.invalidateQueries({ queryKey: ["/api/organisations"] });
        setDeleteContact(null);
      },
    },
  });

  function handleCreate(form: ContactFormState) {
    const req: CreateContactRequest = {
      firstName: form.firstName,
      lastName: form.lastName,
      jobTitle: form.jobTitle || null,
      email: form.email || null,
      phone: form.phone || null,
      preferredContactMethod: form.preferredContactMethod,
      organisationId: form.organisationId ? parseInt(form.organisationId) : null,
      notes: form.notes || null,
    };
    createMutation.mutate({ data: req });
  }

  function handleUpdate(form: ContactFormState) {
    if (!editContact) return;
    updateMutation.mutate({
      id: editContact.id,
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

  const activeFilterCount = [orgFilter].filter(Boolean).length;

  return (
    <div className="space-y-6 h-full flex flex-col animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex sm:items-center justify-between flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Contacts</h1>
          <p className="text-muted-foreground mt-1">
            People across all your partner organisations.
            {!isLoading && contacts.length > 0 && (
              <span className="ml-2 text-xs font-medium bg-muted rounded-full px-2 py-0.5">
                {contacts.length}
              </span>
            )}
          </p>
        </div>
        {canCreate && (
          <Button className="gap-2 shrink-0" onClick={() => setShowCreate(true)}>
            <Plus size={18} />
            Add Contact
          </Button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="flex gap-3 items-center">
          <div className="relative flex-1 bg-white rounded-xl border shadow-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by name, email or job title…"
              className="pl-9 border-0 shadow-none focus-visible:ring-0 bg-transparent"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setSearch("")}
              >
                <X size={14} />
              </button>
            )}
          </div>
          <Button
            variant="outline"
            className="gap-2 bg-white shrink-0"
            onClick={() => setShowFilters((v) => !v)}
          >
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
          <div className="bg-white rounded-xl border shadow-sm p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
              <div className="space-y-1.5">
                <Label className="text-xs">Organisation</Label>
                <Select value={orgFilter} onValueChange={setOrgFilter}>
                  <SelectOption value="">All Organisations</SelectOption>
                  {orgs.map((o) => (
                    <SelectOption key={o.id} value={o.id.toString()}>{o.name}</SelectOption>
                  ))}
                </Select>
              </div>
            </div>
            {activeFilterCount > 0 && (
              <button
                className="mt-3 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                onClick={() => setOrgFilter("")}
              >
                <X size={12} /> Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">
              {search || activeFilterCount ? "No results found" : "No contacts yet"}
            </h3>
            <p className="text-muted-foreground max-w-sm mt-2 text-sm">
              {search || activeFilterCount
                ? "Try adjusting your search or filters."
                : "Add contacts to start building your network."}
            </p>
            {canCreate && !search && !activeFilterCount && (
              <Button className="mt-6 gap-2" onClick={() => setShowCreate(true)}>
                <Plus size={18} /> Add Contact
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-auto flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Organisation</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Contact Via</TableHead>
                  {(canEdit || canDelete) && <TableHead className="w-24" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact) => (
                  <TableRow key={contact.id} className="group cursor-pointer relative hover:bg-muted/30">
                    <TableCell className="font-medium relative">
                      <Link href={`/contacts/${contact.id}`} className="absolute inset-0 z-10" />
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {formatInitials(`${contact.firstName} ${contact.lastName}`)}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {contact.firstName} {contact.lastName}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {contact.organisationName ? (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Building2 size={13} className="flex-shrink-0" />
                          {contact.organisationName}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {contact.jobTitle ?? "—"}
                    </TableCell>
                    <TableCell>
                      {contact.email ? (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Mail size={13} className="flex-shrink-0" />
                          <span className="truncate max-w-[180px]">{contact.email}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {contact.phone ? (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Phone size={13} className="flex-shrink-0" />
                          {contact.phone}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {contact.preferredContactMethod ? (
                        <Badge variant="outline">
                          {CONTACT_METHOD_LABELS[contact.preferredContactMethod]}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-sm">—</span>
                      )}
                    </TableCell>
                    {(canEdit || canDelete) && (
                      <TableCell className="relative z-20">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                          {canEdit && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs"
                              onClick={(e) => { e.stopPropagation(); setEditContact(contact); }}
                            >
                              Edit
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                              onClick={(e) => { e.stopPropagation(); setDeleteContact(contact); }}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Add Contact"
        description="Add a new contact linked to an organisation."
        size="lg"
      >
        <ContactForm
          initial={DEFAULT_FORM}
          onSubmit={handleCreate}
          onCancel={() => setShowCreate(false)}
          isPending={createMutation.isPending}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={!!editContact}
        onClose={() => setEditContact(null)}
        title="Edit Contact"
        size="lg"
      >
        {editContact && (
          <ContactForm
            initial={contactToFormState(editContact)}
            onSubmit={handleUpdate}
            onCancel={() => setEditContact(null)}
            isPending={updateMutation.isPending}
          />
        )}
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal
        open={!!deleteContact}
        onClose={() => setDeleteContact(null)}
        onConfirm={() => deleteContact && deleteMutation.mutate({ id: deleteContact.id })}
        title="Delete Contact"
        message={`Are you sure you want to delete ${deleteContact?.firstName} ${deleteContact?.lastName}? This cannot be undone.`}
        confirmLabel="Delete"
        isDestructive
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
