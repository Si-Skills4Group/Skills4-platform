import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { engagementsTable, organisationsTable, contactsTable, usersTable } from "@workspace/db/schema";
import { eq, ilike, and, or } from "drizzle-orm";

const router: IRouter = Router();

function format(
  eng: typeof engagementsTable.$inferSelect,
  orgName?: string | null,
  contactName?: string | null,
  ownerName?: string | null
) {
  return {
    ...eng,
    expectedValue: eng.expectedValue ? Number(eng.expectedValue) : null,
    organisationName: orgName ?? null,
    contactName: contactName ?? null,
    ownerName: ownerName ?? null,
    createdAt: eng.createdAt.toISOString(),
    updatedAt: eng.updatedAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  try {
    const { search, stage, status, organisationId } = req.query as Record<string, string>;
    const conditions = [];
    if (search) conditions.push(or(ilike(engagementsTable.title, `%${search}%`), ilike(engagementsTable.notes, `%${search}%`)));
    if (stage) conditions.push(eq(engagementsTable.stage, stage));
    if (status) conditions.push(eq(engagementsTable.status, status));
    if (organisationId) conditions.push(eq(engagementsTable.organisationId, Number(organisationId)));

    const rows = await db
      .select({
        engagement: engagementsTable,
        orgName: organisationsTable.name,
        contactFirstName: contactsTable.firstName,
        contactLastName: contactsTable.lastName,
        ownerFullName: usersTable.fullName,
      })
      .from(engagementsTable)
      .leftJoin(organisationsTable, eq(engagementsTable.organisationId, organisationsTable.id))
      .leftJoin(contactsTable, eq(engagementsTable.primaryContactId, contactsTable.id))
      .leftJoin(usersTable, eq(engagementsTable.ownerUserId, usersTable.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(engagementsTable.updatedAt);

    res.json(
      rows.map((r) =>
        format(
          r.engagement,
          r.orgName,
          r.contactFirstName && r.contactLastName ? `${r.contactFirstName} ${r.contactLastName}` : null,
          r.ownerFullName
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
    const [row] = await db
      .select({
        engagement: engagementsTable,
        orgName: organisationsTable.name,
        contactFirstName: contactsTable.firstName,
        contactLastName: contactsTable.lastName,
        ownerFullName: usersTable.fullName,
      })
      .from(engagementsTable)
      .leftJoin(organisationsTable, eq(engagementsTable.organisationId, organisationsTable.id))
      .leftJoin(contactsTable, eq(engagementsTable.primaryContactId, contactsTable.id))
      .leftJoin(usersTable, eq(engagementsTable.ownerUserId, usersTable.id))
      .where(eq(engagementsTable.id, Number(req.params.id)));

    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(
      format(
        row.engagement,
        row.orgName,
        row.contactFirstName && row.contactLastName ? `${row.contactFirstName} ${row.contactLastName}` : null,
        row.ownerFullName
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
    if (body.expectedValue != null) body.expectedValue = String(body.expectedValue);
    const [eng] = await db.insert(engagementsTable).values({ ...body, updatedAt: new Date() }).returning();

    let orgName = null, contactName = null, ownerName = null;
    if (eng.organisationId) {
      const [o] = await db.select({ name: organisationsTable.name }).from(organisationsTable).where(eq(organisationsTable.id, eng.organisationId));
      orgName = o?.name ?? null;
    }
    if (eng.primaryContactId) {
      const [c] = await db.select({ firstName: contactsTable.firstName, lastName: contactsTable.lastName }).from(contactsTable).where(eq(contactsTable.id, eng.primaryContactId));
      contactName = c ? `${c.firstName} ${c.lastName}` : null;
    }
    if (eng.ownerUserId) {
      const [u] = await db.select({ fullName: usersTable.fullName }).from(usersTable).where(eq(usersTable.id, eng.ownerUserId));
      ownerName = u?.fullName ?? null;
    }
    res.status(201).json(format(eng, orgName, contactName, ownerName));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const body = { ...req.body };
    if (body.expectedValue != null) body.expectedValue = String(body.expectedValue);
    const [eng] = await db.update(engagementsTable).set({ ...body, updatedAt: new Date() }).where(eq(engagementsTable.id, Number(req.params.id))).returning();
    if (!eng) return res.status(404).json({ error: "Not found" });

    let orgName = null, contactName = null, ownerName = null;
    if (eng.organisationId) {
      const [o] = await db.select({ name: organisationsTable.name }).from(organisationsTable).where(eq(organisationsTable.id, eng.organisationId));
      orgName = o?.name ?? null;
    }
    if (eng.primaryContactId) {
      const [c] = await db.select({ firstName: contactsTable.firstName, lastName: contactsTable.lastName }).from(contactsTable).where(eq(contactsTable.id, eng.primaryContactId));
      contactName = c ? `${c.firstName} ${c.lastName}` : null;
    }
    if (eng.ownerUserId) {
      const [u] = await db.select({ fullName: usersTable.fullName }).from(usersTable).where(eq(usersTable.id, eng.ownerUserId));
      ownerName = u?.fullName ?? null;
    }
    res.json(format(eng, orgName, contactName, ownerName));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await db.delete(engagementsTable).where(eq(engagementsTable.id, Number(req.params.id)));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
