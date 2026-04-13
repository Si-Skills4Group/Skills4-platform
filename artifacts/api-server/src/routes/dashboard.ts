import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { organisationsTable, contactsTable, engagementsTable, tasksTable, usersTable } from "@workspace/db/schema";
import { eq, sql, and, or, ne, gt, lt, isNotNull, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

const router: IRouter = Router();

router.get("/summary", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const userId = req.user?.id ?? null;

    const [
      [orgCount],
      [activeOrgCount],
      [contactCount],
      [engCount],
      [wonEngCount],
      [openTaskCount],
      [overdueCount],
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(organisationsTable),
      db.select({ count: sql<number>`count(*)::int` }).from(organisationsTable).where(eq(organisationsTable.status, "active")),
      db.select({ count: sql<number>`count(*)::int` }).from(contactsTable),
      db.select({ count: sql<number>`count(*)::int` }).from(engagementsTable).where(eq(engagementsTable.status, "open")),
      db.select({ count: sql<number>`count(*)::int` }).from(engagementsTable).where(eq(engagementsTable.status, "closed_won")),
      db.select({ count: sql<number>`count(*)::int` }).from(tasksTable).where(or(eq(tasksTable.status, "open"), eq(tasksTable.status, "in_progress"))),
      db.select({ count: sql<number>`count(*)::int` }).from(tasksTable).where(eq(tasksTable.status, "overdue")),
    ]);

    const [stageRows, taskStatusRows, orgTypeRows] = await Promise.all([
      db.select({ stage: engagementsTable.stage, count: sql<number>`count(*)::int` })
        .from(engagementsTable)
        .groupBy(engagementsTable.stage),
      db.select({ status: tasksTable.status, count: sql<number>`count(*)::int` })
        .from(tasksTable)
        .groupBy(tasksTable.status),
      db.select({ type: organisationsTable.type, count: sql<number>`count(*)::int` })
        .from(organisationsTable)
        .groupBy(organisationsTable.type),
    ]);

    const recentEngagementRows = await db
      .select({ engagement: engagementsTable, orgName: organisationsTable.name })
      .from(engagementsTable)
      .leftJoin(organisationsTable, eq(engagementsTable.organisationId, organisationsTable.id))
      .orderBy(sql`${engagementsTable.updatedAt} DESC`)
      .limit(5);

    const upcomingTaskRows = await db
      .select({ task: tasksTable, orgName: organisationsTable.name, engTitle: engagementsTable.title })
      .from(tasksTable)
      .leftJoin(organisationsTable, eq(tasksTable.organisationId, organisationsTable.id))
      .leftJoin(engagementsTable, eq(tasksTable.engagementId, engagementsTable.id))
      .where(or(eq(tasksTable.status, "open"), eq(tasksTable.status, "in_progress"), eq(tasksTable.status, "overdue")))
      .orderBy(tasksTable.dueDate, tasksTable.priority)
      .limit(5);

    const myOpenTaskRows = userId
      ? await db
          .select({ task: tasksTable, orgName: organisationsTable.name, engTitle: engagementsTable.title })
          .from(tasksTable)
          .leftJoin(organisationsTable, eq(tasksTable.organisationId, organisationsTable.id))
          .leftJoin(engagementsTable, eq(tasksTable.engagementId, engagementsTable.id))
          .where(and(
            eq(tasksTable.assignedUserId, userId),
            or(eq(tasksTable.status, "open"), eq(tasksTable.status, "in_progress"), eq(tasksTable.status, "overdue")),
          ))
          .orderBy(tasksTable.dueDate, tasksTable.priority)
          .limit(8)
      : [];

    const recentOrgRows = await db
      .select()
      .from(organisationsTable)
      .orderBy(sql`${organisationsTable.updatedAt} DESC`)
      .limit(6);

    const upcomingNextActionRows = await db
      .select({ engagement: engagementsTable, orgName: organisationsTable.name })
      .from(engagementsTable)
      .leftJoin(organisationsTable, eq(engagementsTable.organisationId, organisationsTable.id))
      .where(and(
        isNotNull(engagementsTable.nextActionDate),
        ne(engagementsTable.status, "closed_won"),
        ne(engagementsTable.status, "closed_lost"),
      ))
      .orderBy(engagementsTable.nextActionDate)
      .limit(8);

    const mapTask = (r: { task: typeof tasksTable.$inferSelect; orgName: string | null; engTitle: string | null }) => ({
      ...r.task,
      organisationName: r.orgName ?? null,
      engagementTitle: r.engTitle ?? null,
      assignedUserName: null,
      createdAt: r.task.createdAt.toISOString(),
      updatedAt: r.task.updatedAt.toISOString(),
    });

    const mapEngagement = (r: { engagement: typeof engagementsTable.$inferSelect; orgName: string | null }) => ({
      ...r.engagement,
      expectedValue: r.engagement.expectedValue ? Number(r.engagement.expectedValue) : null,
      organisationName: r.orgName ?? null,
      contactName: null,
      ownerName: null,
      createdAt: r.engagement.createdAt.toISOString(),
      updatedAt: r.engagement.updatedAt.toISOString(),
    });

    res.json({
      totalOrganisations: orgCount?.count ?? 0,
      activeOrganisations: activeOrgCount?.count ?? 0,
      totalContacts: contactCount?.count ?? 0,
      totalEngagements: engCount?.count ?? 0,
      wonEngagements: wonEngCount?.count ?? 0,
      openTasks: openTaskCount?.count ?? 0,
      overdueTasks: overdueCount?.count ?? 0,
      engagementsByStage: stageRows.map((r) => ({ stage: r.stage, count: r.count })),
      tasksByStatus: taskStatusRows.map((r) => ({ status: r.status, count: r.count })),
      organisationsByType: orgTypeRows.map((r) => ({ type: r.type, count: r.count })),
      myOpenTasks: myOpenTaskRows.map(mapTask),
      recentOrganisations: recentOrgRows.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
      upcomingNextActions: upcomingNextActionRows.map(mapEngagement),
      recentEngagements: recentEngagementRows.map(mapEngagement),
      upcomingTasks: upcomingTaskRows.map(mapTask),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/sdr", async (req, res) => {
  try {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const userId = req.user?.id ?? null;

    // Start of current ISO week (Monday)
    const dayOfWeek = now.getDay(); // 0=Sun
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + daysToMonday);
    const weekStartStr = weekStart.toISOString().split("T")[0];

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const weekEndStr = weekEnd.toISOString().split("T")[0];

    const sdrOnly = eq(engagementsTable.engagementType, "sdr");

    const [
      [newProspects],
      [dueFollowUpsToday],
      [overdueFollowUps],
      [meetingsBookedThisWeek],
      [qualifiedLeads],
      [disqualifiedLeads],
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(engagementsTable)
        .where(and(sdrOnly, eq(engagementsTable.sdrStage, "new"))),

      db.select({ count: sql<number>`count(*)::int` }).from(engagementsTable)
        .where(and(sdrOnly, eq(engagementsTable.nextOutreachDate, today))),

      db.select({ count: sql<number>`count(*)::int` }).from(engagementsTable)
        .where(and(
          sdrOnly,
          isNotNull(engagementsTable.nextOutreachDate),
          lt(engagementsTable.nextOutreachDate, today),
          ne(engagementsTable.sdrStage, "qualified"),
          ne(engagementsTable.sdrStage, "disqualified"),
        )),

      db.select({ count: sql<number>`count(*)::int` }).from(engagementsTable)
        .where(and(
          sdrOnly,
          eq(engagementsTable.meetingBooked, true),
          isNotNull(engagementsTable.meetingDate),
          sql`${engagementsTable.meetingDate} >= ${weekStartStr}`,
          sql`${engagementsTable.meetingDate} <= ${weekEndStr}`,
        )),

      db.select({ count: sql<number>`count(*)::int` }).from(engagementsTable)
        .where(and(sdrOnly, eq(engagementsTable.sdrStage, "qualified"))),

      db.select({ count: sql<number>`count(*)::int` }).from(engagementsTable)
        .where(and(sdrOnly, eq(engagementsTable.sdrStage, "disqualified"))),
    ]);

    // Prospects by stage
    const prospectsByStageRows = await db
      .select({ stage: engagementsTable.sdrStage, count: sql<number>`count(*)::int` })
      .from(engagementsTable)
      .where(sdrOnly)
      .groupBy(engagementsTable.sdrStage);

    // Conversion funnel — cumulative counts at each key threshold
    const totalSdr = await db.select({ count: sql<number>`count(*)::int` }).from(engagementsTable).where(sdrOnly);
    const contactedPlus = await db.select({ count: sql<number>`count(*)::int` }).from(engagementsTable)
      .where(and(sdrOnly, inArray(engagementsTable.sdrStage, ["contacted", "response_received", "meeting_booked", "qualified", "disqualified"])));
    const meetingBookedCount = await db.select({ count: sql<number>`count(*)::int` }).from(engagementsTable)
      .where(and(sdrOnly, eq(engagementsTable.meetingBooked, true)));
    const qualifiedCount = await db.select({ count: sql<number>`count(*)::int` }).from(engagementsTable)
      .where(and(sdrOnly, eq(engagementsTable.sdrStage, "qualified")));

    const conversionFunnel = [
      { label: "Prospects", count: totalSdr[0]?.count ?? 0 },
      { label: "Contacted", count: contactedPlus[0]?.count ?? 0 },
      { label: "Meeting Booked", count: meetingBookedCount[0]?.count ?? 0 },
      { label: "Qualified", count: qualifiedCount[0]?.count ?? 0 },
    ];

    // My SDR-related tasks
    const myTaskRows = userId
      ? await db
          .select({ task: tasksTable, orgName: organisationsTable.name, engTitle: engagementsTable.title })
          .from(tasksTable)
          .leftJoin(organisationsTable, eq(tasksTable.organisationId, organisationsTable.id))
          .leftJoin(engagementsTable, eq(tasksTable.engagementId, engagementsTable.id))
          .where(and(
            eq(tasksTable.assignedUserId, userId),
            or(eq(tasksTable.status, "open"), eq(tasksTable.status, "in_progress"), eq(tasksTable.status, "overdue")),
          ))
          .orderBy(tasksTable.dueDate, tasksTable.priority)
          .limit(10)
      : [];

    // Recently updated SDR prospects
    const recentProspectRows = await db
      .select({ engagement: engagementsTable, orgName: organisationsTable.name })
      .from(engagementsTable)
      .leftJoin(organisationsTable, eq(engagementsTable.organisationId, organisationsTable.id))
      .where(sdrOnly)
      .orderBy(sql`${engagementsTable.updatedAt} DESC`)
      .limit(8);

    const mapTask = (r: { task: typeof tasksTable.$inferSelect; orgName: string | null; engTitle: string | null }) => ({
      ...r.task,
      organisationName: r.orgName ?? null,
      engagementTitle: r.engTitle ?? null,
      assignedUserName: null,
      createdAt: r.task.createdAt.toISOString(),
      updatedAt: r.task.updatedAt.toISOString(),
    });

    const mapEngagement = (r: { engagement: typeof engagementsTable.$inferSelect; orgName: string | null }) => ({
      ...r.engagement,
      expectedValue: r.engagement.expectedValue ? Number(r.engagement.expectedValue) : null,
      organisationName: r.orgName ?? null,
      contactName: null,
      ownerName: null,
      sdrOwnerName: null,
      handoverOwnerName: null,
      createdAt: r.engagement.createdAt.toISOString(),
      updatedAt: r.engagement.updatedAt.toISOString(),
    });

    res.json({
      newProspects: newProspects?.count ?? 0,
      dueFollowUpsToday: dueFollowUpsToday?.count ?? 0,
      overdueFollowUps: overdueFollowUps?.count ?? 0,
      meetingsBookedThisWeek: meetingsBookedThisWeek?.count ?? 0,
      qualifiedLeads: qualifiedLeads?.count ?? 0,
      disqualifiedLeads: disqualifiedLeads?.count ?? 0,
      prospectsByStage: prospectsByStageRows.map((r) => ({ stage: r.stage ?? "unknown", count: r.count })),
      conversionFunnel,
      myTasks: myTaskRows.map(mapTask),
      recentProspects: recentProspectRows.map(mapEngagement),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── SDR Manager Report ───────────────────────────────────────────────────────

const TERMINAL_STAGES = ["nurture", "unresponsive", "do_not_contact", "bad_data", "changed_job", "disqualified"];

const TERMINAL_LABELS: Record<string, string> = {
  nurture:          "Nurture",
  unresponsive:     "Unresponsive",
  do_not_contact:   "Do Not Contact",
  bad_data:         "Bad Data",
  changed_job:      "Changed Job",
  disqualified:     "Disqualified",
};

router.get("/sdr/manager", async (req, res) => {
  try {
    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const sdrOwnerTable = alias(usersTable, "sdr_owner");

    const sdrOnly = eq(engagementsTable.engagementType, "sdr");

    // ── 1. Rep performance ──────────────────────────────────────────────────
    const repPerfRows = await db
      .select({
        repId:           sdrOwnerTable.id,
        repName:         sdrOwnerTable.fullName,
        total:           sql<number>`count(${engagementsTable.id})::int`,
        callsMade:       sql<number>`coalesce(sum(${engagementsTable.callAttemptCount}), 0)::int`,
        contactMade:     sql<number>`count(case when ${engagementsTable.contactMade} = true then 1 end)::int`,
        meetingsBooked:  sql<number>`count(case when ${engagementsTable.meetingBooked} = true then 1 end)::int`,
        qualified:       sql<number>`count(case when ${engagementsTable.sdrStage} = 'qualified' then 1 end)::int`,
        overdueFollowUps:sql<number>`count(case when ${engagementsTable.followUpRequired} = true and ${engagementsTable.nextCallDate} < ${today} then 1 end)::int`,
      })
      .from(sdrOwnerTable)
      .innerJoin(
        engagementsTable,
        and(eq(engagementsTable.sdrOwnerUserId, sdrOwnerTable.id), sdrOnly),
      )
      .groupBy(sdrOwnerTable.id, sdrOwnerTable.fullName)
      .orderBy(sql`count(${engagementsTable.id}) desc`);

    // ── 2. Meetings by week (last 8 weeks) ──────────────────────────────────
    const eightWeeksAgo = new Date(now);
    eightWeeksAgo.setDate(now.getDate() - 56);
    const eightWeeksAgoStr = eightWeeksAgo.toISOString().split("T")[0];

    const meetingsWeekRows = await db
      .select({
        weekStart: sql<string>`date_trunc('week', to_date(${engagementsTable.meetingDate}, 'YYYY-MM-DD'))::text`,
        count:     sql<number>`count(*)::int`,
      })
      .from(engagementsTable)
      .where(and(
        sdrOnly,
        eq(engagementsTable.meetingBooked, true),
        isNotNull(engagementsTable.meetingDate),
        sql`to_date(${engagementsTable.meetingDate}, 'YYYY-MM-DD') >= to_date(${eightWeeksAgoStr}, 'YYYY-MM-DD')`,
      ))
      .groupBy(sql`date_trunc('week', to_date(${engagementsTable.meetingDate}, 'YYYY-MM-DD'))`)
      .orderBy(sql`date_trunc('week', to_date(${engagementsTable.meetingDate}, 'YYYY-MM-DD')) asc`);

    // ── 3. Terminal / disqualification stage breakdown ──────────────────────
    const terminalRows = await db
      .select({ stage: engagementsTable.sdrStage, count: sql<number>`count(*)::int` })
      .from(engagementsTable)
      .where(and(sdrOnly, inArray(engagementsTable.sdrStage, TERMINAL_STAGES)))
      .groupBy(engagementsTable.sdrStage);

    // ── 4. Overdue follow-ups (detail list) ────────────────────────────────
    const overdueRows = await db
      .select({
        id:              engagementsTable.id,
        title:           engagementsTable.title,
        orgName:         organisationsTable.name,
        repName:         sdrOwnerTable.fullName,
        nextCallDate:    engagementsTable.nextCallDate,
        lastCallOutcome: engagementsTable.lastCallOutcome,
        followUpReason:  engagementsTable.followUpReason,
        sdrStage:        engagementsTable.sdrStage,
      })
      .from(engagementsTable)
      .leftJoin(organisationsTable, eq(engagementsTable.organisationId, organisationsTable.id))
      .leftJoin(sdrOwnerTable, eq(engagementsTable.sdrOwnerUserId, sdrOwnerTable.id))
      .where(and(
        sdrOnly,
        eq(engagementsTable.followUpRequired, true),
        isNotNull(engagementsTable.nextCallDate),
        sql`${engagementsTable.nextCallDate} < ${today}`,
      ))
      .orderBy(engagementsTable.nextCallDate)
      .limit(20);

    // ── 5. Build weeks scaffold (fill gaps with 0) ─────────────────────────
    const weekMap: Record<string, number> = {};
    for (const r of meetingsWeekRows) {
      if (r.weekStart) weekMap[r.weekStart.slice(0, 10)] = r.count;
    }
    const meetingsByWeek: { week: string; count: number }[] = [];
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now);
      const dayOfWeek = d.getDay();
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      d.setDate(d.getDate() + daysToMonday - i * 7);
      const key = d.toISOString().split("T")[0];
      const label = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
      meetingsByWeek.push({ week: label, count: weekMap[key] ?? 0 });
    }

    res.json({
      repPerformance: repPerfRows.map((r) => ({
        repId:            r.repId,
        repName:          r.repName ?? "Unassigned",
        total:            r.total,
        callsMade:        r.callsMade,
        contactMade:      r.contactMade,
        meetingsBooked:   r.meetingsBooked,
        qualified:        r.qualified,
        overdueFollowUps: r.overdueFollowUps,
      })),
      meetingsByWeek,
      terminalStageDistribution: terminalRows.map((r) => ({
        stage: r.stage ?? "unknown",
        label: r.stage ? (TERMINAL_LABELS[r.stage] ?? r.stage) : "Unknown",
        count: r.count,
      })),
      overdueFollowUps: overdueRows.map((r) => ({
        id:              r.id,
        title:           r.title,
        orgName:         r.orgName ?? null,
        repName:         r.repName ?? null,
        nextCallDate:    r.nextCallDate ?? null,
        lastCallOutcome: r.lastCallOutcome ?? null,
        followUpReason:  r.followUpReason ?? null,
        sdrStage:        r.sdrStage ?? null,
      })),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
