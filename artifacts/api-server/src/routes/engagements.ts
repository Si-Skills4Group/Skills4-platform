import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { engagementsTable, organisationsTable, contactsTable } from "@workspace/db/schema";
import { eq, ilike, and, or } from "drizzle-orm";

const router: IRouter = Router();

function formatEngagement(
  eng: typeof engagementsTable.$inferSelect,
  orgName?: string | null,
  contactName?: string | null
) {
  return {
    ...eng,
    value: eng.value ? Number(eng.value) : null,
    organisationName: orgName ?? null,
    contactName: contactName ?? null,
    createdAt: eng.createdAt.toISOString(),
    updatedAt: eng.updatedAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  try {
    const { search, stage, organisationId } = req.query as Record<string, string>;

    const conditions = [];
    if (search) {
      conditions.push(
        or(
          ilike(engagementsTable.title, `%${search}%`),
          ilike(engagementsTable.description, `%${search}%`)
        )
      );
    }
    if (stage) conditions.push(eq(engagementsTable.stage, stage));
    if (organisationId) conditions.push(eq(engagementsTable.organisationId, Number(organisationId)));

    const rows = await db
      .select({
        engagement: engagementsTable,
        orgName: organisationsTable.name,
        contactFirstName: contactsTable.firstName,
        contactLastName: contactsTable.lastName,
      })
      .from(engagementsTable)
      .leftJoin(organisationsTable, eq(engagementsTable.organisationId, organisationsTable.id))
      .leftJoin(contactsTable, eq(engagementsTable.contactId, contactsTable.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(engagementsTable.updatedAt);

    res.json(
      rows.map((r) =>
        formatEngagement(
          r.engagement,
          r.orgName,
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
        engagement: engagementsTable,
        orgName: organisationsTable.name,
        contactFirstName: contactsTable.firstName,
        contactLastName: contactsTable.lastName,
      })
      .from(engagementsTable)
      .leftJoin(organisationsTable, eq(engagementsTable.organisationId, organisationsTable.id))
      .leftJoin(contactsTable, eq(engagementsTable.contactId, contactsTable.id))
      .where(eq(engagementsTable.id, id));

    if (!row) return res.status(404).json({ error: "Not found" });

    res.json(
      formatEngagement(
        row.engagement,
        row.orgName,
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
    const body = { ...req.body };
    if (body.value !== undefined && body.value !== null) body.value = String(body.value);

    const [eng] = await db
      .insert(engagementsTable)
      .values({ ...body, updatedAt: new Date() })
      .returning();

    let orgName = null;
    let contactName = null;
    if (eng.organisationId) {
      const [org] = await db
        .select({ name: organisationsTable.name })
        .from(organisationsTable)
        .where(eq(organisationsTable.id, eng.organisationId));
      orgName = org?.name ?? null;
    }
    if (eng.contactId) {
      const [c] = await db
        .select({ firstName: contactsTable.firstName, lastName: contactsTable.lastName })
        .from(contactsTable)
        .where(eq(contactsTable.id, eng.contactId));
      contactName = c ? `${c.firstName} ${c.lastName}` : null;
    }

    res.status(201).json(formatEngagement(eng, orgName, contactName));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const body = { ...req.body };
    if (body.value !== undefined && body.value !== null) body.value = String(body.value);

    const [eng] = await db
      .update(engagementsTable)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(engagementsTable.id, id))
      .returning();

    if (!eng) return res.status(404).json({ error: "Not found" });

    let orgName = null;
    let contactName = null;
    if (eng.organisationId) {
      const [org] = await db
        .select({ name: organisationsTable.name })
        .from(organisationsTable)
        .where(eq(organisationsTable.id, eng.organisationId));
      orgName = org?.name ?? null;
    }
    if (eng.contactId) {
      const [c] = await db
        .select({ firstName: contactsTable.firstName, lastName: contactsTable.lastName })
        .from(contactsTable)
        .where(eq(contactsTable.id, eng.contactId));
      contactName = c ? `${c.firstName} ${c.lastName}` : null;
    }

    res.json(formatEngagement(eng, orgName, contactName));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(engagementsTable).where(eq(engagementsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
