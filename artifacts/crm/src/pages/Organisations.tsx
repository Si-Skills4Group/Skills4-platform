import { useState } from "react";
import { Plus, Search, Building2 } from "lucide-react";
import { Link } from "wouter";
import { useListOrganisations } from "@workspace/api-client-react";
import { 
  Button, 
  Input, 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
  Badge
} from "@/components/ui/core-ui";

export default function Organisations() {
  const [search, setSearch] = useState("");
  const { data: organisations, isLoading } = useListOrganisations({ search: search || undefined });

  return (
    <div className="space-y-6 h-full flex flex-col animate-in fade-in duration-500">
      <div className="flex sm:items-center justify-between flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Organisations</h1>
          <p className="text-muted-foreground mt-1">Manage employer partners and accounts.</p>
        </div>
        <Button className="gap-2 shrink-0">
          <Plus size={18} />
          Add Organisation
        </Button>
      </div>

      <div className="flex gap-4 items-center bg-white p-2 rounded-xl border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input 
            placeholder="Search organisations..." 
            className="pl-9 border-0 shadow-none focus-visible:ring-0 bg-transparent"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl border shadow-sm overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : !organisations?.length ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No organisations found</h3>
            <p className="text-muted-foreground max-w-sm mt-2">Get started by creating a new organisation to track your employer partnerships.</p>
            <Button className="mt-6 gap-2"><Plus size={18} /> Add Organisation</Button>
          </div>
        ) : (
          <div className="overflow-auto flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Contacts</TableHead>
                  <TableHead className="text-right">Engagements</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organisations.map((org) => (
                  <TableRow key={org.id} className="group cursor-pointer relative">
                    <TableCell className="font-medium">
                      <Link href={`/organisations/${org.id}`} className="absolute inset-0 z-10" />
                      {org.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{org.industry}</TableCell>
                    <TableCell>
                      <Badge variant={org.status === 'active' ? 'success' : org.status === 'prospect' ? 'warning' : 'secondary'}>
                        {org.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{org.contactCount}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{org.engagementCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
