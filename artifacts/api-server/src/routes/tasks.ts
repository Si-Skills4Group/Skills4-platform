import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { tasksTable, organisationsTable, engagementsTable, contactsTable } from "@workspace/db/schema";
import { eq, ilike, and, or } from "drizzle-orm";

const router: IRouter = Router();

function formatTask(
  task: typeof tasksTable.$inferSelect,
  orgName?: string | null,
  engagementTitle?: string | null,
  contactName?: string | null
) {
  return {
    ...task,
    organisationName: orgName ?? null,
    engagementTitle: engagementTitle ?? null,
    contactName: contactName ?? null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  try {
    const { search, status, organisationId, engagementId } = req.query as Record<string, string>;

    const conditions = [];
    if (search) {
      conditions.push(
        or(
          ilike(tasksTable.title, `%${search}%`),
          ilike(tasksTable.description, `%${search}%`)
        )
      );
    }
    if (status) conditions.push(eq(tasksTable.status, status));
    if (organisationId) conditions.push(eq(tasksTable.organisationId, Number(organisationId)));
    if (engagementId) conditions.push(eq(tasksTable.engagementId, Number(engagementId)));

    const rows = await db
      .select({
        task: tasksTable,
        orgName: organisationsTable.name,
        engTitle: engagementsTable.title,
        contactFirstName: contactsTable.firstName,
        contactLastName: contactsTable.lastName,
      })
      .from(tasksTable)
      .leftJoin(organisationsTable, eq(tasksTable.organisationId, organisationsTable.id))
      .leftJoin(engagementsTable, eq(tasksTable.engagementId, engagementsTable.id))
      .leftJoin(contactsTable, eq(tasksTable.contactId, contactsTable.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(tasksTable.dueDate, tasksTable.priority);

    res.json(
      rows.map((r) =>
        formatTask(
          r.task,
          r.orgName,
          r.engTitle,
          r.contactFirstName && r.contactLastName
            ? `${r.contactFirstName} ${r.contactLastName}`
            : null
        )
      )
    );
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [row] = await db
      .select({
        task: tasksTable,
        orgName: organisationsTable.name,
        engTitle: engagementsTable.title,
        contactFirstName: contactsTable.firstName,
        contactLastName: contactsTable.lastName,
      })
      .from(tasksTable)
      .leftJoin(organisationsTable, eq(tasksTable.organisationId, organisationsTable.id))
      .leftJoin(engagementsTable, eq(tasksTable.engagementId, engagementsTable.id))
      .leftJoin(contactsTable, eq(tasksTable.contactId, contactsTable.id))
      .where(eq(tasksTable.id, id));

    if (!row) return res.status(404).json({ error: "Not found" });

    res.json(
      formatTask(
        row.task,
        row.orgName,
        row.engTitle,
        row.contactFirstName && row.contactLastName
          ? `${row.contactFirstName} ${row.contactLastName}`
          : null
      )
    );
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const [task] = await db
      .insert(tasksTable)
      .values({ ...req.body, updatedAt: new Date() })
      .returning();

    let orgName = null, engTitle = null, contactName = null;
    if (task.organisationId) {
      const [o] = await db.select({ name: organisationsTable.name }).from(organisationsTable).where(eq(organisationsTable.id, task.organisationId));
      orgName = o?.name ?? null;
    }
    if (task.engagementId) {
      const [e] = await db.select({ title: engagementsTable.title }).from(engagementsTable).where(eq(engagementsTable.id, task.engagementId));
      engTitle = e?.title ?? null;
    }
    if (task.contactId) {
      const [c] = await db.select({ firstName: contactsTable.firstName, lastName: contactsTable.lastName }).from(contactsTable).where(eq(contactsTable.id, task.contactId));
      contactName = c ? `${c.firstName} ${c.lastName}` : null;
    }

    res.status(201).json(formatTask(task, orgName, engTitle, contactName));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [task] = await db
      .update(tasksTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(tasksTable.id, id))
      .returning();

    if (!task) return res.status(404).json({ error: "Not found" });

    let orgName = null, engTitle = null, contactName = null;
    if (task.organisationId) {
      const [o] = await db.select({ name: organisationsTable.name }).from(organisationsTable).where(eq(organisationsTable.id, task.organisationId));
      orgName = o?.name ?? null;
    }
    if (task.engagementId) {
      const [e] = await db.select({ title: engagementsTable.title }).from(engagementsTable).where(eq(engagementsTable.id, task.engagementId));
      engTitle = e?.title ?? null;
    }
    if (task.contactId) {
      const [c] = await db.select({ firstName: contactsTable.firstName, lastName: contactsTable.lastName }).from(contactsTable).where(eq(contactsTable.id, task.contactId));
      contactName = c ? `${c.firstName} ${c.lastName}` : null;
    }

    res.json(formatTask(task, orgName, engTitle, contactName));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(tasksTable).where(eq(tasksTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
