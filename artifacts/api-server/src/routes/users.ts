import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "../middlewares/requireRole";

const router: IRouter = Router();

const safeUser = (u: typeof usersTable.$inferSelect) => ({
  id: u.id,
  fullName: u.fullName,
  email: u.email,
  role: u.role,
  isActive: u.isActive,
  createdAt: u.createdAt.toISOString(),
  updatedAt: u.updatedAt.toISOString(),
});

router.get("/", async (req, res) => {
  try {
    const users = await db.select().from(usersTable).orderBy(usersTable.fullName);
    res.json(users.map(safeUser));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, Number(req.params.id)));
    if (!user) return res.status(404).json({ error: "Not found" });
    res.json(safeUser(user));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", requireRole("admin"), async (req, res) => {
  try {
    const { passwordHash: _ph, ...body } = req.body;
    const [user] = await db.update(usersTable).set({ ...body, updatedAt: new Date() }).where(eq(usersTable.id, Number(req.params.id))).returning();
    if (!user) return res.status(404).json({ error: "Not found" });
    res.json(safeUser(user));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
