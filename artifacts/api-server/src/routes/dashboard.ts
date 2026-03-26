import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { organisationsTable, contactsTable, engagementsTable, tasksTable } from "@workspace/db/schema";
import { eq, sql, and, or, ne, gt, isNotNull } from "drizzle-orm";

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

export default router;
