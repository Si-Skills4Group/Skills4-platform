import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { activityLogTable, usersTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req, res) => {
  try {
    const { entityType, entityId } = req.query as Record<string, string>;
    if (!entityType || !entityId) {
      return res.status(400).json({ error: "entityType and entityId are required" });
    }

    const rows = await db
      .select({
        log: activityLogTable,
        actorName: usersTable.fullName,
        actorEmail: usersTable.email,
      })
      .from(activityLogTable)
      .leftJoin(usersTable, eq(activityLogTable.actorUserId, usersTable.id))
      .where(
        and(
          eq(activityLogTable.entityType, entityType),
          eq(activityLogTable.entityId, Number(entityId))
        )
      )
      .orderBy(desc(activityLogTable.createdAt))
      .limit(50);

    res.json(
      rows.map((r) => ({
        ...r.log,
        actorName: r.actorName ?? null,
        actorEmail: r.actorEmail ?? null,
        createdAt: r.log.createdAt.toISOString(),
      }))
    );
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
