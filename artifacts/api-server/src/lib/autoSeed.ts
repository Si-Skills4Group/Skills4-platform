/**
 * Auto-seed: runs on server startup when the database is empty.
 * Creates 4 demo accounts and sample data so the app works immediately
 * in any fresh environment (dev, production, staging).
 *
 * Entra ID migration note: once SSO is live, the user seeding section
 * can be removed. Sample organisations/engagements/etc. can remain.
 */
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import {
  usersTable,
  organisationsTable,
  contactsTable,
  engagementsTable,
  tasksTable,
} from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { logger } from "./logger";

async function hash(plain: string) {
  return bcrypt.hash(plain, 10);
}

function addDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

// ── SDR Demo Seed ──────────────────────────────────────────────────────────────
// Idempotent: checks for existing SDR engagements before inserting.
// Runs on every startup so production databases get seeded automatically.
async function seedSdrData(): Promise<void> {
  const [{ sdrCount }] = await db
    .select({ sdrCount: sql<number>`count(*)::int` })
    .from(engagementsTable)
    .where(eq(engagementsTable.engagementType, "sdr"));

  if (sdrCount > 0) {
    return;
  }

  const users = await db.select().from(usersTable);
  const sarah = users.find((u) => u.role === "admin");
  const james = users.find((u) => u.role === "crm_manager");
  const priya = users.find((u) => u.role === "engagement_user");

  if (!sarah || !james || !priya) {
    logger.warn("Cannot seed SDR data — users not found");
    return;
  }

  logger.info("No SDR data found — seeding SDR demo prospects…");

  // ── SDR Organisations ───────────────────────────────────────────────────────
  const sdrOrgs = await db
    .insert(organisationsTable)
    .values([
      {
        name: "CloudNative Systems Ltd",
        type: "employer",
        sector: "Technology",
        region: "West Midlands",
        status: "prospect",
        ownerUserId: james.id,
        website: "https://cloudnative.example.com",
        phone: "0121 600 1001",
        notes: "Cloud infrastructure firm — identified via LinkedIn. Strong levy payer.",
      },
      {
        name: "Jaguar Land Rover Ltd",
        type: "employer",
        sector: "Automotive",
        region: "West Midlands",
        status: "prospect",
        ownerUserId: priya.id,
        website: "https://jlr.example.com",
        phone: "024 7602 2222",
        notes: "Major automotive employer. Engineering & digital apprenticeships potential.",
      },
      {
        name: "Aviva UK Insurance",
        type: "employer",
        sector: "Financial Services",
        region: "East Midlands",
        status: "prospect",
        ownerUserId: james.id,
        website: "https://aviva.example.com",
        phone: "0800 051 0101",
        notes: "Large insurance group. HR contact responded to cold outreach.",
      },
      {
        name: "BT Group plc",
        type: "employer",
        sector: "Telecommunications",
        region: "West Midlands",
        status: "prospect",
        ownerUserId: priya.id,
        phone: "0800 800 150",
        notes: "National telecoms. Outreach started but contact has gone quiet.",
      },
      {
        name: "Aston Martin Lagonda Ltd",
        type: "employer",
        sector: "Automotive",
        region: "West Midlands",
        status: "dormant",
        ownerUserId: james.id,
        website: "https://astonmartin.example.com",
        phone: "01926 644 644",
        notes: "Disqualified — no apprenticeship budget allocated for current fiscal year.",
      },
      {
        name: "NHS University Hospitals",
        type: "employer",
        sector: "Health & Social Care",
        region: "Derby & Derbyshire",
        status: "prospect",
        ownerUserId: sarah.id,
        phone: "0121 627 2000",
        notes: "Large NHS trust. Referred by existing HealthFirst contact.",
      },
      {
        name: "West Midlands Police",
        type: "employer",
        sector: "Public Sector",
        region: "West Midlands",
        status: "prospect",
        ownerUserId: priya.id,
        website: "https://westmidlandspolice.example.com",
        phone: "0121 626 5000",
        notes: "New lead from public sector networking event. No contact made yet.",
      },
      {
        name: "Barclays Bank UK plc",
        type: "employer",
        sector: "Financial Services",
        region: "West Midlands",
        status: "prospect",
        ownerUserId: james.id,
        website: "https://barclays.example.com",
        phone: "0345 734 5345",
        notes: "Long nurture — decision expected after internal budget review in Q3.",
      },
      {
        name: "Rolls-Royce Holdings plc",
        type: "employer",
        sector: "Aerospace & Defence",
        region: "Derby & Derbyshire",
        status: "prospect",
        ownerUserId: sarah.id,
        website: "https://rolls-royce.example.com",
        phone: "01332 242 424",
        notes: "High-value qualified lead. Handed over to employer engagement team.",
      },
      {
        name: "Midlands Co-operative Society",
        type: "employer",
        sector: "Retail",
        region: "East Midlands",
        status: "prospect",
        ownerUserId: priya.id,
        phone: "0115 941 0055",
        notes: "Local co-operative retailer. SDR follow-up overdue — contact went cold.",
      },
    ])
    .returning();

  const [cloudNative, jlr, aviva, bt, astonMartin, nhsUniv, wmPolice, barclays, rollsRoyce, midlandsCoop] = sdrOrgs;
  logger.info({ count: sdrOrgs.length }, "Seeded SDR organisations");

  // ── SDR Contacts ────────────────────────────────────────────────────────────
  const sdrContacts = await db
    .insert(contactsTable)
    .values([
      {
        organisationId: cloudNative.id,
        firstName: "Rachel",
        lastName: "Foster",
        jobTitle: "Head of People & Culture",
        email: "rachel.foster@cloudnative.example.com",
        phone: "07711 100001",
        preferredContactMethod: "email",
        notes: "Engaged via LinkedIn. Keen on digital apprenticeships.",
      },
      {
        organisationId: jlr.id,
        firstName: "David",
        lastName: "Osei",
        jobTitle: "Early Careers Lead",
        email: "david.osei@jlr.example.com",
        phone: "07711 100002",
        preferredContactMethod: "phone",
        notes: "Meeting booked for next week. Decision-maker confirmed.",
      },
      {
        organisationId: aviva.id,
        firstName: "Natalie",
        lastName: "Chambers",
        jobTitle: "Talent Development Manager",
        email: "natalie.chambers@aviva.example.com",
        phone: "07711 100003",
        preferredContactMethod: "email",
        notes: "Responded to email outreach. Requested programme overview.",
      },
      {
        organisationId: bt.id,
        firstName: "Michael",
        lastName: "Khan",
        jobTitle: "Workforce Planning Director",
        email: "michael.khan@bt.example.com",
        phone: "07711 100004",
        preferredContactMethod: "phone",
        notes: "Initial call went well but no follow-up response since.",
      },
      {
        organisationId: astonMartin.id,
        firstName: "Sophie",
        lastName: "Whitfield",
        jobTitle: "HR Business Partner",
        email: "sophie.whitfield@astonmartin.example.com",
        phone: "07711 100005",
        preferredContactMethod: "email",
        notes: "Confirmed no budget available. Revisit in next financial year.",
      },
      {
        organisationId: nhsUniv.id,
        firstName: "Dr. Amir",
        lastName: "Patel",
        jobTitle: "Director of Workforce Development",
        email: "a.patel@nhsuniv.example.com",
        phone: "07711 100006",
        preferredContactMethod: "no_preference",
        notes: "Referral from HealthFirst contact. High potential.",
      },
      {
        organisationId: wmPolice.id,
        firstName: "Chief Inspector",
        lastName: "Burgess",
        jobTitle: "Head of HR Operations",
        email: "burgess@wmpolice.example.com",
        phone: "07711 100007",
        preferredContactMethod: "phone",
        notes: "Identified at public sector forum. No outreach made yet.",
      },
      {
        organisationId: barclays.id,
        firstName: "Fiona",
        lastName: "Drummond",
        jobTitle: "Early Talent Manager",
        email: "fiona.drummond@barclays.example.com",
        phone: "07711 100008",
        preferredContactMethod: "email",
        notes: "Interested but pending internal budget approval expected in Q3.",
      },
      {
        organisationId: rollsRoyce.id,
        firstName: "Jonathan",
        lastName: "Mercer",
        jobTitle: "Engineering Skills Director",
        email: "jonathan.mercer@rolls-royce.example.com",
        phone: "07711 100009",
        preferredContactMethod: "phone",
        notes: "Highly engaged. Qualified and handed over to engagement team.",
      },
      {
        organisationId: midlandsCoop.id,
        firstName: "Brenda",
        lastName: "Hollis",
        jobTitle: "People Director",
        email: "brenda.hollis@midlandscoop.example.com",
        phone: "07711 100010",
        preferredContactMethod: "email",
        notes: "Outreach started but follow-up overdue. Re-engage urgently.",
      },
    ])
    .returning();

  const [
    rachelFoster, davidOsei, natalieChambers, michaelKhan, sophieWhitfield,
    drAmir, chiefBurgess, fionaDrummond, jonathanMercer, brendaHollis,
  ] = sdrContacts;
  logger.info({ count: sdrContacts.length }, "Seeded SDR contacts");

  // ── SDR Engagements ─────────────────────────────────────────────────────────
  const sdrEngagements = await db
    .insert(engagementsTable)
    .values([
      {
        organisationId: cloudNative.id,
        primaryContactId: rachelFoster.id,
        ownerUserId: james.id,
        sdrOwnerUserId: james.id,
        engagementType: "sdr",
        title: "CloudNative Systems Ltd — SDR",
        sdrStage: "researching",
        leadSource: "linkedin",
        status: "open",
        touchCount: 1,
        notes: "Researching the org ahead of first outreach. Strong levy payer.",
      },
      {
        organisationId: jlr.id,
        primaryContactId: davidOsei.id,
        ownerUserId: priya.id,
        sdrOwnerUserId: priya.id,
        engagementType: "sdr",
        title: "Jaguar Land Rover Ltd — SDR",
        sdrStage: "meeting_booked",
        leadSource: "referral",
        status: "open",
        touchCount: 4,
        lastOutreachDate: addDays(-3),
        notes: "Meeting confirmed. David Osei is the key stakeholder.",
      },
      {
        organisationId: aviva.id,
        primaryContactId: natalieChambers.id,
        ownerUserId: james.id,
        sdrOwnerUserId: james.id,
        engagementType: "sdr",
        title: "Aviva UK — SDR",
        sdrStage: "response_received",
        leadSource: "cold_email",
        status: "open",
        touchCount: 3,
        lastOutreachDate: addDays(-5),
        notes: "Natalie responded — requested programme overview. Sending this week.",
      },
      {
        organisationId: bt.id,
        primaryContactId: michaelKhan.id,
        ownerUserId: priya.id,
        sdrOwnerUserId: priya.id,
        engagementType: "sdr",
        title: "BT Group — SDR",
        sdrStage: "outreach_started",
        leadSource: "cold_call",
        status: "open",
        touchCount: 2,
        lastOutreachDate: addDays(-18),
        notes: "Initial call went well but follow-up emails unanswered for 2+ weeks.",
      },
      {
        organisationId: astonMartin.id,
        primaryContactId: sophieWhitfield.id,
        ownerUserId: james.id,
        sdrOwnerUserId: james.id,
        engagementType: "sdr",
        title: "Aston Martin Lagonda — SDR",
        sdrStage: "disqualified",
        leadSource: "event",
        status: "closed_lost",
        touchCount: 3,
        lastOutreachDate: addDays(-20),
        disqualificationReason: "No apprenticeship budget allocated for this fiscal year. Contact suggested revisiting in April next year.",
        notes: "Good relationship established. Re-add to pipeline in Q1 next year.",
      },
      {
        organisationId: nhsUniv.id,
        primaryContactId: drAmir.id,
        ownerUserId: sarah.id,
        sdrOwnerUserId: sarah.id,
        engagementType: "sdr",
        title: "NHS University Hospitals — SDR",
        sdrStage: "contacted",
        leadSource: "referral",
        status: "open",
        touchCount: 2,
        lastOutreachDate: addDays(-8),
        notes: "Referral from existing NHS contact. Dr. Patel is very responsive.",
      },
      {
        organisationId: wmPolice.id,
        primaryContactId: chiefBurgess.id,
        ownerUserId: priya.id,
        sdrOwnerUserId: priya.id,
        engagementType: "sdr",
        title: "West Midlands Police — SDR",
        sdrStage: "new",
        leadSource: "event",
        status: "open",
        touchCount: 0,
        notes: "New lead from public sector forum. No outreach started yet.",
      },
      {
        organisationId: barclays.id,
        primaryContactId: fionaDrummond.id,
        ownerUserId: james.id,
        sdrOwnerUserId: james.id,
        engagementType: "sdr",
        title: "Barclays Bank — SDR",
        sdrStage: "nurture",
        leadSource: "linkedin",
        status: "open",
        touchCount: 5,
        lastOutreachDate: addDays(-30),
        notes: "On nurture list pending Q3 budget decision. Schedule a check-in call for August.",
      },
      {
        organisationId: rollsRoyce.id,
        primaryContactId: jonathanMercer.id,
        ownerUserId: sarah.id,
        sdrOwnerUserId: sarah.id,
        handoverOwnerUserId: sarah.id,
        engagementType: "sdr",
        title: "Rolls-Royce Holdings — SDR",
        sdrStage: "qualified",
        leadSource: "referral",
        status: "open",
        handoverStatus: "complete",
        touchCount: 6,
        lastOutreachDate: addDays(-4),
        notes: "Fully qualified. Handed over to employer engagement team. High-value engineering apprenticeship opportunity.",
      },
      {
        organisationId: midlandsCoop.id,
        primaryContactId: brendaHollis.id,
        ownerUserId: priya.id,
        sdrOwnerUserId: priya.id,
        engagementType: "sdr",
        title: "Midlands Co-operative Society — SDR",
        sdrStage: "outreach_started",
        leadSource: "cold_email",
        status: "open",
        touchCount: 2,
        lastOutreachDate: addDays(-21),
        notes: "Outreach started 3 weeks ago — contact has gone cold. Re-engage urgently.",
      },
    ])
    .returning();

  const [
    cloudNativeSdr, jlrSdr, avivaSdr, btSdr, astonMartinSdr,
    nhsSdr, wmPoliceSdr, barclaysSdr, rollsRoyceSdr, midlandsCoopSdr,
  ] = sdrEngagements;
  logger.info({ count: sdrEngagements.length }, "Seeded SDR engagements");

  // ── SDR Tasks ───────────────────────────────────────────────────────────────
  await db.insert(tasksTable).values([
    // CloudNative — initial outreach task (auto-created style)
    {
      organisationId: cloudNative.id,
      engagementId: cloudNativeSdr.id,
      assignedUserId: james.id,
      title: "Initial outreach — CloudNative Systems",
      description: "Prepare a tailored outreach email based on research. Highlight digital apprenticeship ROI.",
      dueDate: addDays(2),
      priority: "medium",
      status: "open",
    },
    // JLR — prepare for meeting
    {
      organisationId: jlr.id,
      engagementId: jlrSdr.id,
      assignedUserId: priya.id,
      title: "Prepare for meeting — JLR Early Careers",
      description: "Bring programme brochures, apprenticeship levy slides, and case studies from automotive sector.",
      dueDate: addDays(4),
      priority: "high",
      status: "open",
    },
    // Aviva — send programme overview
    {
      organisationId: aviva.id,
      engagementId: avivaSdr.id,
      assignedUserId: james.id,
      title: "Send programme overview to Natalie Chambers — Aviva",
      description: "Attach L3 Financial Services Apprenticeship and T-Level overview. Personalise cover email.",
      dueDate: addDays(1),
      priority: "high",
      status: "open",
    },
    // BT — overdue follow-up
    {
      organisationId: bt.id,
      engagementId: btSdr.id,
      assignedUserId: priya.id,
      title: "Re-engage Michael Khan — BT Group (OVERDUE)",
      description: "Last contact 18 days ago. Try phone call before sending final email chase.",
      dueDate: addDays(-5),
      priority: "high",
      status: "overdue",
    },
    // NHS Univ — follow up call
    {
      organisationId: nhsUniv.id,
      engagementId: nhsSdr.id,
      assignedUserId: sarah.id,
      title: "Follow-up call with Dr. Patel — NHS University Hospitals",
      description: "Discuss nursing and healthcare apprenticeship volumes. Confirm budget availability.",
      dueDate: addDays(3),
      priority: "medium",
      status: "open",
    },
    // West Midlands Police — plan initial outreach
    {
      organisationId: wmPolice.id,
      engagementId: wmPoliceSdr.id,
      assignedUserId: priya.id,
      title: "Initial outreach — West Midlands Police",
      description: "Research public sector levy requirements. Draft outreach email to Chief Inspector Burgess.",
      dueDate: addDays(7),
      priority: "medium",
      status: "open",
    },
    // Barclays — nurture check-in
    {
      organisationId: barclays.id,
      engagementId: barclaysSdr.id,
      assignedUserId: james.id,
      title: "Nurture check-in — Barclays (Q3 budget decision)",
      description: "Schedule a brief call with Fiona to confirm budget status and maintain warm relationship.",
      dueDate: addDays(60),
      priority: "low",
      status: "open",
    },
    // Rolls-Royce — handover confirmed
    {
      organisationId: rollsRoyce.id,
      engagementId: rollsRoyceSdr.id,
      assignedUserId: sarah.id,
      title: "Confirm employer engagement handover — Rolls-Royce",
      description: "Ensure Sarah has all SDR notes and Jonathan Mercer contact details. Schedule intro call.",
      dueDate: addDays(-2),
      priority: "high",
      status: "completed",
    },
    // Midlands Coop — overdue re-engagement
    {
      organisationId: midlandsCoop.id,
      engagementId: midlandsCoopSdr.id,
      assignedUserId: priya.id,
      title: "Re-engage Brenda Hollis — Midlands Co-op (OVERDUE)",
      description: "3 weeks since last contact. Phone first, then send a revised proposal with retail apprenticeship case study.",
      dueDate: addDays(-7),
      priority: "high",
      status: "overdue",
    },
  ]);

  logger.info({ count: 9 }, "Seeded SDR tasks");
  logger.info("SDR demo seed complete — 10 prospects ready");
}

