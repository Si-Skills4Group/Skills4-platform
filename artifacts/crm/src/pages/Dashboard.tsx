import {
  Building2, Handshake, AlertCircle, Trophy,
  CheckSquare, CalendarClock, ArrowRight, Clock, TrendingUp,
} from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/core-ui";
import { useGetDashboardSummary } from "@workspace/api-client-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend,
} from "recharts";
import { formatDate, cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const STAGE_LABELS: Record<string, string> = {
  lead: "Lead",
  contacted: "Contacted",
  meeting_booked: "Meeting",
  proposal: "Proposal",
  active: "Active",
  won: "Won",
  dormant: "Dormant",
};

const STAGE_COLORS: Record<string, string> = {
  lead: "#94a3b8",
  contacted: "#60a5fa",
  meeting_booked: "#818cf8",
  proposal: "#f59e0b",
  active: "#10b981",
  won: "#059669",
  dormant: "#d1d5db",
};

const STATUS_COLORS: Record<string, string> = {
  open: "#60a5fa",
  in_progress: "#f59e0b",
  overdue: "#ef4444",
  completed: "#10b981",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  overdue: "Overdue",
  completed: "Completed",
};

const TYPE_COLORS: Record<string, string> = {
  employer: "#6366f1",
  training_provider: "#f59e0b",
  partner: "#10b981",
};

const TYPE_LABELS: Record<string, string> = {
  employer: "Employer",
  training_provider: "Training Provider",
  partner: "Partner",
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-red-500",
  medium: "bg-amber-400",
  low: "bg-slate-400",
};

const PRIORITY_TEXT: Record<string, string> = {
  high: "text-red-600",
  medium: "text-amber-600",
  low: "text-slate-500",
};

function SummaryCard({
  title, value, subtitle, icon: Icon, iconColor, iconBg, highlight,
}: {
  title: string;
  value: number;
  subtitle?: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
  highlight?: boolean;
}) {
  return (
    <Card className={cn(
      "transition-shadow hover:shadow-md",
      highlight && value > 0 ? "border-destructive/30 bg-destructive/[0.02]" : ""
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">{title}</p>
            <p className={cn("text-2xl font-bold mt-1 tabular-nums leading-none", highlight && value > 0 ? "text-destructive" : "text-foreground")}>
              {value}
            </p>
            {subtitle && <p className="text-[11px] text-muted-foreground mt-1.5">{subtitle}</p>}
          </div>
          <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", iconBg)}>
            <Icon className={cn("h-4.5 w-4.5", iconColor)} size={17} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white rounded-xl border border-border shadow-lg px-3 py-2 text-sm">
        <p className="font-semibold text-foreground">{label}</p>
        <p className="text-muted-foreground">{payload[0].value} engagements</p>
      </div>
    );
  }
  return null;
};

const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white rounded-xl border border-border shadow-lg px-3 py-2 text-sm">
        <p className="font-semibold text-foreground">{payload[0].name}</p>
        <p className="text-muted-foreground">{payload[0].value} tasks</p>
      </div>
    );
  }
  return null;
};

const CustomHBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white rounded-xl border border-border shadow-lg px-3 py-2 text-sm">
        <p className="font-semibold text-foreground">{label}</p>
        <p className="text-muted-foreground">{payload[0].value} organisations</p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const { data: summary, isLoading } = useGetDashboardSummary();
  const { user } = useAuth();

  if (isLoading || !summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const stageData = summary.engagementsByStage.map((r) => ({
    stage: STAGE_LABELS[r.stage] ?? r.stage,
    count: r.count,
    fill: STAGE_COLORS[r.stage] ?? "#94a3b8",
  }));

  const taskStatusData = summary.tasksByStatus
    .filter((r) => r.status !== "completed")
    .map((r) => ({
      name: STATUS_LABELS[r.status] ?? r.status,
      value: r.count,
      fill: STATUS_COLORS[r.status] ?? "#94a3b8",
    }));

  const orgTypeData = summary.organisationsByType.map((r) => ({
    type: TYPE_LABELS[r.type] ?? r.type,
    count: r.count,
    fill: TYPE_COLORS[r.type] ?? "#94a3b8",
  }));

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            {user?.fullName ? `Good ${getGreeting()}, ${user.fullName.split(" ")[0]}` : "Dashboard"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Here's your employer engagement overview for today.
          </p>
        </div>
        <div className="text-right hidden sm:block">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-semibold">{new Date().toLocaleDateString("en-GB", { weekday: "long" })}</p>
          <p className="text-sm font-medium text-foreground">{new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
        </div>
      </div>

      {/* Summary cards — 6 across */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <SummaryCard
          title="Total Orgs"
          value={summary.totalOrganisations}
          subtitle={`${summary.activeOrganisations} active`}
          icon={Building2}
          iconColor="text-blue-600"
          iconBg="bg-blue-50"
        />
        <SummaryCard
          title="Active Orgs"
          value={summary.activeOrganisations}
          icon={TrendingUp}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-50"
        />
        <SummaryCard
          title="Open Engagements"
          value={summary.totalEngagements}
          icon={Handshake}
          iconColor="text-indigo-600"
          iconBg="bg-indigo-50"
        />
        <SummaryCard
          title="Won"
          value={summary.wonEngagements}
          icon={Trophy}
          iconColor="text-amber-600"
          iconBg="bg-amber-50"
        />
        <SummaryCard
          title="Open Tasks"
          value={summary.openTasks}
          icon={CheckSquare}
          iconColor="text-sky-600"
          iconBg="bg-sky-50"
        />
        <SummaryCard
          title="Overdue Tasks"
          value={summary.overdueTasks}
          icon={AlertCircle}
          iconColor="text-red-600"
          iconBg="bg-red-50"
          highlight={summary.overdueTasks > 0}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Engagements by stage */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Engagement Pipeline</CardTitle>
            <p className="text-xs text-muted-foreground">Engagements by stage</p>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stageData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <XAxis
                    dataKey="stage"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomBarTooltip />} cursor={{ fill: "hsl(var(--muted)/0.4)" }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {stageData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Tasks by status — donut */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Active Tasks by Status</CardTitle>
            <p className="text-xs text-muted-foreground">Excluding completed tasks</p>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              {taskStatusData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">No active tasks</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={taskStatusData}
                      cx="50%"
                      cy="45%"
                      innerRadius={52}
                      outerRadius={76}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {taskStatusData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomPieTooltip />} />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
                      wrapperStyle={{ paddingTop: 8 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Organisations by type — horizontal bar */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Organisations by Type</CardTitle>
            <p className="text-xs text-muted-foreground">All organisations</p>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={orgTypeData}
                  margin={{ top: 4, right: 16, left: 8, bottom: 0 }}
                >
                  <XAxis type="number" allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="type"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    width={100}
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                  />
                  <Tooltip content={<CustomHBarTooltip />} cursor={{ fill: "hsl(var(--muted)/0.4)" }} />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {orgTypeData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom 3-column sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* My open tasks */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">My Open Tasks</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Assigned to you</p>
            </div>
            <Link href="/tasks" className="text-xs text-primary hover:underline flex items-center gap-0.5">
              All tasks <ArrowRight size={12} />
            </Link>
          </CardHeader>
          <CardContent className="flex-1 space-y-1 overflow-y-auto max-h-72">
            {summary.myOpenTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CheckSquare className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No open tasks assigned to you</p>
              </div>
            ) : (
              summary.myOpenTasks.map((task) => {
                const overdue = task.dueDate ? task.dueDate < today && task.status !== "completed" : false;
                return (
                  <div key={task.id} className="flex items-start gap-2.5 px-2 py-2 rounded-lg hover:bg-muted/40 transition-colors">
                    <span className={cn("mt-1.5 w-2 h-2 rounded-full shrink-0", PRIORITY_DOT[task.priority] ?? "bg-slate-300")} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {task.organisationName && (
                          <span className="text-xs text-muted-foreground truncate max-w-[120px]">{task.organisationName}</span>
                        )}
                        {task.dueDate && (
                          <span className={cn("text-xs flex items-center gap-0.5", overdue ? "text-destructive font-semibold" : "text-muted-foreground")}>
                            <Clock size={10} />
                            {formatDate(task.dueDate)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Recently updated organisations */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent Organisations</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Recently updated</p>
            </div>
            <Link href="/organisations" className="text-xs text-primary hover:underline flex items-center gap-0.5">
              All orgs <ArrowRight size={12} />
            </Link>
          </CardHeader>
          <CardContent className="flex-1 space-y-1 overflow-y-auto max-h-72">
            {summary.recentOrganisations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Building2 className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No organisations yet</p>
              </div>
            ) : (
              summary.recentOrganisations.map((org) => (
                <Link key={org.id} href={`/organisations/${org.id}`}>
                  <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/40 transition-colors cursor-pointer group">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                      <Building2 size={14} className="text-indigo-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug truncate group-hover:text-primary transition-colors">{org.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground capitalize">{TYPE_LABELS[org.type] ?? org.type}</span>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className={cn(
                          "text-xs capitalize font-medium",
                          org.status === "active" ? "text-emerald-600" : org.status === "prospect" ? "text-blue-500" : "text-muted-foreground"
                        )}>
                          {org.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Upcoming next actions */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Upcoming Next Actions</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Open engagements with scheduled actions</p>
            </div>
            <Link href="/engagements" className="text-xs text-primary hover:underline flex items-center gap-0.5">
              All <ArrowRight size={12} />
            </Link>
          </CardHeader>
          <CardContent className="flex-1 space-y-1 overflow-y-auto max-h-72">
            {summary.upcomingNextActions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <CalendarClock className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No upcoming actions scheduled</p>
              </div>
            ) : (
              summary.upcomingNextActions.map((eng) => {
                const actionOverdue = eng.nextActionDate ? eng.nextActionDate < today : false;
                return (
                  <Link key={eng.id} href={`/engagements/${eng.id}`}>
                    <div className="flex items-start gap-2.5 px-2 py-2 rounded-lg hover:bg-muted/40 transition-colors cursor-pointer group">
                      <div className={cn("mt-0.5 shrink-0", actionOverdue ? "text-destructive" : "text-amber-500")}>
                        <CalendarClock size={15} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium leading-snug truncate group-hover:text-primary transition-colors">{eng.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{(eng as any).organisationName ?? "—"}</p>
                        {eng.nextActionNote && (
                          <p className="text-xs text-muted-foreground/80 truncate mt-0.5 italic">{eng.nextActionNote}</p>
                        )}
                        <span className={cn(
                          "text-xs font-semibold flex items-center gap-0.5 mt-0.5",
                          actionOverdue ? "text-destructive" : "text-amber-600"
                        )}>
                          <Clock size={10} />
                          {eng.nextActionDate ? formatDate(eng.nextActionDate) : "—"}
                          {actionOverdue && " · Overdue"}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
