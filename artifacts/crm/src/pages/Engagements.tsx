import { useState } from "react";
import { Plus, LayoutGrid, List, Handshake } from "lucide-react";
import { useListEngagements } from "@workspace/api-client-react";
import { Button, Card, CardContent, Badge, Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/core-ui";
import { formatCurrency } from "@/lib/utils";

const STAGES = [
  "prospect",
  "initial_contact",
  "meeting_scheduled",
  "proposal_sent",
  "negotiation",
  "closed_won",
  "closed_lost"
];

const formatStage = (s: string) => s.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

export default function Engagements() {
  const [view, setView] = useState<"pipeline" | "table">("pipeline");
  const { data: engagements, isLoading } = useListEngagements();

  return (
    <div className="space-y-6 h-full flex flex-col animate-in fade-in duration-500">
      <div className="flex sm:items-center justify-between flex-col sm:flex-row gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Engagements</h1>
          <p className="text-muted-foreground mt-1">Track pipeline and opportunities.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-muted rounded-lg p-1 border">
            <button 
              onClick={() => setView("pipeline")}
              className={`p-1.5 rounded-md transition-all ${view === 'pipeline' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <LayoutGrid size={16} />
            </button>
            <button 
              onClick={() => setView("table")}
              className={`p-1.5 rounded-md transition-all ${view === 'table' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <List size={16} />
            </button>
          </div>
          <Button className="gap-2 shrink-0">
            <Plus size={18} />
            Add Engagement
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : !engagements?.length ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white rounded-xl border">
          <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mb-4">
            <Handshake className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No engagements yet</h3>
          <p className="text-muted-foreground max-w-sm mt-2">Start building your pipeline by adding a new engagement opportunity.</p>
          <Button className="mt-6 gap-2"><Plus size={18} /> Add Engagement</Button>
        </div>
      ) : view === "pipeline" ? (
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex gap-4 h-full min-w-max">
            {STAGES.map(stage => {
              const columnEngagements = engagements.filter(e => e.stage === stage);
              return (
                <div key={stage} className="w-80 flex flex-col shrink-0 bg-muted/30 rounded-2xl border p-4">
                  <div className="flex items-center justify-between mb-4 px-1">
                    <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">{formatStage(stage)}</h3>
                    <Badge variant="secondary" className="bg-white">{columnEngagements.length}</Badge>
                  </div>
                  <div className="flex-1 space-y-3 overflow-y-auto">
                    {columnEngagements.map(eng => (
                      <Card key={eng.id} className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all">
                        <CardContent className="p-4">
                          <h4 className="font-semibold leading-tight">{eng.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{eng.organisationName || 'Unknown Org'}</p>
                          <div className="flex items-center justify-between mt-4">
                            <Badge variant="outline" className="text-xs bg-muted/50 font-medium">
                              {eng.type.replace('_', ' ')}
                            </Badge>
                            {eng.value != null && (
                              <span className="text-sm font-semibold text-emerald-600">{formatCurrency(eng.value)}</span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-white rounded-xl border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Title</TableHead>
                <TableHead>Organisation</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right pr-6">Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {engagements.map(eng => (
                <TableRow key={eng.id} className="cursor-pointer">
                  <TableCell className="pl-6 font-medium text-primary hover:underline">{eng.title}</TableCell>
                  <TableCell className="text-muted-foreground">{eng.organisationName}</TableCell>
                  <TableCell><Badge variant="outline" className="bg-muted">{formatStage(eng.stage)}</Badge></TableCell>
                  <TableCell className="text-muted-foreground text-sm capitalize">{eng.type.replace('_', ' ')}</TableCell>
                  <TableCell className="text-right pr-6 font-medium">{eng.value ? formatCurrency(eng.value) : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
