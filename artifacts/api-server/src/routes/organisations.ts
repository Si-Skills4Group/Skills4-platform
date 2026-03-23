import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { organisationsTable, contactsTable, engagementsTable, usersTable } from "@workspace/db/schema";
import { eq, ilike, and, sql, or } from "drizzle-orm";
import { requireMinRole } from "../middlewares/requireRole";

const router: IRouter = Router();

async function withCounts(org: typeof organisationsTable.$inferSelect) {
  const [contactCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contactsTable)
    .where(eq(contactsTable.organisationId, org.id));
  const [engagementCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(engagementsTable)
    .where(eq(engagementsTable.organisationId, org.id));
  return {
    ...org,
    contactCount: contactCount?.count ?? 0,
    engagementCount: engagementCount?.count ?? 0,
    createdAt: org.createdAt.toISOString(),
    updatedAt: org.updatedAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  try {
    const { search, type, sector, region, status } = req.query as Record<string, string>;
    const conditions = [];
    if (search) {
      conditions.push(
        or(
          ilike(organisationsTable.name, `%${search}%`),
          ilike(organisationsTable.sector, `%${search}%`),
          ilike(organisationsTable.region, `%${search}%`)
        )
      );
    }
    if (type) conditions.push(eq(organisationsTable.type, type));
    if (sector) conditions.push(eq(organisationsTable.sector, sector));
    if (region) conditions.push(ilike(organisationsTable.region, `%${region}%`));
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

    const result = await Promise.all(
      orgs.map(async (org) => {
        let ownerName = null;
        if (org.ownerUserId) {
          const [user] = await db.select({ fullName: usersTable.fullName }).from(usersTable).where(eq(usersTable.id, org.ownerUserId));
          ownerName = user?.fullName ?? null;
        }
        return {
          ...org,
          ownerName,
          contactCount: contactMap.get(org.id) ?? 0,
          engagementCount: engagementMap.get(org.id) ?? 0,
          createdAt: org.createdAt.toISOString(),
          updatedAt: org.updatedAt.toISOString(),
        };
      })
    );

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

    let ownerName = null;
    if (org.ownerUserId) {
      const [user] = await db.select({ fullName: usersTable.fullName }).from(usersTable).where(eq(usersTable.id, org.ownerUserId));
      ownerName = user?.fullName ?? null;
    }
    res.json({ ...(await withCounts(org)), ownerName });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", requireMinRole("engagement_user"), async (req, res) => {
  try {
    const [org] = await db.insert(organisationsTable).values({ ...req.body, updatedAt: new Date() }).returning();
    let ownerName = null;
    if (org.ownerUserId) {
      const [user] = await db.select({ fullName: usersTable.fullName }).from(usersTable).where(eq(usersTable.id, org.ownerUserId));
      ownerName = user?.fullName ?? null;
    }
    res.status(201).json({ ...(await withCounts(org)), ownerName });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", requireMinRole("engagement_user"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [org] = await db.update(organisationsTable).set({ ...req.body, updatedAt: new Date() }).where(eq(organisationsTable.id, id)).returning();
    if (!org) return res.status(404).json({ error: "Not found" });
    let ownerName = null;
    if (org.ownerUserId) {
      const [user] = await db.select({ fullName: usersTable.fullName }).from(usersTable).where(eq(usersTable.id, org.ownerUserId));
      ownerName = user?.fullName ?? null;
    }
    res.json({ ...(await withCounts(org)), ownerName });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", requireMinRole("crm_manager"), async (req, res) => {
  try {
    await db.delete(organisationsTable).where(eq(organisationsTable.id, Number(req.params.id)));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