export async function autoSeed(): Promise<void> {
  try {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(usersTable);

    if (count === 0) {
      logger.info("Empty database detected — seeding demo data…");

      // ── Users ──────────────────────────────────────────────────────────────────
      const users = await db
        .insert(usersTable)
        .values([
          {
            fullName: "Sarah Mitchell",
            email: "admin@company.com",
            role: "admin",
            isActive: true,
            passwordHash: await hash("Admin123!"),
          },
          {
            fullName: "James Okafor",
            email: "manager@company.com",
            role: "crm_manager",
            isActive: true,
            passwordHash: await hash("Manager123!"),
          },
          {
            fullName: "Priya Sharma",
            email: "user@company.com",
            role: "engagement_user",
            isActive: true,
            passwordHash: await hash("User123!"),
          },
          {
            fullName: "Thomas Reid",
            email: "readonly@company.com",
            role: "read_only",
            isActive: true,
            passwordHash: await hash("ReadOnly123!"),
          },
        ])
        .returning();

      const [sarah, james, priya] = users;
      logger.info({ count: users.length }, "Seeded users");

      // ── Organisations ──────────────────────────────────────────────────────────
      const orgs = await db
        .insert(organisationsTable)
        .values([
          {
            name: "TechCorp Solutions",
            type: "employer",
            sector: "Technology",
            region: "West Midlands",
            status: "active",
            ownerUserId: sarah.id,
            website: "https://techcorp.example.com",
            phone: "0121 456 7890",
            notes: "Long-standing partner. Annual apprenticeship sponsor.",
          },
          {
            name: "Midlands Manufacturing Ltd",
            type: "employer",
            sector: "Manufacturing",
            region: "West Midlands",
            status: "active",
            ownerUserId: james.id,
            phone: "0161 234 5678",
            notes: "Key employer for engineering placements. Levy-paying.",
          },
          {
            name: "Green Energy Partners",
            type: "employer",
            sector: "Energy & Utilities",
            region: "East Midlands",
            status: "prospect",
            ownerUserId: sarah.id,
            website: "https://greenenergy.example.com",
            notes: "New prospect met at clean energy conference.",
          },
          {
            name: "Retail Horizons Group",
            type: "employer",
            sector: "Retail",
            region: "East Midlands",
            status: "active",
            ownerUserId: james.id,
            phone: "0115 345 6789",
            notes: "National retail chain. HR team based in Leicester HQ.",
          },
          {
            name: "HealthFirst NHS Trust",
            type: "employer",
            sector: "Health & Social Care",
            region: "Derby & Derbyshire",
            status: "active",
            ownerUserId: priya.id,
            notes: "NHS trust looking for healthcare apprenticeship partnerships.",
          },
          {
            name: "Midlands Training Alliance",
            type: "training_provider",
            sector: "Education",
            region: "West Midlands",
            status: "active",
            ownerUserId: sarah.id,
            website: "https://mta.example.com",
            phone: "0121 999 0011",
            notes: "Strategic training provider partner for T-Level delivery.",
          },
          {
            name: "Startup Collective",
            type: "employer",
            sector: "Technology",
            region: "West Midlands",
            status: "dormant",
            ownerUserId: james.id,
            notes: "Early-stage startup. Contact went cold. Follow up in Q3.",
          },
        ])
        .returning();

      const [techcorp, midlandsMfg, greenEnergy, retailHorizons, healthFirst, mta] = orgs;
      logger.info({ count: orgs.length }, "Seeded organisations");

      // ── Contacts ───────────────────────────────────────────────────────────────
      const contacts = await db
        .insert(contactsTable)
        .values([
          {
            organisationId: techcorp.id,
            firstName: "Angela",
            lastName: "Thompson",
            jobTitle: "Head of HR",
            email: "angela.thompson@techcorp.example.com",
            phone: "07700 900001",
            preferredContactMethod: "email",
            notes: "Main decision-maker for apprenticeship programmes.",
          },
          {
            organisationId: techcorp.id,
            firstName: "Marcus",
            lastName: "Webb",
            jobTitle: "Early Careers Manager",
            email: "marcus.webb@techcorp.example.com",
            phone: "07700 900002",
            preferredContactMethod: "email",
          },
          {
            organisationId: midlandsMfg.id,
            firstName: "Diane",
            lastName: "Patel",
            jobTitle: "Workforce Development Director",
            email: "dpatel@midmfg.example.com",
            phone: "07700 900003",
            preferredContactMethod: "phone",
            notes: "Senior stakeholder with sign-off authority.",
          },
          {
            organisationId: greenEnergy.id,
            firstName: "Tom",
            lastName: "Ashby",
            jobTitle: "Chief Executive Officer",
            email: "tom.ashby@greenenergy.example.com",
            preferredContactMethod: "email",
            notes: "Initial prospect contact from West Midlands Energy Conference.",
          },
          {
            organisationId: retailHorizons.id,
            firstName: "Claire",
            lastName: "Jennings",
            jobTitle: "Talent Acquisition Lead",
            email: "claire.jennings@retail.example.com",
            phone: "07700 900005",
            preferredContactMethod: "email",
          },
          {
            organisationId: healthFirst.id,
            firstName: "Dr. Hamid",
            lastName: "Raza",
            jobTitle: "Director of Workforce Planning",
            email: "h.raza@healthfirst.nhs.example.com",
            phone: "07700 900006",
            preferredContactMethod: "no_preference",
            notes: "Engaged at NHS Employers conference.",
          },
          {
            organisationId: mta.id,
            firstName: "Leanne",
            lastName: "Crossley",
            jobTitle: "Partnerships Director",
            email: "l.crossley@mta.example.com",
            phone: "07700 900007",
            preferredContactMethod: "phone",
          },
        ])
        .returning();

      const [angela, marcus, diane, tom, claire, hamid, leanne] = contacts;
      logger.info({ count: contacts.length }, "Seeded contacts");

      // ── Engagements ────────────────────────────────────────────────────────────
      const engagements = await db
        .insert(engagementsTable)
        .values([
          {
            organisationId: techcorp.id,
            primaryContactId: angela.id,
            ownerUserId: sarah.id,
            title: "Digital Apprenticeship Programme 2026",
            stage: "proposal",
            status: "open",
            expectedLearnerVolume: 10,
            expectedValue: "25000",
            probability: 80,
            lastContactDate: addDays(-3),
            nextActionDate: addDays(5),
            nextActionNote: "Confirm headcount with finance before signing off.",
            notes: "Annual programme for 10 digital apprentices (L4 Data Analyst).",
          },
          {
            organisationId: midlandsMfg.id,
            primaryContactId: diane.id,
            ownerUserId: james.id,
            title: "Engineering Work Placement Partnership",
            stage: "meeting_booked",
            status: "open",
            expectedLearnerVolume: 6,
            expectedValue: "12000",
            probability: 60,
            lastContactDate: addDays(-7),
            nextActionDate: addDays(2),
            nextActionNote: "Teams call to walk through placement framework.",
            notes: "8-week placements for T-Level Engineering students.",
          },
          {
            organisationId: greenEnergy.id,
            primaryContactId: tom.id,
            ownerUserId: sarah.id,
            title: "Sustainability Careers Fair Sponsorship",
            stage: "contacted",
            status: "open",
            expectedLearnerVolume: 0,
            expectedValue: "5000",
            probability: 25,
            lastContactDate: addDays(-14),
            nextActionDate: addDays(7),
            nextActionNote: "Follow-up call to explore apprenticeship options.",
          },
          {
            organisationId: retailHorizons.id,
            primaryContactId: claire.id,
            ownerUserId: james.id,
            title: "Retail Management Mentoring Scheme",
            stage: "meeting_booked",
            status: "open",
            expectedLearnerVolume: 15,
            expectedValue: "8000",
            probability: 50,
            lastContactDate: addDays(-2),
            nextActionDate: addDays(10),
            nextActionNote: "Send mentoring scheme overview ahead of meeting.",
          },
          {
            organisationId: healthFirst.id,
            primaryContactId: hamid.id,
            ownerUserId: priya.id,
            title: "Healthcare Apprenticeship Framework",
            stage: "lead",
            status: "open",
            expectedLearnerVolume: 25,
            expectedValue: "40000",
            probability: 15,
            nextActionDate: addDays(21),
            nextActionNote: "Research NHS levy requirements before next contact.",
            notes: "High-value opportunity — 25 nursing and allied health apprentices.",
          },
          {
            organisationId: techcorp.id,
            primaryContactId: marcus.id,
            ownerUserId: sarah.id,
            title: "TechCorp Guest Lecture Series",
            stage: "won",
            status: "closed_won",
            expectedLearnerVolume: 120,
            expectedValue: "3000",
            probability: 100,
            lastContactDate: addDays(-35),
            notes: "Quarterly guest lecture series. 4 sessions delivered. Closed successfully.",
          },
          {
            organisationId: mta.id,
            primaryContactId: leanne.id,
            ownerUserId: sarah.id,
            title: "T-Level Subcontracting Partnership",
            stage: "active",
            status: "open",
            expectedLearnerVolume: 40,
            expectedValue: "60000",
            probability: 90,
            lastContactDate: addDays(-1),
            nextActionDate: addDays(14),
            nextActionNote: "Final contract review with legal. Leanne to countersign.",
            notes: "Strategic subcontracting for T-Level Engineering and Health delivery.",
          },
        ])
        .returning();

      const [digitalApprentice, engineeringPlacement, greenFair, retailMentor, nhsFramework, guestLecture, tLevelSub] = engagements;
      logger.info({ count: engagements.length }, "Seeded engagements");

      // ── Tasks ──────────────────────────────────────────────────────────────────
      await db.insert(tasksTable).values([
        {
          organisationId: techcorp.id,
          engagementId: digitalApprentice.id,
          assignedUserId: sarah.id,
          title: "Send updated apprenticeship proposal to Angela",
          description: "Attach revised funding breakdown and delivery timeline.",
          dueDate: addDays(5),
          priority: "high",
          status: "open",
        },
        {
          organisationId: midlandsMfg.id,
          engagementId: engineeringPlacement.id,
          assignedUserId: james.id,
          title: "Teams call — T-Level placement framework walkthrough",
          description: "Ensure Diane has the placement handbook before the call.",
          dueDate: addDays(2),
          priority: "high",
          status: "open",
        },
        {
          organisationId: midlandsMfg.id,
          engagementId: engineeringPlacement.id,
          assignedUserId: james.id,
          title: "Chase signed placement agreement",
          description: "Agreement sent 3 weeks ago. No response to follow-up emails.",
          dueDate: addDays(-4),
          priority: "high",
          status: "overdue",
        },
        {
          organisationId: greenEnergy.id,
          engagementId: greenFair.id,
          assignedUserId: sarah.id,
          title: "Schedule follow-up call with Tom Ashby",
          description: "Explore whether Green Energy has levy funds for apprenticeships.",
          dueDate: addDays(7),
          priority: "medium",
          status: "open",
        },
        {
          organisationId: retailHorizons.id,
          engagementId: retailMentor.id,
          assignedUserId: james.id,
          title: "Prepare mentoring scheme overview document",
          description: "Include case studies from similar retail partnerships.",
          dueDate: addDays(8),
          priority: "medium",
          status: "in_progress",
        },
        {
          organisationId: healthFirst.id,
          engagementId: nhsFramework.id,
          assignedUserId: priya.id,
          title: "Research NHS apprenticeship levy and Ofsted requirements",
          dueDate: addDays(20),
          priority: "medium",
          status: "open",
        },
        {
          organisationId: mta.id,
          engagementId: tLevelSub.id,
          assignedUserId: sarah.id,
          title: "Legal review of T-Level subcontracting contract",
          description: "Share final draft with legal team. Check ESFA funding rules.",
          dueDate: addDays(10),
          priority: "high",
          status: "in_progress",
        },
        {
          organisationId: techcorp.id,
          engagementId: guestLecture.id,
          assignedUserId: sarah.id,
          title: "Confirm guest lecture schedule with Marcus Webb",
          dueDate: addDays(-40),
          priority: "medium",
          status: "completed",
        },
        {
          organisationId: mta.id,
          engagementId: tLevelSub.id,
          assignedUserId: priya.id,
          title: "Quality assurance visit — MTA delivery site",
          description: "Observe session delivery and review learner portfolios.",
          dueDate: addDays(30),
          priority: "low",
          status: "open",
        },
      ]);

      logger.info({ count: 9 }, "Seeded tasks");
      logger.info("Auto-seed complete — demo accounts ready");
    }

    // Always check for and seed SDR demo data (idempotent — skips if already present)
    await seedSdrData();
  } catch (err) {
    logger.error({ err }, "Auto-seed failed — continuing startup");
  }
}
