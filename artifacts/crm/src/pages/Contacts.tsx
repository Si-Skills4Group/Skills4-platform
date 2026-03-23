import { useState } from "react";
import { Plus, Search, Users } from "lucide-react";
import { Link } from "wouter";
import { useListContacts } from "@workspace/api-client-react";
import { Button, Input, Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Badge } from "@/components/ui/core-ui";
import { formatInitials } from "@/lib/utils";

export default function Contacts() {
  const [search, setSearch] = useState("");
  const { data: contacts, isLoading } = useListContacts({ search: search || undefined });

  return (
    <div className="space-y-6 h-full flex flex-col animate-in fade-in duration-500">
      <div className="flex sm:items-center justify-between flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Contacts</h1>
          <p className="text-muted-foreground mt-1">People across all your partner organisations.</p>
        </div>
        <Button className="gap-2 shrink-0">
          <Plus size={18} />
          Add Contact
        </Button>
      </div>

      <div className="flex gap-4 items-center bg-white p-2 rounded-xl border shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input 
            placeholder="Search contacts by name or email..." 
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
        ) : !contacts?.length ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No contacts found</h3>
            <p className="text-muted-foreground max-w-sm mt-2">Add contacts to start building your network.</p>
            <Button className="mt-6 gap-2"><Plus size={18} /> Add Contact</Button>
          </div>
        ) : (
          <div className="overflow-auto flex-1">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Name</TableHead>
                  <TableHead>Organisation</TableHead>
                  <TableHead>Job Title</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact) => (
                  <TableRow key={contact.id} className="group cursor-pointer relative">
                    <TableCell className="font-medium pl-6">
                      <Link href={`/contacts/${contact.id}`} className="absolute inset-0 z-10" />
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                          {formatInitials(`${contact.firstName} ${contact.lastName}`)}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {contact.firstName} {contact.lastName}
                          </div>
                          <div className="text-xs text-muted-foreground font-normal">{contact.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{contact.organisationName || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{contact.jobTitle || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={contact.status === 'active' ? 'success' : 'secondary'}>
                        {contact.status}
                      </Badge>
                    </TableCell>
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
