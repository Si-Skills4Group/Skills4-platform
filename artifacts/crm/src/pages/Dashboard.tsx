import { Building2, Users, Handshake, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Badge } from "@/components/ui/core-ui";
import { useGetDashboardSummary } from "@workspace/api-client-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { formatCurrency } from "@/lib/utils";

export default function Dashboard() {
  const { data: summary, isLoading } = useGetDashboardSummary();

  if (isLoading || !summary) {
    return <div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  }

  const statCards = [
    { title: "Total Organisations", value: summary.totalOrganisations, icon: Building2, color: "text-blue-600", bg: "bg-blue-100" },
    { title: "Active Contacts", value: summary.totalContacts, icon: Users, color: "text-emerald-600", bg: "bg-emerald-100" },
    { title: "Open Engagements", value: summary.totalEngagements, icon: Handshake, color: "text-indigo-600", bg: "bg-indigo-100" },
    { title: "Overdue Tasks", value: summary.overdueTasks, icon: AlertCircle, color: "text-destructive", bg: "bg-destructive/10" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Here's what's happening with your employer partnerships today.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <Card key={i} className="border-border/50 hover:shadow-md transition-shadow">
            <CardContent className="p-6 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                <h3 className="text-2xl font-bold mt-1">{stat.value}</h3>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Engagement Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.engagementsByStage}>
                  <XAxis 
                    dataKey="stage" 
                    tickFormatter={(val) => val.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {summary.engagementsByStage.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill="hsl(var(--primary))" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 flex flex-col">
          <CardHeader>
            <CardTitle>Upcoming Tasks</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto pr-2">
            <div className="space-y-4">
              {summary.upcomingTasks.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-8">No upcoming tasks</p>
              ) : (
                summary.upcomingTasks.map(task => (
                  <div key={task.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors border border-transparent hover:border-border/50">
                    <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${task.priority === 'urgent' ? 'bg-destructive' : task.priority === 'high' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                    <div>
                      <p className="text-sm font-medium leading-tight">{task.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {task.organisationName || 'Internal'} • {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No date'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
