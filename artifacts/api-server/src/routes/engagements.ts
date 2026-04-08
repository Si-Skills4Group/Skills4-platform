import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { engagementsTable, organisationsTable, contactsTable, usersTable, tasksTable } from "@workspace/db/schema";
import { eq, ilike, and, or, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { requireMinRole } from "../middlewares/requireRole";
import { logActivity } from "../lib/logActivity";

const router: IRouter = Router();

const sdrOwnerTable = alias(usersTable, "sdr_owner");
const handoverOwnerTable = alias(usersTable, "handover_owner");

function format(
  eng: typeof engagementsTable.$inferSelect,
  orgName?: string | null,
  contactName?: string | null,
  ownerName?: string | null,
  sdrOwnerName?: string | null,
  handoverOwnerName?: string | null
) {
  return {
    ...eng,
    expectedValue: eng.expectedValue ? Number(eng.expectedValue) : null,
    organisationName: orgName ?? null,
    contactName: contactName ?? null,
    ownerName: ownerName ?? null,
    sdrOwnerName: sdrOwnerName ?? null,
    handoverOwnerName: handoverOwnerName ?? null,
    createdAt: eng.createdAt.toISOString(),
    updatedAt: eng.updatedAt.toISOString(),
  };
}

router.get("/", async (req, res) => {
  try {
    const { search, stage, status, organisationId, engagementType, sdrOwnerUserId } =
      req.query as Record<string, string>;
    const conditions = [];
    if (search) conditions.push(or(ilike(engagementsTable.title, `%${search}%`), ilike(engagementsTable.notes, `%${search}%`)));
    if (stage) conditions.push(eq(engagementsTable.stage, stage));
    if (status) conditions.push(eq(engagementsTable.status, status));
    if (organisationId) conditions.push(eq(engagementsTable.organisationId, Number(organisationId)));
    if (engagementType) conditions.push(eq(engagementsTable.engagementType, engagementType));
    if (sdrOwnerUserId) conditions.push(eq(engagementsTable.sdrOwnerUserId, Number(sdrOwnerUserId)));

    const rows = await db
      .select({
        engagement: engagementsTable,
        orgName: organisationsTable.name,
        contactFirstName: contactsTable.firstName,
        contactLastName: contactsTable.lastName,
        ownerFullName: usersTable.fullName,
        sdrOwnerFullName: sdrOwnerTable.fullName,
        handoverOwnerFullName: handoverOwnerTable.fullName,
      })
      .from(engagementsTable)
      .leftJoin(organisationsTable, eq(engagementsTable.organisationId, organisationsTable.id))
      .leftJoin(contactsTable, eq(engagementsTable.primaryContactId, contactsTable.id))
      .leftJoin(usersTable, eq(engagementsTable.ownerUserId, usersTable.id))
      .leftJoin(sdrOwnerTable, eq(engagementsTable.sdrOwnerUserId, sdrOwnerTable.id))
      .leftJoin(handoverOwnerTable, eq(engagementsTable.handoverOwnerUserId, handoverOwnerTable.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(engagementsTable.updatedAt);

    res.json(
      rows.map((r) =>
        format(
          r.engagement,
          r.orgName,
          r.contactFirstName && r.contactLastName ? `${r.contactFirstName} ${r.contactLastName}` : null,
          r.ownerFullName,
          r.sdrOwnerFullName,
          r.handoverOwnerFullName
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
        sdrOwnerFullName: sdrOwnerTable.fullName,
        handoverOwnerFullName: handoverOwnerTable.fullName,
      })
      .from(engagementsTable)
      .leftJoin(organisationsTable, eq(engagementsTable.organisationId, organisationsTable.id))
      .leftJoin(contactsTable, eq(engagementsTable.primaryContactId, contactsTable.id))
      .leftJoin(usersTable, eq(engagementsTable.ownerUserId, usersTable.id))
      .leftJoin(sdrOwnerTable, eq(engagementsTable.sdrOwnerUserId, sdrOwnerTable.id))
      .leftJoin(handoverOwnerTable, eq(engagementsTable.handoverOwnerUserId, handoverOwnerTable.id))
      .where(eq(engagementsTable.id, Number(req.params.id)));

    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(
      format(
        row.engagement,
        row.orgName,
        row.contactFirstName && row.contactLastName ? `${row.contactFirstName} ${row.contactLastName}` : null,
        row.ownerFullName,
        row.sdrOwnerFullName,
        row.handoverOwnerFullName
      )
    );
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/", requireMinRole("engagement_user"), async (req, res) => {
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
    void logActivity("engagement_created", "engagement", eng.id, req.user?.id, {
      title: eng.title, stage: eng.stage, orgName, organisationId: eng.organisationId,
    });
    if (eng.organisationId) {
      void logActivity("engagement_created", "organisation", eng.organisationId, req.user?.id, {
        title: eng.title, engagementId: eng.id, stage: eng.stage,
      });
    }
    res.status(201).json(format(eng, orgName, contactName, ownerName));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/:id", requireMinRole("engagement_user"), async (req, res) => {
  try {
    const engId = Number(req.params.id);
    const body = { ...req.body };
    if (body.expectedValue != null) body.expectedValue = String(body.expectedValue);

    const [before] = await db.select({ stage: engagementsTable.stage }).from(engagementsTable).where(eq(engagementsTable.id, engId));
    const [eng] = await db.update(engagementsTable).set({ ...body, updatedAt: new Date() }).where(eq(engagementsTable.id, engId)).returning();
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

    // Automation: stage_changed — log when the engagement stage moves.
    // D365 migration: replace with a Business Process Flow stage history entry,
    // or a Power Automate flow triggered by Opportunity.salesstage field change.
    if (body.stage && before?.stage && body.stage !== before.stage) {
      void logActivity("stage_changed", "engagement", eng.id, req.user?.id, {
        stageFrom: before.stage, stageTo: body.stage, title: eng.title, status: eng.status,
      });
      if (eng.organisationId) {
        void logActivity("stage_changed", "organisation", eng.organisationId, req.user?.id, {
          stageFrom: before.stage, stageTo: body.stage, title: eng.title, engagementId: eng.id,
        });
      }
    }

    res.json(format(eng, orgName, contactName, ownerName));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:id/handover", requireMinRole("engagement_user"), async (req, res) => {
  try {
    const sdrId = Number(req.params.id);
    const { handoverOwnerUserId, handoverNotes, taskTitle, taskDueDate, taskDescription } = req.body as {
      handoverOwnerUserId: number;
      handoverNotes?: string;
      taskTitle?: string;
      taskDueDate?: string;
      taskDescription?: string;
    };

    if (!handoverOwnerUserId) {
      return res.status(400).json({ error: "handoverOwnerUserId is required" });
    }

    // 1. Load the SDR engagement
    const [sdrRow] = await db
      .select({
        engagement: engagementsTable,
        orgName: organisationsTable.name,
        contactFirstName: contactsTable.firstName,
        contactLastName: contactsTable.lastName,
      })
      .from(engagementsTable)
      .leftJoin(organisationsTable, eq(engagementsTable.organisationId, organisationsTable.id))
      .leftJoin(contactsTable, eq(engagementsTable.primaryContactId, contactsTable.id))
      .where(eq(engagementsTable.id, sdrId));

    if (!sdrRow) return res.status(404).json({ error: "Engagement not found" });

    const sdr = sdrRow.engagement;
    if (sdr.engagementType !== "sdr") {
      return res.status(400).json({ error: "Engagement is not an SDR record" });
    }

    const orgName = sdrRow.orgName ?? null;
    const contactName = sdrRow.contactFirstName && sdrRow.contactLastName
      ? `${sdrRow.contactFirstName} ${sdrRow.contactLastName}`
      : null;

    // 2. Check for an existing employer_engagement for the same organisation
    let existingEngagementId: number | null = null;
    let newEngagement: typeof engagementsTable.$inferSelect | null = null;

    if (sdr.organisationId) {
      const [existing] = await db
        .select({ id: engagementsTable.id })
        .from(engagementsTable)
        .where(and(
          eq(engagementsTable.organisationId, sdr.organisationId),
          eq(engagementsTable.engagementType, "employer_engagement"),
          ne(engagementsTable.id, sdrId),
        ))
        .limit(1);

      if (existing) {
        existingEngagementId = existing.id;
      }
    }

    // 3. Create new employer engagement if none exists
    if (!existingEngagementId) {
      const today = new Date().toISOString().split("T")[0];
      const combinedNotes = [sdr.notes, handoverNotes].filter(Boolean).join("\n\n---\n\n") || null;

      const [created] = await db.insert(engagementsTable).values({
        engagementType: "employer_engagement",
        organisationId: sdr.organisationId ?? undefined,
        primaryContactId: sdr.primaryContactId ?? undefined,
        ownerUserId: handoverOwnerUserId,
        title: orgName ? `${orgName} — Employer Engagement` : "Employer Engagement",
        stage: sdr.meetingBooked ? "meeting_booked" : "contacted",
        status: "open",
        notes: combinedNotes,
        lastContactDate: sdr.meetingDate ?? today,
        updatedAt: new Date(),
      }).returning();

      newEngagement = created;

      void logActivity("engagement_created", "engagement", created.id, req.user?.id, {
        title: created.title,
        stage: created.stage,
        orgName,
        organisationId: created.organisationId,
        via: "sdr_handover",
        sdrEngagementId: sdrId,
      });
    }

    // 4. Update the SDR engagement
    const [updatedSdr] = await db.update(engagementsTable).set({
      sdrStage: "qualified",
      qualificationStatus: "qualified",
      handoverStatus: "complete",
      handoverOwnerUserId,
      handoverNotes: handoverNotes ?? sdr.handoverNotes,
      updatedAt: new Date(),
    }).where(eq(engagementsTable.id, sdrId)).returning();

    // 5. Create follow-up task if requested
    let task: typeof tasksTable.$inferSelect | null = null;
    if (taskTitle) {
      const targetEngagementId = newEngagement?.id ?? existingEngagementId ?? undefined;
      const [createdTask] = await db.insert(tasksTable).values({
        title: taskTitle,
        dueDate: taskDueDate ?? undefined,
        description: taskDescription ?? undefined,
        assignedUserId: handoverOwnerUserId,
        organisationId: sdr.organisationId ?? undefined,
        engagementId: targetEngagementId,
        priority: "high",
        status: "open",
        updatedAt: new Date(),
      }).returning();
      task = createdTask;
    }

    // 6. Build response
    const [ownerRow] = await db
      .select({ fullName: usersTable.fullName })
      .from(usersTable)
      .where(eq(usersTable.id, handoverOwnerUserId));
    const ownerName = ownerRow?.fullName ?? null;

    const sdrFormatted = format(
      updatedSdr,
      orgName,
      contactName,
      updatedSdr.ownerUserId ? null : null,
      sdr.sdrOwnerUserId ? null : null,
      ownerName
    );

    const newEngagementFormatted = newEngagement
      ? format(newEngagement, orgName, contactName, ownerName)
      : null;

    const taskFormatted = task
      ? {
          ...task,
          organisationName: orgName,
          engagementTitle: newEngagement?.title ?? null,
          assignedUserName: ownerName,
          createdAt: task.createdAt.toISOString(),
          updatedAt: task.updatedAt.toISOString(),
        }
      : null;

    res.json({
      sdrEngagement: sdrFormatted,
      newEngagement: newEngagementFormatted,
      existingEngagementId,
      task: taskFormatted,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/:id", requireMinRole("crm_manager"), async (req, res) => {
  try {
    await db.delete(engagementsTable).where(eq(engagementsTable.id, Number(req.params.id)));
    res.status(204).send();
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
