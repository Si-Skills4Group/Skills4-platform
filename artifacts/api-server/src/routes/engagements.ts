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

    // ── Automation 1: SDR creation defaults ──────────────────────────────────
    // D365 migration: these defaults map to Power Automate flow on Opportunity create.
    if (body.engagementType === "sdr") {
      if (!body.sdrStage) body.sdrStage = "new";
      if (!body.sdrOwnerUserId && req.user?.id) body.sdrOwnerUserId = req.user.id;
    }

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

    // ── Automation 1b: auto-create first outreach task for new SDR prospects ─
    // D365 migration: replace with a Power Automate flow creating a Phone Call
    // Activity on Opportunity create when type = SDR.
    if (eng.engagementType === "sdr") {
      const taskAssignee = eng.sdrOwnerUserId ?? eng.ownerUserId ?? undefined;
      await db.insert(tasksTable).values({
        title: `Initial outreach — ${orgName ?? eng.title}`,
        organisationId: eng.organisationId ?? undefined,
        engagementId: eng.id,
        assignedUserId: taskAssignee,
        priority: "medium",
        status: "open",
        updatedAt: new Date(),
      });
      void logActivity("task_created", "engagement", eng.id, req.user?.id, {
        taskTitle: `Initial outreach — ${orgName ?? eng.title}`,
        via: "sdr_automation",
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

    const [before] = await db
      .select({
        stage: engagementsTable.stage,
        sdrStage: engagementsTable.sdrStage,
        meetingBooked: engagementsTable.meetingBooked,
        engagementType: engagementsTable.engagementType,
        sdrOwnerUserId: engagementsTable.sdrOwnerUserId,
        ownerUserId: engagementsTable.ownerUserId,
        organisationId: engagementsTable.organisationId,
        title: engagementsTable.title,
        qualificationStatus: engagementsTable.qualificationStatus,
      })
      .from(engagementsTable)
      .where(eq(engagementsTable.id, engId));

    if (!before) return res.status(404).json({ error: "Not found" });

    const isSdr = before.engagementType === "sdr";

    // ── Automation 4: disqualify requires a reason ────────────────────────────
    // D365 migration: enforce via Business Rule on Opportunity.statuscode field.
    if (isSdr && body.sdrStage === "disqualified" && !body.disqualificationReason) {
      return res.status(400).json({ error: "disqualificationReason is required when marking as disqualified" });
    }

    const today = new Date().toISOString().split("T")[0];

    // ── Automation 5: close status for terminal stages ────────────────────────
    const TERMINAL_SDR_STAGES = new Set(["disqualified", "do_not_contact", "bad_data", "changed_job"]);
    if (isSdr && body.sdrStage && TERMINAL_SDR_STAGES.has(body.sdrStage) && !TERMINAL_SDR_STAGES.has(before.sdrStage ?? "")) {
      if (!body.status) body.status = "closed_lost";
    }

    // ── Automation 2: stage → contacted/attempted auto-sets last_outreach_date ─
    const OUTREACH_STAGES = new Set(["contacted", "attempted_call", "contact_made", "no_contact"]);
    if (isSdr && body.sdrStage && OUTREACH_STAGES.has(body.sdrStage)) {
      if (!body.lastOutreachDate) body.lastOutreachDate = today;
    }

    // ── Automation 6: contact_made stage sets contactMade flag ──────────────────
    if (isSdr && body.sdrStage === "contact_made" && before.sdrStage !== "contact_made") {
      if (body.contactMade === undefined) body.contactMade = true;
    }

    // ── Automation 7: follow_up_required sets followUpRequired flag ─────────────
    if (isSdr && body.sdrStage === "follow_up_required" && before.sdrStage !== "follow_up_required") {
      if (body.followUpRequired === undefined) body.followUpRequired = true;
    }

    // ── Automation 8: meeting_booked stage sets meetingBooked flag ───────────────
    if (isSdr && body.sdrStage === "meeting_booked" && !before.meetingBooked) {
      if (body.meetingBooked === undefined) body.meetingBooked = true;
    }

    // ── Automation 9: qualified sets sqlStatus flag ──────────────────────────────
    if (isSdr && body.sdrStage === "qualified" && before.sdrStage !== "qualified") {
      if (body.sqlStatus === undefined) body.sqlStatus = true;
    }

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

    // Existing: stage_changed activity log
    // D365 migration: replace with Business Process Flow stage history entry.
    if (body.stage && before.stage && body.stage !== before.stage) {
      void logActivity("stage_changed", "engagement", eng.id, req.user?.id, {
        stageFrom: before.stage, stageTo: body.stage, title: eng.title, status: eng.status,
      });
      if (eng.organisationId) {
        void logActivity("stage_changed", "organisation", eng.organisationId, req.user?.id, {
          stageFrom: before.stage, stageTo: body.stage, title: eng.title, engagementId: eng.id,
        });
      }
    }

    // Audit: SDR stage transitions tracked separately from `stage`. Skip when a
    // more specific event below covers the transition (avoids duplicate entries).
    const sdrTransitioningToDisqualified =
      isSdr && body.sdrStage === "disqualified" && before.sdrStage !== "disqualified";
    if (body.sdrStage && before.sdrStage !== body.sdrStage && !sdrTransitioningToDisqualified) {
      void logActivity("stage_changed", "engagement", eng.id, req.user?.id, {
        sdrStageFrom: before.sdrStage, sdrStageTo: body.sdrStage, title: eng.title,
      });
    }

    // Audit: qualification_changed
    if (body.qualificationStatus && before.qualificationStatus !== body.qualificationStatus) {
      void logActivity("qualification_changed", "engagement", eng.id, req.user?.id, {
        from: before.qualificationStatus, to: body.qualificationStatus, title: eng.title,
      });
    }

    // Audit: disqualified — emitted instead of stage_changed for this transition.
    if (sdrTransitioningToDisqualified) {
      void logActivity("disqualified", "engagement", eng.id, req.user?.id, {
        title: eng.title,
        reason: body.disqualificationReason,
        previousStage: before.sdrStage,
      });
    }

    // ── Automation 3: meeting_booked → create prep task ───────────────────────
    // D365 migration: Power Automate flow on Opportunity.crm_meetingbooked = true.
    const meetingJustBooked = isSdr && body.meetingBooked === true && !before.meetingBooked;
    if (meetingJustBooked) {
      const assignee = eng.sdrOwnerUserId ?? eng.ownerUserId ?? undefined;
      const meetingDate = body.meetingDate ?? eng.meetingDate ?? null;
      await db.insert(tasksTable).values({
        title: `Prepare for meeting — ${orgName ?? eng.title}`,
        description: meetingDate ? `Meeting scheduled for ${meetingDate}` : undefined,
        organisationId: eng.organisationId ?? undefined,
        engagementId: eng.id,
        assignedUserId: assignee,
        dueDate: meetingDate ?? undefined,
        priority: "high",
        status: "open",
        updatedAt: new Date(),
      });
      void logActivity("task_created", "engagement", eng.id, req.user?.id, {
        taskTitle: `Prepare for meeting — ${orgName ?? eng.title}`,
        via: "sdr_automation",
      });
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

    // Audit: handover_completed (the route performs the handover atomically).
    void logActivity("handover_completed", "engagement", sdrId, req.user?.id, {
      title: sdr.title,
      orgName,
      handoverOwnerUserId,
      newEngagementId: newEngagement?.id ?? null,
      reusedEngagementId: existingEngagementId,
    });
    if (sdr.organisationId) {
      void logActivity("handover_completed", "organisation", sdr.organisationId, req.user?.id, {
        sdrEngagementId: sdrId,
        newEngagementId: newEngagement?.id ?? null,
        reusedEngagementId: existingEngagementId,
        handoverOwnerUserId,
      });
    }

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

// ── POST /:id/log-call ────────────────────────────────────────────────────────
// D365 migration: create a Phone Call activity record on the Opportunity entity.
router.post("/:id/log-call", requireMinRole("engagement_user"), async (req, res) => {
  try {
    const engId = Number(req.params.id);
    const { outcome, nextCallDate, followUpReason, latestNote, sdrStage: explicitStage } = req.body;

    if (!outcome) return res.status(400).json({ error: "outcome is required" });

    const [eng] = await db.select().from(engagementsTable).where(eq(engagementsTable.id, engId));
    if (!eng) return res.status(404).json({ error: "Not found" });

    const today = new Date().toISOString().split("T")[0];

    // Determine flags from outcome
    const CONTACT_OUTCOMES = new Set(["spoke_call_back_later", "spoke_send_info", "spoke_not_interested", "spoke_interested", "meeting_booked"]);
    const contactMade = CONTACT_OUTCOMES.has(outcome);
    const voicemailLeft = outcome === "voicemail_left";
    const followUpRequired = outcome === "spoke_call_back_later" || outcome === "spoke_send_info";
    const meetingBooked = outcome === "meeting_booked";

    // Auto-derive stage if not explicitly provided
    let autoStage = eng.sdrStage;
    if (!explicitStage) {
      if (meetingBooked) {
        autoStage = "meeting_booked";
      } else if (outcome === "spoke_interested") {
        autoStage = "interested";
      } else if (followUpRequired) {
        autoStage = "follow_up_required";
      } else if (outcome === "wrong_person") {
        autoStage = "no_contact";
      } else if (contactMade) {
        autoStage = "contact_made";
      } else {
        // no_answer, voicemail_left, gatekeeper → attempted_call if not already past that
        const HIGHER_STAGES = new Set(["contact_made", "follow_up_required", "replied", "interested", "meeting_booked", "qualified", "nurture", "unresponsive", "do_not_contact", "bad_data", "changed_job", "disqualified"]);
        if (!eng.sdrStage || !HIGHER_STAGES.has(eng.sdrStage)) {
          autoStage = "attempted_call";
        }
      }
    }

    const newStage = explicitStage || autoStage;
    const sqlStatusUpdate = newStage === "qualified" && eng.sdrStage !== "qualified";

    const updates = {
      callAttemptCount: (eng.callAttemptCount ?? 0) + 1,
      lastCallDate: today,
      lastCallOutcome: outcome,
      lastOutreachDate: today,
      touchCount: (eng.touchCount ?? 0) + 1,
      contactMade: contactMade || eng.contactMade,
      voicemailLeft: voicemailLeft || eng.voicemailLeft,
      followUpRequired: followUpRequired || eng.followUpRequired,
      meetingBooked: meetingBooked || eng.meetingBooked,
      ...(meetingBooked && !eng.meetingDate ? { meetingDate: nextCallDate } : {}),
      ...(nextCallDate !== undefined ? { nextCallDate, nextActionDate: nextCallDate } : {}),
      ...(followUpReason ? { followUpReason } : {}),
      ...(latestNote ? { latestNote, notes: [eng.notes, latestNote].filter(Boolean).join("\n\n") } : {}),
      ...(newStage ? { sdrStage: newStage } : {}),
      ...(sqlStatusUpdate ? { sqlStatus: true } : {}),
      outreachChannel: "phone" as const,
      updatedAt: new Date(),
    };

    const [updated] = await db.update(engagementsTable).set(updates).where(eq(engagementsTable.id, engId)).returning();
    if (!updated) return res.status(404).json({ error: "Not found" });

    // Log activity
    void logActivity("call_logged", "engagement", engId, req.user?.id, {
      outcome,
      callAttemptCount: updates.callAttemptCount,
      contactMade,
      newStage,
      ...(followUpReason ? { followUpReason } : {}),
    });

    // Fetch joined names for formatted response
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
      .where(eq(engagementsTable.id, engId));

    if (!row) return res.status(404).json({ error: "Not found" });

    res.json(format(
      row.engagement,
      row.orgName,
      row.contactFirstName && row.contactLastName ? `${row.contactFirstName} ${row.contactLastName}` : null,
      row.ownerFullName,
      row.sdrOwnerFullName,
      row.handoverOwnerFullName
    ));
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
