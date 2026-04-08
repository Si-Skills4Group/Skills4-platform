import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { organisationsTable, contactsTable, engagementsTable, tasksTable } from "@workspace/db/schema";
import { eq, sql, and, or, ne, gt, lt, isNotNull, inArray } from "drizzle-orm";

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

export default router;
