import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { organisationsTable, contactsTable, engagementsTable } from "@workspace/db/schema";
import { eq, ilike, and, sql, or } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    const { search, industry, status } = req.query as Record<string, string>;

    const conditions = [];
    if (search) {
      conditions.push(
        or(
          ilike(organisationsTable.name, `%${search}%`),
          ilike(organisationsTable.city, `%${search}%`),
          ilike(organisationsTable.industry, `%${search}%`)
        )
      );
    }
    if (industry) conditions.push(eq(organisationsTable.industry, industry));
    if (status) conditions.push(eq(organisationsTable.status, status));

    const orgs = await db
      .select()
      .from(organisationsTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(organisationsTable.name);

    const contactCounts = await db
      .select({ organisationId: contactsTable.organisationId, count: sql<number>`count(*)::int` })
      .from(contactsTable)
      .groupBy(contactsTable.organisationId);

    const engagementCounts = await db
      .select({ organisationId: engagementsTable.organisationId, count: sql<number>`count(*)::int` })
      .from(engagementsTable)
      .groupBy(engagementsTable.organisationId);

    const contactMap = new Map(contactCounts.map((c) => [c.organisationId, c.count]));
    const engagementMap = new Map(engagementCounts.map((e) => [e.organisationId, e.count]));

    const result = orgs.map((org) => ({
      ...org,
      contactCount: contactMap.get(org.id) ?? 0,
      engagementCount: engagementMap.get(org.id) ?? 0,
      createdAt: org.createdAt.toISOString(),
      updatedAt: org.updatedAt.toISOString(),
    }));

    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [org] = await db.select().from(organisationsTable).where(eq(organisationsTable.id, id));
    if (!org) return res.status(404).json({ error: "Not found" });

    const [contactCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(contactsTable)
      .where(eq(contactsTable.organisationId, id));

    const [engagementCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(engagementsTable)
      .where(eq(engagementsTable.organisationId, id));

    res.json({
      ...org,
      contactCount: contactCount?.count ?? 0,
      engagementCount: engagementCount?.count ?? 0,
      createdAt: org.createdAt.toISOString(),
      updatedAt: org.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", async (req, res) => {
  try {
    const [org] = await db
      .insert(organisationsTable)
      .values({ ...req.body, updatedAt: new Date() })
      .returning();
    res.status(201).json({
      ...org,
      contactCount: 0,
      engagementCount: 0,
      createdAt: org.createdAt.toISOString(),
      updatedAt: org.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [org] = await db
      .update(organisationsTable)
      .set({ ...req.body, updatedAt: new Date() })
      .where(eq(organisationsTable.id, id))
      .returning();
    if (!org) return res.status(404).json({ error: "Not found" });

    const [contactCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(contactsTable)
      .where(eq(contactsTable.organisationId, id));

    const [engagementCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(engagementsTable)
      .where(eq(engagementsTable.organisationId, id));

    res.json({
      ...org,
      contactCount: contactCount?.count ?? 0,
      engagementCount: engagementCount?.count ?? 0,
      createdAt: org.createdAt.toISOString(),
      updatedAt: org.updatedAt.toISOString(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(organisationsTable).where(eq(organisationsTable.id, id));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
