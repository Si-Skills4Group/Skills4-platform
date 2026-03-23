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
import { sql } from "drizzle-orm";
import { logger } from "./logger";

async function hash(plain: string) {
  return bcrypt.hash(plain, 10);
}

function addDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

export async function autoSeed(): Promise<void> {
  try {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(usersTable);

    if (count > 0) {
      return;
    }

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
  } catch (err) {
    logger.error({ err }, "Auto-seed failed — continuing startup");
  }
}
