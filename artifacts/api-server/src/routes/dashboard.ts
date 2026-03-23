import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { organisationsTable, contactsTable, engagementsTable, tasksTable } from "@workspace/db/schema";
import { eq, sql, and, or, ne } from "drizzle-orm";

const router: IRouter = Router();

router.get("/summary", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const [[orgCount], [contactCount], [engCount], [openTaskCount], [overdueCount]] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(organisationsTable),
      db.select({ count: sql<number>`count(*)::int` }).from(contactsTable),
      db.select({ count: sql<number>`count(*)::int` }).from(engagementsTable).where(eq(engagementsTable.status, "open")),
      db.select({ count: sql<number>`count(*)::int` }).from(tasksTable).where(or(eq(tasksTable.status, "open"), eq(tasksTable.status, "in_progress"))),
      db.select({ count: sql<number>`count(*)::int` }).from(tasksTable).where(eq(tasksTable.status, "overdue")),
    ]);

    const stageRows = await db
      .select({ stage: engagementsTable.stage, count: sql<number>`count(*)::int` })
      .from(engagementsTable)
      .groupBy(engagementsTable.stage);

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

    res.json({
      totalOrganisations: orgCount?.count ?? 0,
      totalContacts: contactCount?.count ?? 0,
      totalEngagements: engCount?.count ?? 0,
      openTasks: openTaskCount?.count ?? 0,
      overdueTasks: overdueCount?.count ?? 0,
      engagementsByStage: stageRows.map((r) => ({ stage: r.stage, count: r.count })),
      recentEngagements: recentEngagementRows.map((r) => ({
        ...r.engagement,
        expectedValue: r.engagement.expectedValue ? Number(r.engagement.expectedValue) : null,
        organisationName: r.orgName ?? null,
        contactName: null,
        ownerName: null,
        createdAt: r.engagement.createdAt.toISOString(),
        updatedAt: r.engagement.updatedAt.toISOString(),
      })),
      upcomingTasks: upcomingTaskRows.map((r) => ({
        ...r.task,
        organisationName: r.orgName ?? null,
        engagementTitle: r.engTitle ?? null,
        assignedUserName: null,
        createdAt: r.task.createdAt.toISOString(),
        updatedAt: r.task.updatedAt.toISOString(),
      })),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
