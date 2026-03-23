import { useRoute } from "wouter";
import { Building2, Globe, MapPin, Mail, Phone, ArrowLeft, Plus } from "lucide-react";
import { Link } from "wouter";
import { useGetOrganisation, useListContacts, useListEngagements } from "@workspace/api-client-react";
import { Button, Badge, Card, CardContent, Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/core-ui";
import { formatCurrency } from "@/lib/utils";

export default function OrganisationDetail() {
  const [, params] = useRoute("/organisations/:id");
  const id = params?.id ? parseInt(params.id, 10) : 0;
  
  const { data: org, isLoading } = useGetOrganisation(id, { query: { enabled: !!id } });
  const { data: contacts } = useListContacts({ organisationId: id }, { query: { enabled: !!id } });
  const { data: engagements } = useListEngagements({ organisationId: id }, { query: { enabled: !!id } });

  if (isLoading || !org) {
    return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div>
        <Link href="/organisations" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft size={16} className="mr-1" /> Back to Organisations
        </Link>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center shrink-0">
              <Building2 size={32} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-display font-bold text-foreground">{org.name}</h1>
                <Badge variant={org.status === 'active' ? 'success' : org.status === 'prospect' ? 'warning' : 'secondary'} className="text-sm px-3">
                  {org.status}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-1 flex items-center gap-2">
                {org.industry} • <Globe size={14} /> {org.website || 'No website'}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">Edit Details</Button>
            <Button>Add Engagement</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1 shadow-sm h-fit">
          <CardContent className="p-6 space-y-6">
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-4">Contact Info</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <MapPin size={16} className="text-muted-foreground shrink-0 mt-0.5" />
                  <span>{org.address ? `${org.address}, ${org.city}, ${org.country}` : 'No address provided'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone size={16} className="text-muted-foreground shrink-0" />
                  <span>{org.phone || 'No phone'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail size={16} className="text-muted-foreground shrink-0" />
                  <span>{org.email || 'No general email'}</span>
                </div>
              </div>
            </div>
            {org.notes && (
              <div className="pt-6 border-t">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2">Notes</h3>
                <p className="text-sm text-foreground/80 whitespace-pre-wrap">{org.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="col-span-1 md:col-span-2 space-y-6">
          <Card className="shadow-sm">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="font-display font-bold text-lg">Active Engagements</h3>
              <Button variant="ghost" size="sm" className="h-8 gap-1 text-primary"><Plus size={14}/> Add</Button>
            </div>
            <div className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Title</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead>Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!engagements?.length ? (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No engagements found.</TableCell></TableRow>
                  ) : (
                    engagements.map(eng => (
                      <TableRow key={eng.id}>
                        <TableCell className="pl-6 font-medium">{eng.title}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-muted">{eng.stage.replace('_', ' ')}</Badge>
                        </TableCell>
                        <TableCell>{formatCurrency(eng.value)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>

          <Card className="shadow-sm">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="font-display font-bold text-lg">Key Contacts</h3>
              <Button variant="ghost" size="sm" className="h-8 gap-1 text-primary"><Plus size={14}/> Add</Button>
            </div>
            <div className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Name</TableHead>
                    <TableHead>Job Title</TableHead>
                    <TableHead>Email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!contacts?.length ? (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No contacts found.</TableCell></TableRow>
                  ) : (
                    contacts.map(contact => (
                      <TableRow key={contact.id}>
                        <TableCell className="pl-6 font-medium">
                          <Link href={`/contacts/${contact.id}`} className="hover:underline text-primary">
                            {contact.firstName} {contact.lastName}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{contact.jobTitle}</TableCell>
                        <TableCell className="text-muted-foreground">{contact.email}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
