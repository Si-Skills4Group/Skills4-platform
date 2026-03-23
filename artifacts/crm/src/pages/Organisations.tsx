import { useState } from "react";
import { Plus, Search, Building2, Globe, Phone, ChevronDown, X, SlidersHorizontal } from "lucide-react";
import { Link } from "wouter";
import {
  useListOrganisations,
  useCreateOrganisation,
  useUpdateOrganisation,
  useDeleteOrganisation,
  useListUsers,
} from "@workspace/api-client-react";
import type {
  Organisation,
  OrganisationType,
  OrganisationStatus,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Card,
  CardContent,
} from "@/components/ui/core-ui";
import { Modal, ConfirmModal } from "@/components/ui/Modal";
import { usePermissions } from "@/hooks/usePermissions";
import { formatInitials } from "@/lib/utils";

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

const SECTORS = [
  "Technology & Digital",
  "Manufacturing",
  "Energy & Utilities",
  "Retail & Hospitality",
  "Health & Social Care",
  "Education & Training",
  "Finance & Professional Services",
  "Construction & Infrastructure",
  "Creative & Media",
  "Public Sector & Charity",
  "Transport & Logistics",
  "Agriculture & Environment",
];

type OrgFormState = {
  name: string;
  type: OrganisationType;
  sector: string;
  region: string;
  status: OrganisationStatus;
  ownerUserId: string;
  website: string;
  phone: string;
  notes: string;
};

const DEFAULT_FORM: OrgFormState = {
  name: "",
  type: "employer",
  sector: "",
  region: "",
  status: "prospect",
  ownerUserId: "",
  website: "",
  phone: "",
  notes: "",
};

function orgToFormState(org: Organisation): OrgFormState {
  return {
    name: org.name,
    type: org.type,
    sector: org.sector,
    region: org.region ?? "",
    status: org.status,
    ownerUserId: org.ownerUserId?.toString() ?? "",
    website: org.website ?? "",
    phone: org.phone ?? "",
    notes: org.notes ?? "",
  };
}

