import { Link } from "wouter";
import {
  Users, AlertTriangle, CalendarCheck, Trophy, XCircle,
  Clock, CheckSquare, ArrowRight, RefreshCw, Target,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, LabelList,
} from "recharts";
import { useGetSdrDashboard } from "@workspace/api-client-react";
import type { SdrDashboardSummary } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/core-ui";
import { formatDate, cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

// ─── Colours ─────────────────────────────────────────────────────────────────

const STAGE_COLORS: Record<string, string> = {
  new:               "#94a3b8",
  researching:       "#60a5fa",
  outreach_started:  "#a78bfa",
  contacted:         "#818cf8",
  response_received: "#2dd4bf",
  meeting_booked:    "#fb923c",
  qualified:         "#34d399",
  disqualified:      "#f87171",
  nurture:           "#fbbf24",
};

const STAGE_LABELS: Record<string, string> = {
  new:               "New",
  researching:       "Researching",
  outreach_started:  "Outreach Started",
  contacted:         "Contacted",
  response_received: "Response Rec'd",
  meeting_booked:    "Meeting Booked",
  qualified:         "Qualified",
  disqualified:      "Disqualified",
  nurture:           "Nurture",
};

const STAGE_ORDER = [
  "new", "researching", "outreach_started", "contacted",
  "response_received", "meeting_booked", "qualified", "disqualified", "nurture",
];

const FUNNEL_COLORS = ["#60a5fa", "#818cf8", "#fb923c", "#34d399"];

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-red-50 text-red-700 border border-red-200",
  high:     "bg-orange-50 text-orange-700 border border-orange-200",
  medium:   "bg-amber-50 text-amber-700 border border-amber-200",
  low:      "bg-slate-50 text-slate-600 border border-slate-200",
};

const TASK_STATUS_DOT: Record<string, string> = {
  open:        "bg-blue-400",
  in_progress: "bg-amber-400",
  overdue:     "bg-red-500",
  completed:   "bg-emerald-400",
};

// ─── Metric Card ─────────────────────────────────────────────────────────────

interface MetricCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  highlight?: boolean;
  highlightColor?: string;
  subtitle?: string;
}

function MetricCard({ label, value, icon: Icon, iconBg, iconColor, highlight, highlightColor = "border-l-red-500", subtitle }: MetricCardProps) {
  return (
    <div className={cn(
      "bg-white rounded-xl border p-4 flex items-start gap-4 shadow-sm transition-shadow hover:shadow-md",
      highlight && `border-l-4 ${highlightColor}`
    )}>
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", iconBg)}>
        <Icon size={18} className={iconColor} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-display font-bold text-foreground tabular-nums">{value}</p>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mt-0.5">{label}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border rounded-lg px-3 py-2 shadow-lg text-sm">
      <p className="font-semibold text-foreground">{label}</p>
      <p className="text-muted-foreground">{payload[0]?.value} prospects</p>
    </div>
  );
}

function FunnelTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border rounded-lg px-3 py-2 shadow-lg text-sm">
      <p className="font-semibold text-foreground">{label}</p>
      <p className="text-muted-foreground">{payload[0]?.value} prospects</p>
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function Empty({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-28 text-sm text-muted-foreground">{label}</div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SdrDashboard() {
  const { user } = useAuth();

  const { data, isLoading, refetch } = useGetSdrDashboard({
    query: { staleTime: 0, refetchInterval: 60_000 },
  });

  const summary: SdrDashboardSummary = data ?? {
    newProspects: 0,
    dueFollowUpsToday: 0,
    overdueFollowUps: 0,
    meetingsBookedThisWeek: 0,
    qualifiedLeads: 0,
    disqualifiedLeads: 0,
    prospectsByStage: [],
    conversionFunnel: [],
    myTasks: [],
    recentProspects: [],
  };

  // Sort stages in logical pipeline order
  const stageChartData = STAGE_ORDER
    .map((stage) => {
      const found = summary.prospectsByStage.find((r) => r.stage === stage);
      return found ? { stage: STAGE_LABELS[stage] ?? stage, count: found.count, fill: STAGE_COLORS[stage] ?? "#94a3b8" } : null;
    })
    .filter(Boolean) as { stage: string; count: number; fill: string }[];

  const funnelData = summary.conversionFunnel.map((item, i) => ({
    ...item,
    fill: FUNNEL_COLORS[i] ?? "#60a5fa",
  }));

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="h-full flex flex-col gap-6 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">SDR Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {user?.fullName ? `Welcome back, ${user.fullName.split(" ")[0]}.` : "SDR pipeline at a glance."}
            {" "}Refreshes every minute.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 text-xs text-muted-foreground border rounded-lg px-3 py-2 hover:text-foreground transition-colors bg-white mt-1"
        >
          <RefreshCw size={13} className={cn(isLoading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 flex-shrink-0">
        <MetricCard
          label="New Prospects"
          value={summary.newProspects}
          icon={Users}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
        />
        <MetricCard
          label="Due Today"
          value={summary.dueFollowUpsToday}
          icon={Clock}
          iconBg="bg-sky-50"
          iconColor="text-sky-600"
          highlight={summary.dueFollowUpsToday > 0}
          highlightColor="border-l-sky-500"
          subtitle="follow-ups"
        />
        <MetricCard
          label="Overdue"
          value={summary.overdueFollowUps}
          icon={AlertTriangle}
          iconBg="bg-red-50"
          iconColor="text-red-600"
          highlight={summary.overdueFollowUps > 0}
          highlightColor="border-l-red-500"
          subtitle="follow-ups"
        />
        <MetricCard
          label="Meetings This Week"
          value={summary.meetingsBookedThisWeek}
          icon={CalendarCheck}
          iconBg="bg-orange-50"
          iconColor="text-orange-600"
          highlight={summary.meetingsBookedThisWeek > 0}
          highlightColor="border-l-orange-500"
        />
        <MetricCard
          label="Qualified"
          value={summary.qualifiedLeads}
          icon={Trophy}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          highlight={summary.qualifiedLeads > 0}
          highlightColor="border-l-emerald-500"
        />
        <MetricCard
          label="Disqualified"
          value={summary.disqualifiedLeads}
          icon={XCircle}
          iconBg="bg-slate-50"
          iconColor="text-slate-500"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 flex-shrink-0">

        {/* Prospects by Stage */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Prospects by Stage</CardTitle>
            <p className="text-xs text-muted-foreground">SDR pipeline distribution</p>
          </CardHeader>
          <CardContent>
            {stageChartData.length === 0 ? (
              <Empty label="No SDR data yet" />
            ) : (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stageChartData} margin={{ top: 4, right: 8, left: -24, bottom: 4 }}>
                    <XAxis
                      dataKey="stage"
                      fontSize={10}
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      angle={-25}
                      textAnchor="end"
                      height={52}
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                    />
                    <YAxis allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {stageChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Conversion Funnel</CardTitle>
            <p className="text-xs text-muted-foreground">Prospects → Contacted → Meeting → Qualified</p>
          </CardHeader>
          <CardContent>
            {funnelData.length === 0 ? (
              <Empty label="No data yet" />
            ) : (
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={funnelData}
                    layout="vertical"
                    margin={{ top: 4, right: 48, left: 8, bottom: 4 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={90}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: "hsl(var(--muted-foreground))" }}
                    />
                    <Tooltip content={<FunnelTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={32}>
                      {funnelData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                      <LabelList
                        dataKey="count"
                        position="right"
                        style={{ fontSize: 12, fontWeight: 600, fill: "hsl(var(--foreground))" }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">

        {/* My Tasks */}
        <Card className="flex flex-col min-h-0">
          <CardHeader className="pb-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">My Tasks</CardTitle>
                <p className="text-xs text-muted-foreground">Open tasks assigned to you</p>
              </div>
              <Link href="/tasks">
                <span className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer">
                  All tasks <ArrowRight size={12} />
                </span>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto px-4 pb-4">
            {summary.myTasks.length === 0 ? (
              <Empty label="No open tasks — you're all caught up!" />
            ) : (
              <ul className="space-y-2">
                {summary.myTasks.map((task) => {
                  const isOverdue = task.dueDate && task.dueDate < todayStr && task.status !== "completed";
                  return (
                    <li key={task.id} className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border bg-white hover:bg-muted/20 transition-colors",
                      isOverdue && "border-red-200 bg-red-50/40"
                    )}>
                      <div className={cn("mt-1.5 w-2 h-2 rounded-full flex-shrink-0", TASK_STATUS_DOT[task.status] ?? "bg-muted")} />
                      <div className="flex-1 min-w-0">
                        {task.engagementId ? (
                          <Link href={`/engagements/${task.engagementId}`}>
                            <span className="text-sm font-medium hover:text-primary cursor-pointer truncate block">
                              {task.title}
                            </span>
                          </Link>
                        ) : (
                          <p className="text-sm font-medium truncate">{task.title}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {task.organisationName && (
                            <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                              {task.organisationName}
                            </span>
                          )}
                          {task.dueDate && (
                            <span className={cn(
                              "text-xs inline-flex items-center gap-1",
                              isOverdue ? "text-red-600 font-semibold" : "text-muted-foreground"
                            )}>
                              <Clock size={10} className="shrink-0" />
                              {formatDate(task.dueDate)}
                            </span>
                          )}
                        </div>
                      </div>
                      {task.priority && task.priority !== "medium" && (
                        <span className={cn(
                          "text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 capitalize",
                          PRIORITY_COLORS[task.priority] ?? "bg-muted text-muted-foreground"
                        )}>
                          {task.priority}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recently Updated Prospects */}
        <Card className="flex flex-col min-h-0">
          <CardHeader className="pb-3 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Recently Updated</CardTitle>
                <p className="text-xs text-muted-foreground">Latest SDR prospect activity</p>
              </div>
              <Link href="/sdr">
                <span className="flex items-center gap-1 text-xs text-primary hover:underline cursor-pointer">
                  SDR Queue <ArrowRight size={12} />
                </span>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto px-4 pb-4">
            {summary.recentProspects.length === 0 ? (
              <Empty label="No SDR prospects yet" />
            ) : (
              <ul className="space-y-2">
                {summary.recentProspects.map((eng) => {
                  const stage = eng.sdrStage;
                  const stageLabel = stage ? (STAGE_LABELS[stage] ?? stage) : null;
                  const stageColor = stage ? (STAGE_COLORS[stage] ?? "#94a3b8") : "#94a3b8";
                  const isOverdueOutreach = eng.nextOutreachDate && eng.nextOutreachDate < todayStr;

                  return (
                    <li key={eng.id}>
                      <Link href={`/engagements/${eng.id}`}>
                        <div className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border bg-white hover:bg-muted/20 transition-colors cursor-pointer",
                          isOverdueOutreach && "border-amber-200 bg-amber-50/40"
                        )}>
                          {/* Stage dot */}
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: stageColor }} />

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate hover:text-primary transition-colors">
                              {eng.organisationName ?? eng.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              {stageLabel && (
                                <span className="text-xs text-muted-foreground">{stageLabel}</span>
                              )}
                              {eng.contactName && (
                                <span className="text-xs text-muted-foreground">· {eng.contactName}</span>
                              )}
                            </div>
                          </div>

                          {/* Right side: overdue or last updated */}
                          <div className="text-right flex-shrink-0">
                            {isOverdueOutreach ? (
                              <span className="inline-flex items-center gap-1 text-xs text-amber-600 font-medium">
                                <AlertTriangle size={10} />
                                Overdue
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {formatDate(eng.updatedAt.split("T")[0])}
                              </span>
                            )}
                            {eng.meetingBooked && (
                              <p className="text-[10px] text-emerald-600 font-medium mt-0.5">Meeting booked</p>
                            )}
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
