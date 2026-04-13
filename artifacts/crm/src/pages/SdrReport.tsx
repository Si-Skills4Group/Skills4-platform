import { RefreshCw, Users, CalendarCheck, Trophy, AlertTriangle, Phone, TrendingUp, ClipboardList } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LabelList,
} from "recharts";
import { useGetSdrManagerReport } from "@workspace/api-client-react";
import type {
  SdrManagerReport,
  SdrManagerReportRepPerformanceItem,
  SdrManagerReportOverdueFollowUpsItem,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/core-ui";
import { cn } from "@/lib/utils";
import { getCallOutcomeLabel, getCallOutcomeBadgeClass } from "@/components/sdr/constants";

// ─── Colours ─────────────────────────────────────────────────────────────────

const TERMINAL_COLORS: Record<string, string> = {
  nurture:        "#818cf8",
  unresponsive:   "#9ca3af",
  do_not_contact: "#f87171",
  bad_data:       "#fb7185",
  changed_job:    "#e879f9",
  disqualified:   "#ef4444",
};

const REP_PALETTE = ["#818cf8", "#34d399", "#60a5fa", "#f59e0b", "#f87171", "#22d3ee", "#a78bfa", "#fb923c"];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pct(num: number, denom: number) {
  if (!denom) return "—";
  return `${Math.round((num / denom) * 100)}%`;
}

function daysOverdue(dateStr: string | null | undefined) {
  if (!dateStr) return null;
  const diff = Math.floor((Date.now() - new Date(dateStr + "T00:00:00").getTime()) / 86_400_000);
  return diff > 0 ? diff : null;
}

function fmtDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  );
}

function StatPill({ value, className }: { value: number | string; className?: string }) {
  return (
    <span className={cn("inline-flex items-center justify-center min-w-[2rem] text-xs font-semibold px-2 py-0.5 rounded-full border tabular-nums", className)}>
      {value}
    </span>
  );
}

// ─── Rep Performance Table ────────────────────────────────────────────────────