function OrgForm({
  initial,
  onSubmit,
  onCancel,
  isPending,
}: {
  initial: OrgFormState;
  onSubmit: (data: OrgFormState) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const [form, setForm] = useState<OrgFormState>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof OrgFormState, string>>>({});
  const { data: users = [] } = useListUsers();

  const set = (field: keyof OrgFormState, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  function validate(): boolean {
    const errs: Partial<Record<keyof OrgFormState, string>> = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.sector.trim()) errs.sector = "Sector is required";
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
        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="org-name">Organisation Name *</Label>
          <Input
            id="org-name"
            placeholder="e.g. Acme Manufacturing Ltd"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className={errors.name ? "border-destructive" : ""}
          />
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="org-type">Type *</Label>
          <Select id="org-type" value={form.type} onValueChange={(v) => set("type", v as OrganisationType)}>
            <SelectOption value="employer">Employer</SelectOption>
            <SelectOption value="training_provider">Training Provider</SelectOption>
            <SelectOption value="partner">Partner</SelectOption>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="org-status">Status *</Label>
          <Select id="org-status" value={form.status} onValueChange={(v) => set("status", v as OrganisationStatus)}>
            <SelectOption value="prospect">Prospect</SelectOption>
            <SelectOption value="active">Active</SelectOption>
            <SelectOption value="dormant">Dormant</SelectOption>
            <SelectOption value="closed">Closed</SelectOption>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="org-sector">Sector *</Label>
          <Input
            id="org-sector"
            placeholder="e.g. Manufacturing"
            list="sector-list"
            value={form.sector}
            onChange={(e) => set("sector", e.target.value)}
            className={errors.sector ? "border-destructive" : ""}
          />
          <datalist id="sector-list">
            {SECTORS.map((s) => <option key={s} value={s} />)}
          </datalist>
          {errors.sector && <p className="text-xs text-destructive">{errors.sector}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="org-region">Region</Label>
          <Input
            id="org-region"
            placeholder="e.g. Greater Manchester"
            value={form.region}
            onChange={(e) => set("region", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="org-owner">Account Owner</Label>
          <Select id="org-owner" value={form.ownerUserId} onValueChange={(v) => set("ownerUserId", v)}>
            <SelectOption value="">— Unassigned —</SelectOption>
            {users.map((u) => (
              <SelectOption key={u.id} value={u.id.toString()}>{u.fullName}</SelectOption>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="org-phone">Phone</Label>
          <Input
            id="org-phone"
            placeholder="+44 161 000 0000"
            value={form.phone}
            onChange={(e) => set("phone", e.target.value)}
          />
        </div>

        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="org-website">Website</Label>
          <Input
            id="org-website"
            placeholder="https://example.com"
            value={form.website}
            onChange={(e) => set("website", e.target.value)}
          />
        </div>

        <div className="sm:col-span-2 space-y-1.5">
          <Label htmlFor="org-notes">Notes</Label>
          <Textarea
            id="org-notes"
            placeholder="Any additional context about this organisation…"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            className="min-h-[100px]"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving…" : "Save Organisation"}
        </Button>
      </div>
    </form>
  );
}

export default function Organisations() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sectorFilter, setSectorFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [editOrg, setEditOrg] = useState<Organisation | null>(null);
  const [deleteOrg, setDeleteOrg] = useState<Organisation | null>(null);

  const queryClient = useQueryClient();
  const { canCreate, canEdit, canDelete } = usePermissions();

  const { data: organisations = [], isLoading } = useListOrganisations({
    search: search || undefined,
    type: typeFilter || undefined,
    status: statusFilter || undefined,
    sector: sectorFilter || undefined,
  });

  const { data: users = [] } = useListUsers();

  const createMutation = useCreateOrganisation({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/organisations"] });
        setShowCreate(false);
      },
    },
  });

  const updateMutation = useUpdateOrganisation({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/organisations"] });
        setEditOrg(null);
      },
    },
  });

  const deleteMutation = useDeleteOrganisation({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/organisations"] });
        setDeleteOrg(null);
      },
    },
  });

  function handleCreate(form: OrgFormState) {
    const req: CreateOrganisationRequest = {
      name: form.name,
      type: form.type,
      sector: form.sector,
      status: form.status,
      region: form.region || null,
      ownerUserId: form.ownerUserId ? parseInt(form.ownerUserId) : null,
      website: form.website || null,
      phone: form.phone || null,
      notes: form.notes || null,
    };
    createMutation.mutate({ data: req });
  }

  function handleUpdate(form: OrgFormState) {
    if (!editOrg) return;
    const req = {
      name: form.name,
      type: form.type,
      sector: form.sector,
      status: form.status,
      region: form.region || null,
      ownerUserId: form.ownerUserId ? parseInt(form.ownerUserId) : null,
      website: form.website || null,
      phone: form.phone || null,
      notes: form.notes || null,
    };
    updateMutation.mutate({ id: editOrg.id, data: req });
  }

  const activeFilterCount = [typeFilter, statusFilter, sectorFilter].filter(Boolean).length;

  return (
    <div className="space-y-6 h-full flex flex-col animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex sm:items-center justify-between flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Organisations</h1>
          <p className="text-muted-foreground mt-1">
            Manage employer partners and accounts.
            {!isLoading && organisations.length > 0 && (
              <span className="ml-2 text-xs font-medium bg-muted rounded-full px-2 py-0.5">{organisations.length}</span>
            )}
          </p>
        </div>
        {canCreate && (
          <Button className="gap-2 shrink-0" onClick={() => setShowCreate(true)}>
            <Plus size={18} />
            Add Organisation
          </Button>
        )}
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="flex gap-3 items-center">
          <div className="relative flex-1 bg-white rounded-xl border shadow-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search organisations…"
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Type</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectOption value="">All Types</SelectOption>
                  <SelectOption value="employer">Employer</SelectOption>
                  <SelectOption value="training_provider">Training Provider</SelectOption>
                  <SelectOption value="partner">Partner</SelectOption>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectOption value="">All Statuses</SelectOption>
                  <SelectOption value="prospect">Prospect</SelectOption>
                  <SelectOption value="active">Active</SelectOption>
                  <SelectOption value="dormant">Dormant</SelectOption>
                  <SelectOption value="closed">Closed</SelectOption>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Sector</Label>
                <Input
                  placeholder="Filter by sector…"
                  value={sectorFilter}
                  onChange={(e) => setSectorFilter(e.target.value)}
                />
              </div>
            </div>
            {activeFilterCount > 0 && (
              <button
                className="mt-3 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                onClick={() => { setTypeFilter(""); setStatusFilter(""); setSectorFilter(""); }}
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
        ) : organisations.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">
              {search || activeFilterCount ? "No results found" : "No organisations yet"}
            </h3>
            <p className="text-muted-foreground max-w-sm mt-2 text-sm">
              {search || activeFilterCount
                ? "Try adjusting your search or filters."
                : "Get started by adding your first employer or partner."}
            </p>
            {canCreate && !search && !activeFilterCount && (
              <Button className="mt-6 gap-2" onClick={() => setShowCreate(true)}>
                <Plus size={18} /> Add Organisation
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-auto flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Sector</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead className="text-right">Contacts</TableHead>
                  <TableHead className="text-right">Engagements</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organisations.map((org) => (
                  <TableRow key={org.id} className="group cursor-pointer relative hover:bg-muted/30">
                    <TableCell className="font-medium relative">
                      <Link href={`/organisations/${org.id}`} className="absolute inset-0 z-10" />
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                          {formatInitials(org.name)}
                        </div>
                        <span className="group-hover:text-primary transition-colors">{org.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {ORG_TYPE_LABELS[org.type]}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{org.sector}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{org.region ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE_VARIANTS[org.status]}>
                        {ORG_STATUS_LABELS[org.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{org.ownerName ?? "—"}</TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm font-medium">{org.contactCount}</TableCell>
                    <TableCell className="text-right text-muted-foreground text-sm font-medium">{org.engagementCount}</TableCell>
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
        title="Add Organisation"
        description="Create a new employer, training provider, or partner."
        size="lg"
      >
        <OrgForm
          initial={DEFAULT_FORM}
          onSubmit={handleCreate}
          onCancel={() => setShowCreate(false)}
          isPending={createMutation.isPending}
        />
      </Modal>

      {/* Edit Modal */}
      <Modal
        open={!!editOrg}
        onClose={() => setEditOrg(null)}
        title="Edit Organisation"
        size="lg"
      >
        {editOrg && (
          <OrgForm
            initial={orgToFormState(editOrg)}
            onSubmit={handleUpdate}
            onCancel={() => setEditOrg(null)}
            isPending={updateMutation.isPending}
          />
        )}
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal
        open={!!deleteOrg}
        onClose={() => setDeleteOrg(null)}
        onConfirm={() => deleteOrg && deleteMutation.mutate({ id: deleteOrg.id })}
        title="Delete Organisation"
        message={`Are you sure you want to delete "${deleteOrg?.name}"? This action cannot be undone and will remove all linked data.`}
        confirmLabel="Delete"
        isDestructive
        isPending={deleteMutation.isPending}
      />
    </div>
  );
}
