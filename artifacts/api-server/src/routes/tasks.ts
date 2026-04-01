import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { tasksTable, organisationsTable, engagementsTable, usersTable } from "@workspace/db/schema";
import { eq, ilike, and, or, sql, lt } from "drizzle-orm";
import { requireMinRole } from "../middlewares/requireRole";
import { logActivity } from "../lib/logActivity";

const router: IRouter = Router();

/**
 * markOverdueTasks — set status to "overdue" for any open/in_progress task
 * whose due_date is before today.
 *
 * Called on every GET /api/tasks to keep status current without a background scheduler.
 *
 * D365 migration path:
 *   Replace with a scheduled Power Automate cloud flow (e.g., daily at 00:00) that
 *   queries all open Task activities where scheduledend < today and sets statuscode
 *   to a custom "Overdue" status reason under the Open status.
 */
async function markOverdueTasks() {
  const today = new Date().toISOString().split("T")[0];
  await db
    .update(tasksTable)
    .set({ status: "overdue", updatedAt: new Date() })
    .where(
      and(
        or(eq(tasksTable.status, "open"), eq(tasksTable.status, "in_progress")),
        sql`${tasksTable.dueDate} < ${today}`,
      ),
    );
}

function format(
  task: typeof tasksTable.$inferSelect,
  orgName?: string | null,
  engagementTitle?: string | null,
  assignedUserName?: string | null
) {
  return {
    ...task,
    organisationName: orgName ?? null,
    engagementTitle: engagementTitle ?? null,
    assignedUserName: assignedUserName ?? null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  try {
    await markOverdueTasks();
    const { search, status, priority, organisationId, engagementId } = req.query as Record<string, string>;
    const conditions = [];
    if (search) conditions.push(or(ilike(tasksTable.title, `%${search}%`), ilike(tasksTable.description, `%${search}%`)));
    if (status) conditions.push(eq(tasksTable.status, status));
    if (priority) conditions.push(eq(tasksTable.priority, priority));
    if (organisationId) conditions.push(eq(tasksTable.organisationId, Number(organisationId)));
    if (engagementId) conditions.push(eq(tasksTable.engagementId, Number(engagementId)));

    const rows = await db
      .select({
        task: tasksTable,
        orgName: organisationsTable.name,
        engTitle: engagementsTable.title,
        userFullName: usersTable.fullName,
      })
      .from(tasksTable)
      .leftJoin(organisationsTable, eq(tasksTable.organisationId, organisationsTable.id))
      .leftJoin(engagementsTable, eq(tasksTable.engagementId, engagementsTable.id))
      .leftJoin(usersTable, eq(tasksTable.assignedUserId, usersTable.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(tasksTable.dueDate, tasksTable.priority);

    res.json(rows.map((r) => format(r.task, r.orgName, r.engTitle, r.userFullName)));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const [row] = await db
      .select({ task: tasksTable, orgName: organisationsTable.name, engTitle: engagementsTable.title, userFullName: usersTable.fullName })
      .from(tasksTable)
      .leftJoin(organisationsTable, eq(tasksTable.organisationId, organisationsTable.id))
      .leftJoin(engagementsTable, eq(tasksTable.engagementId, engagementsTable.id))
      .leftJoin(usersTable, eq(tasksTable.assignedUserId, usersTable.id))
      .where(eq(tasksTable.id, Number(req.params.id)));
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(format(row.task, row.orgName, row.engTitle, row.userFullName));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", requireMinRole("engagement_user"), async (req, res) => {
  try {
    const [task] = await db.insert(tasksTable).values({ ...req.body, updatedAt: new Date() }).returning();
    let orgName = null, engTitle = null, assignedUserName = null;
    if (task.organisationId) {
      const [o] = await db.select({ name: organisationsTable.name }).from(organisationsTable).where(eq(organisationsTable.id, task.organisationId));
      orgName = o?.name ?? null;
    }
    if (task.engagementId) {
      const [e] = await db.select({ title: engagementsTable.title }).from(engagementsTable).where(eq(engagementsTable.id, task.engagementId));
      engTitle = e?.title ?? null;
    }
    if (task.assignedUserId) {
      const [u] = await db.select({ fullName: usersTable.fullName }).from(usersTable).where(eq(usersTable.id, task.assignedUserId));
      assignedUserName = u?.fullName ?? null;
    }
    res.status(201).json(format(task, orgName, engTitle, assignedUserName));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", requireMinRole("engagement_user"), async (req, res) => {
  try {
    const taskId = Number(req.params.id);
    const [before] = await db.select({ status: tasksTable.status, title: tasksTable.title }).from(tasksTable).where(eq(tasksTable.id, taskId));
    const [task] = await db.update(tasksTable).set({ ...req.body, updatedAt: new Date() }).where(eq(tasksTable.id, taskId)).returning();
    if (!task) return res.status(404).json({ error: "Not found" });
    let orgName = null, engTitle = null, assignedUserName = null;
    if (task.organisationId) {
      const [o] = await db.select({ name: organisationsTable.name }).from(organisationsTable).where(eq(organisationsTable.id, task.organisationId));
      orgName = o?.name ?? null;
    }
    if (task.engagementId) {
      const [e] = await db.select({ title: engagementsTable.title }).from(engagementsTable).where(eq(engagementsTable.id, task.engagementId));
      engTitle = e?.title ?? null;
    }
    if (task.assignedUserId) {
      const [u] = await db.select({ fullName: usersTable.fullName }).from(usersTable).where(eq(usersTable.id, task.assignedUserId));
      assignedUserName = u?.fullName ?? null;
    }

    if (req.body.status === "completed" && before?.status !== "completed") {
      void logActivity("task_completed", "task", task.id, req.user?.id, {
        taskTitle: task.title, organisationId: task.organisationId, engagementId: task.engagementId, orgName, engTitle,
      });
      if (task.engagementId) {
        void logActivity("task_completed", "engagement", task.engagementId, req.user?.id, {
          taskTitle: task.title, taskId: task.id, orgName,
        });
      }
      if (task.organisationId) {
        void logActivity("task_completed", "organisation", task.organisationId, req.user?.id, {
          taskTitle: task.title, taskId: task.id, engagementId: task.engagementId,
        });
      }
    }

    res.json(format(task, orgName, engTitle, assignedUserName));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", requireMinRole("crm_manager"), async (req, res) => {
  try {
    await db.delete(tasksTable).where(eq(tasksTable.id, Number(req.params.id)));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