function RepTable({ reps }: { reps: SdrManagerReportRepPerformanceItem[] }) {
  if (!reps.length) {
    return <div className="text-sm text-muted-foreground py-8 text-center">No rep data yet.</div>;
  }
  const maxTotal = Math.max(...reps.map((r) => r.total), 1);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="pb-2 pr-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rep</th>
            <th className="pb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Prospects</th>
            <th className="pb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Calls</th>
            <th className="pb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Contact Made</th>
            <th className="pb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Meetings</th>
            <th className="pb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Qualified</th>
            <th className="pb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Conv %</th>
            <th className="pb-2 pl-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide text-right">Overdue</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {reps.map((rep, i) => (
            <tr key={rep.repId} className="hover:bg-muted/30 transition-colors group">
              <td className="py-3 pr-4">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0"
                    style={{ backgroundColor: REP_PALETTE[i % REP_PALETTE.length] }}
                  >
                    {rep.repName.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-medium text-foreground leading-none">{rep.repName}</p>
                    <div className="mt-1 w-24 h-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${(rep.total / maxTotal) * 100}%`,
                          backgroundColor: REP_PALETTE[i % REP_PALETTE.length],
                        }}
                      />
                    </div>
                  </div>
                </div>
              </td>
              <td className="py-3 px-3 text-right">
                <StatPill value={rep.total} className="bg-slate-50 text-slate-700 border-slate-200" />
              </td>
              <td className="py-3 px-3 text-right">
                <StatPill value={rep.callsMade} className="bg-violet-50 text-violet-700 border-violet-200" />
              </td>
              <td className="py-3 px-3 text-right">
                <StatPill value={rep.contactMade} className="bg-sky-50 text-sky-700 border-sky-200" />
              </td>
              <td className="py-3 px-3 text-right">
                <StatPill
                  value={rep.meetingsBooked}
                  className={rep.meetingsBooked > 0 ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-muted text-muted-foreground border-border"}
                />
              </td>
              <td className="py-3 px-3 text-right">
                <StatPill
                  value={rep.qualified}
                  className={rep.qualified > 0 ? "bg-green-50 text-green-700 border-green-200" : "bg-muted text-muted-foreground border-border"}
                />
              </td>
              <td className="py-3 px-3 text-right">
                <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                  {pct(rep.qualified, rep.total)}
                </span>
              </td>
              <td className="py-3 pl-3 text-right">
                {rep.overdueFollowUps > 0 ? (
                  <StatPill value={rep.overdueFollowUps} className="bg-red-50 text-red-600 border-red-200" />
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function BarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border rounded-lg px-3 py-2 shadow-lg text-sm">
      <p className="font-semibold text-foreground">{label}</p>
      <p className="text-muted-foreground">{payload[0]?.value} {payload[0]?.name ?? ""}</p>
    </div>
  );
}

// ─── Overdue table ────────────────────────────────────────────────────────────

function OverdueTable({ rows }: { rows: SdrManagerReportOverdueFollowUpsItem[] }) {
  if (!rows.length) {
    return (
      <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
        No overdue follow-ups — great work!
      </div>
    );
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left">
            <th className="pb-2 pr-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Prospect / Org</th>
            <th className="pb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Rep</th>
            <th className="pb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Was Due</th>
            <th className="pb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Days Overdue</th>
            <th className="pb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Last Outcome</th>
            <th className="pb-2 pl-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Context</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {rows.map((r) => {
            const overdueDays = daysOverdue(r.nextCallDate);
            return (
              <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                <td className="py-3 pr-4">
                  <p className="font-medium text-foreground">{r.orgName ?? r.title}</p>
                  {r.orgName && <p className="text-xs text-muted-foreground truncate max-w-[160px]">{r.title}</p>}
                </td>
                <td className="py-3 px-3 text-sm text-muted-foreground whitespace-nowrap">
                  {r.repName ?? "—"}
                </td>
                <td className="py-3 px-3 text-sm text-muted-foreground whitespace-nowrap">
                  {fmtDate(r.nextCallDate)}
                </td>
                <td className="py-3 px-3">
                  {overdueDays != null ? (
                    <span className={cn(
                      "inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border",
                      overdueDays >= 7 ? "bg-red-100 text-red-700 border-red-200" : "bg-amber-50 text-amber-700 border-amber-200"
                    )}>
                      {overdueDays >= 7 && <AlertTriangle size={9} />}
                      {overdueDays}d
                    </span>
                  ) : "—"}
                </td>
                <td className="py-3 px-3">
                  {r.lastCallOutcome ? (
                    <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full border", getCallOutcomeBadgeClass(r.lastCallOutcome))}>
                      {getCallOutcomeLabel(r.lastCallOutcome)}
                    </span>
                  ) : <span className="text-muted-foreground text-xs">—</span>}
                </td>
                <td className="py-3 pl-3 max-w-[200px]">
                  {r.followUpReason ? (
                    <p className="text-xs text-muted-foreground truncate" title={r.followUpReason}>{r.followUpReason}</p>
                  ) : <span className="text-muted-foreground text-xs">—</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const EMPTY_REPORT: SdrManagerReport = {
  repPerformance: [],
  meetingsByWeek: [],
  terminalStageDistribution: [],
  overdueFollowUps: [],
};

export default function SdrReport() {
  const { data, isLoading, refetch, isRefetching, dataUpdatedAt } = useGetSdrManagerReport({
    query: { staleTime: 0, refetchInterval: 5 * 60_000 },
  });

  const report = data ?? EMPTY_REPORT;

  const updatedLabel = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })
    : null;

  // Meetings chart — fill sparse results from server into 8-week scaffold
  const meetingsData = report.meetingsByWeek;

  // Qualified by rep — for horizontal bar chart
  const qualifiedByRep = [...report.repPerformance]
    .filter((r) => r.qualified > 0 || r.meetingsBooked > 0)
    .sort((a, b) => b.qualified - a.qualified);

  // Terminal stage data
  const terminalData = [...report.terminalStageDistribution].sort((a, b) => b.count - a.count);

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50/50">
      {/* Page header */}
      <div className="bg-white border-b px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
              <ClipboardList size={18} className="text-indigo-600" />
            </div>
            <div>
              <h1 className="text-lg font-display font-bold text-foreground">SDR Performance Report</h1>
              <p className="text-xs text-muted-foreground">
                Conversion by rep · meetings trend · overdue follow-ups · disqualification reasons
                {updatedLabel && <span className="ml-2 text-muted-foreground/60">· Updated {updatedLabel}</span>}
              </p>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border rounded-lg px-3 py-1.5 bg-white hover:bg-muted/30 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={cn(isRefetching && "animate-spin")} />
            Refresh
          </button>
        </div>
      </div>

      <div className="px-6 py-6 space-y-8 max-w-[1400px]">

        {/* ── Section 1: Rep Performance ───────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-0">
            <div className="flex items-center gap-2">
              <Users size={15} className="text-muted-foreground" />
              <CardTitle className="text-sm font-semibold">Conversion by Rep</CardTitle>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Prospects owned · calls dialled · contact made · meetings booked · qualified leads and conversion rate</p>
          </CardHeader>
          <CardContent className="pt-4">
            {isLoading ? (
              <div className="space-y-2 animate-pulse">
                {[...Array(3)].map((_, i) => <div key={i} className="h-10 bg-muted rounded" />)}
              </div>
            ) : (
              <RepTable reps={report.repPerformance} />
            )}
          </CardContent>
        </Card>

        {/* ── Section 2: Two-column charts ─────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Meetings by week */}
          <Card>
            <CardHeader className="pb-0">
              <div className="flex items-center gap-2">
                <CalendarCheck size={15} className="text-muted-foreground" />
                <CardTitle className="text-sm font-semibold">Meetings Booked by Week</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Scheduled meeting dates over the last 8 weeks</p>
            </CardHeader>
            <CardContent className="pt-4">
              {isLoading ? (
                <div className="h-48 bg-muted rounded animate-pulse" />
              ) : meetingsData.length === 0 || meetingsData.every((d) => d.count === 0) ? (
                <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">No meetings booked yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={meetingsData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={20}>
                    <XAxis dataKey="week" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<BarTooltip />} />
                    <Bar dataKey="count" name="meetings" radius={[4, 4, 0, 0]}>
                      {meetingsData.map((_, i) => (
                        <Cell key={i} fill={i === meetingsData.length - 1 ? "#34d399" : "#a7f3d0"} />
                      ))}
                      <LabelList dataKey="count" position="top" style={{ fontSize: 10, fill: "#6b7280" }} formatter={(v: number) => v > 0 ? v : ""} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Disqualification reasons */}
          <Card>
            <CardHeader className="pb-0">
              <div className="flex items-center gap-2">
                <TrendingUp size={15} className="text-muted-foreground" />
                <CardTitle className="text-sm font-semibold">Disqualification Reasons</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Distribution of terminal stage outcomes</p>
            </CardHeader>
            <CardContent className="pt-4">
              {isLoading ? (
                <div className="h-48 bg-muted rounded animate-pulse" />
              ) : terminalData.length === 0 ? (
                <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">No terminal prospects yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={terminalData} layout="vertical" margin={{ top: 0, right: 40, left: 0, bottom: 0 }} barSize={16}>
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<BarTooltip />} />
                    <Bar dataKey="count" name="prospects" radius={[0, 4, 4, 0]}>
                      {terminalData.map((row) => (
                        <Cell key={row.stage} fill={TERMINAL_COLORS[row.stage] ?? "#9ca3af"} />
                      ))}
                      <LabelList dataKey="count" position="right" style={{ fontSize: 11, fill: "#6b7280" }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Section 3: Qualified by Rep ──────────────────────────────────── */}
        {qualifiedByRep.length > 0 && (
          <Card>
            <CardHeader className="pb-0">
              <div className="flex items-center gap-2">
                <Trophy size={15} className="text-muted-foreground" />
                <CardTitle className="text-sm font-semibold">Pipeline Progress by Rep</CardTitle>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Meetings booked and qualified leads per rep</p>
            </CardHeader>
            <CardContent className="pt-4">
              {isLoading ? (
                <div className="h-48 bg-muted rounded animate-pulse" />
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(120, qualifiedByRep.length * 44)}>
                  <BarChart data={qualifiedByRep} layout="vertical" margin={{ top: 0, right: 60, left: 0, bottom: 0 }} barSize={12} barGap={4}>
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="repName" width={120} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<BarTooltip />} />
                    <Bar dataKey="meetingsBooked" name="meetings booked" radius={[0, 4, 4, 0]} fill="#a7f3d0">
                      {qualifiedByRep.map((_, i) => <Cell key={i} fill="#a7f3d0" />)}
                    </Bar>
                    <Bar dataKey="qualified" name="qualified" radius={[0, 4, 4, 0]}>
                      {qualifiedByRep.map((_, i) => <Cell key={i} fill={REP_PALETTE[i % REP_PALETTE.length]} />)}
                      <LabelList dataKey="qualified" position="right" style={{ fontSize: 11, fill: "#6b7280" }} formatter={(v: number) => v > 0 ? `${v} qual.` : ""} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Section 4: Overdue follow-ups ────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={15} className="text-muted-foreground" />
                <CardTitle className="text-sm font-semibold">Overdue Follow-ups</CardTitle>
              </div>
              {report.overdueFollowUps.length > 0 && (
                <span className="text-[11px] font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                  {report.overdueFollowUps.length} overdue
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">Prospects where the scheduled follow-up date has passed and no action taken</p>
          </CardHeader>
          <CardContent className="pt-4">
            {isLoading ? (
              <div className="space-y-2 animate-pulse">
                {[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-muted rounded" />)}
              </div>
            ) : (
              <OverdueTable rows={report.overdueFollowUps} />
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
