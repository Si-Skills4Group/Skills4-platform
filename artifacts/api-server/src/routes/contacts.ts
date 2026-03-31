import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { contactsTable, organisationsTable } from "@workspace/db/schema";
import { eq, ilike, and, or } from "drizzle-orm";
import { requireMinRole } from "../middlewares/requireRole";
import { logActivity } from "../lib/logActivity";

const router: IRouter = Router();

function format(contact: typeof contactsTable.$inferSelect, orgName?: string | null) {
  return {
    ...contact,
    organisationName: orgName ?? null,
    createdAt: contact.createdAt.toISOString(),
    updatedAt: contact.updatedAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  try {
    const { search, organisationId } = req.query as Record<string, string>;
    const conditions = [];
    if (search) {
      conditions.push(
        or(
          ilike(contactsTable.firstName, `%${search}%`),
          ilike(contactsTable.lastName, `%${search}%`),
          ilike(contactsTable.email, `%${search}%`),
          ilike(contactsTable.jobTitle, `%${search}%`)
        )
      );
    }
    if (organisationId) conditions.push(eq(contactsTable.organisationId, Number(organisationId)));

    const rows = await db
      .select({ contact: contactsTable, orgName: organisationsTable.name })
      .from(contactsTable)
      .leftJoin(organisationsTable, eq(contactsTable.organisationId, organisationsTable.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(contactsTable.lastName, contactsTable.firstName);

    res.json(rows.map((r) => format(r.contact, r.orgName)));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const [row] = await db
      .select({ contact: contactsTable, orgName: organisationsTable.name })
      .from(contactsTable)
      .leftJoin(organisationsTable, eq(contactsTable.organisationId, organisationsTable.id))
      .where(eq(contactsTable.id, Number(req.params.id)));
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(format(row.contact, row.orgName));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", requireMinRole("engagement_user"), async (req, res) => {
  try {
    const [contact] = await db.insert(contactsTable).values({ ...req.body, updatedAt: new Date() }).returning();
    let orgName = null;
    if (contact.organisationId) {
      const [org] = await db.select({ name: organisationsTable.name }).from(organisationsTable).where(eq(organisationsTable.id, contact.organisationId));
      orgName = org?.name ?? null;
    }
    void logActivity("contact_added", "contact", contact.id, req.user?.id, {
      contactName: `${contact.firstName} ${contact.lastName}`,
      organisationId: contact.organisationId,
      orgName,
    });
    if (contact.organisationId) {
      void logActivity("contact_added", "organisation", contact.organisationId, req.user?.id, {
        contactName: `${contact.firstName} ${contact.lastName}`,
        contactId: contact.id,
      });
    }
    res.status(201).json(format(contact, orgName));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", requireMinRole("engagement_user"), async (req, res) => {
  try {
    const [contact] = await db.update(contactsTable).set({ ...req.body, updatedAt: new Date() }).where(eq(contactsTable.id, Number(req.params.id))).returning();
    if (!contact) return res.status(404).json({ error: "Not found" });
    let orgName = null;
    if (contact.organisationId) {
      const [org] = await db.select({ name: organisationsTable.name }).from(organisationsTable).where(eq(organisationsTable.id, contact.organisationId));
      orgName = org?.name ?? null;
    }
    res.json(format(contact, orgName));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", requireMinRole("crm_manager"), async (req, res) => {
  try {
    await db.delete(contactsTable).where(eq(contactsTable.id, Number(req.params.id)));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
