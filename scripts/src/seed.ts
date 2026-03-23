/**
 * Seed script — populates the Employer Engagement CRM with example data.
 * Run: pnpm --filter @workspace/scripts run seed
 *
 * D365 migration note: Each entity here maps to a D365 object.
 * See schema files in lib/db/src/schema/ for field-level mapping comments.
 */
import { db } from "@workspace/db";
import {
  usersTable,
  organisationsTable,
  contactsTable,
  engagementsTable,
  tasksTable,
} from "@workspace/db/schema";

async function seed() {
  console.log("Seeding CRM database...\n");

  // ─── Users (D365: SystemUser) ─────────────────────────────────────────────
  const users = await db
    .insert(usersTable)
    .values([
      {
        fullName: "Sarah Mitchell",
        email: "sarah.mitchell@engage.example.com",
        role: "admin",
        isActive: true,
      },
      {
        fullName: "James Okafor",
        email: "james.okafor@engage.example.com",
        role: "user",
        isActive: true,
      },
      {
        fullName: "Priya Sharma",
        email: "priya.sharma@engage.example.com",
        role: "user",
        isActive: true,
      },
      {
        fullName: "Thomas Reid",
        email: "thomas.reid@engage.example.com",
        role: "user",
        isActive: false,
      },
    ])
    .returning();

  const [sarah, james, priya] = users;
  console.log(`✓ ${users.length} users`);

  // ─── Organisations (D365: Account) ───────────────────────────────────────
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
        notes: "Long-standing partner. Annual apprenticeship sponsor. Key contact is Head of HR.",
      },
      {
        name: "Midlands Manufacturing Ltd",
        type: "employer",
        sector: "Manufacturing",
        region: "West Midlands",
        status: "active",
        ownerUserId: james.id,
        phone: "0161 234 5678",
        notes: "Key employer for engineering placements. Levy-paying, eager to maximise spend.",
      },
      {
        name: "Green Energy Partners",
        type: "employer",
        sector: "Energy & Utilities",
        region: "East Midlands",
        status: "prospect",
        ownerUserId: sarah.id,
        website: "https://greenenergy.example.com",
        notes: "New prospect met at clean energy conference. Interested in sustainability-focused apprenticeships.",
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
        notes: "NHS trust looking for healthcare apprenticeship partnerships. Must align with CQC frameworks.",
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
        notes: "Strategic training provider partner for subcontracting T-Level delivery.",
      },
      {
        name: "Startup Collective",
        type: "employer",
        sector: "Technology",
        region: "West Midlands",
        status: "dormant",
        ownerUserId: james.id,
        notes: "Early-stage startup. Contact went cold after initial meeting. Follow up in Q3.",
      },
    ])
    .returning();

  const [techcorp, midlandsMfg, greenEnergy, retailHorizons, healthFirst, mta, startupCollective] = orgs;
  console.log(`✓ ${orgs.length} organisations`);

  // ─── Contacts (D365: Contact) ─────────────────────────────────────────────
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
        notes: "Main decision-maker for apprenticeship programmes. Prefers email for initial contact.",
      },
      {
        organisationId: techcorp.id,
        firstName: "Marcus",
        lastName: "Webb",
        jobTitle: "Early Careers Manager",
        email: "marcus.webb@techcorp.example.com",
        phone: "07700 900002",
        preferredContactMethod: "email",
        notes: "Day-to-day operational contact. Works directly with apprentices on programme.",
      },
      {
        organisationId: midlandsMfg.id,
        firstName: "Diane",
        lastName: "Patel",
        jobTitle: "Workforce Development Director",
        email: "dpatel@midmfg.example.com",
        phone: "07700 900003",
        preferredContactMethod: "phone",
        notes: "Senior stakeholder. Has sign-off authority on all training agreements.",
      },
      {
        organisationId: greenEnergy.id,
        firstName: "Tom",
        lastName: "Ashby",
        jobTitle: "Chief Executive Officer",
        email: "tom.ashby@greenenergy.example.com",
        preferredContactMethod: "email",
        notes: "Initial prospect contact made at West Midlands Energy Conference.",
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
        notes: "Engaged with Priya at NHS Employers conference. Senior NHS stakeholder.",
      },
      {
        organisationId: mta.id,
        firstName: "Leanne",
        lastName: "Crossley",
        jobTitle: "Partnerships Director",
        email: "l.crossley@mta.example.com",
        phone: "07700 900007",
        preferredContactMethod: "phone",
        notes: "Primary point of contact for subcontracting arrangement discussions.",
      },
    ])
    .returning();

  const [angela, marcus, diane, tom, claire, hamid, leanne] = contacts;
  console.log(`✓ ${contacts.length} contacts`);

  // ─── Engagements (D365: Opportunity) ─────────────────────────────────────
  const today = new Date();
  const addDays = (d: Date, n: number) => {
    const date = new Date(d);
    date.setDate(date.getDate() + n);
    return date.toISOString().split("T")[0];
  };

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
        lastContactDate: addDays(today, -3),
        nextActionDate: addDays(today, 5),
        nextActionNote: "Angela to confirm headcount with finance before signing off.",
        notes: "Annual apprenticeship programme for 10 digital apprentices (L4 Data Analyst).",
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
        lastContactDate: addDays(today, -7),
        nextActionDate: addDays(today, 2),
        nextActionNote: "Teams call booked with Diane to walk through placement framework and T-Level requirements.",
        notes: "8-week placements for T-Level Engineering students. Linked to our T-Level provider contract.",
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
        lastContactDate: addDays(today, -14),
        nextActionDate: addDays(today, 7),
        nextActionNote: "Follow-up call with Tom to explore wider apprenticeship options beyond the fair.",
        notes: "Sponsorship opportunity for annual sustainability careers fair. Possible entry point to bigger apprenticeship deal.",
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
        lastContactDate: addDays(today, -2),
        nextActionDate: addDays(today, 10),
        nextActionNote: "Send over the mentoring scheme overview document ahead of the meeting.",
        notes: "Mentoring partnership for retail management cohort. Claire keen but needs board approval.",
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
        nextActionDate: addDays(today, 21),
        nextActionNote: "Research NHS apprenticeship levy requirements and Ofsted healthcare frameworks before next contact.",
        notes: "High-value opportunity — 25 nursing and allied health apprentices. Long sales cycle expected.",
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
        lastContactDate: addDays(today, -35),
        notes: "Quarterly guest lecture series for computing students. Delivered 4 sessions. Closed successfully.",
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
        lastContactDate: addDays(today, -1),
        nextActionDate: addDays(today, 14),
        nextActionNote: "Final contract review with legal team. Leanne to countersign by end of month.",
        notes: "Strategic subcontracting arrangement for T-Level Engineering and Health delivery. High priority.",
      },
    ])
    .returning();

  const [digitalApprentice, engineeringPlacement, greenFair, retailMentor, nhsFramework, guestLecture, tLevelSub] = engagements;
  console.log(`✓ ${engagements.length} engagements`);

  // ─── Tasks (D365: Task / Activity) ───────────────────────────────────────
  await db.insert(tasksTable).values([
    {
      organisationId: techcorp.id,
      engagementId: digitalApprentice.id,
      assignedUserId: sarah.id,
      title: "Send updated apprenticeship proposal to Angela",
      description: "Attach revised funding breakdown and delivery timeline. Include T&Cs.",
      dueDate: addDays(today, 5),
      priority: "high",
      status: "open",
    },
    {
      organisationId: midlandsMfg.id,
      engagementId: engineeringPlacement.id,
      assignedUserId: james.id,
      title: "Teams call — T-Level placement framework walkthrough",
      description: "Dial-in link sent. Ensure Diane has the placement handbook before the call.",
      dueDate: addDays(today, 2),
      priority: "high",
      status: "open",
    },
    {
      organisationId: midlandsMfg.id,
      engagementId: engineeringPlacement.id,
      assignedUserId: james.id,
      title: "Chase signed placement agreement — OVERDUE",
      description: "Agreement sent 3 weeks ago. Diane has not responded to two follow-up emails.",
      dueDate: addDays(today, -4),
      priority: "high",
      status: "overdue",
    },
    {
      organisationId: greenEnergy.id,
      engagementId: greenFair.id,
      assignedUserId: sarah.id,
      title: "Schedule follow-up call with Tom Ashby",
      description: "Explore whether Green Energy has levy funds available for apprenticeship cohort.",
      dueDate: addDays(today, 7),
      priority: "medium",
      status: "open",
    },
    {
      organisationId: retailHorizons.id,
      engagementId: retailMentor.id,
      assignedUserId: james.id,
      title: "Prepare mentoring scheme overview document",
      description: "Include case studies from similar retail partnerships and expected outcomes.",
      dueDate: addDays(today, 8),
      priority: "medium",
      status: "in_progress",
    },
    {
      organisationId: healthFirst.id,
      engagementId: nhsFramework.id,
      assignedUserId: priya.id,
      title: "Research NHS apprenticeship levy and Ofsted requirements",
      description: "Check healthcare apprenticeship standards on the Institute for Apprenticeships website. Note any Ofsted considerations for clinical delivery.",
      dueDate: addDays(today, 20),
      priority: "medium",
      status: "open",
    },
    {
      organisationId: mta.id,
      engagementId: tLevelSub.id,
      assignedUserId: sarah.id,
      title: "Legal review of T-Level subcontracting contract",
      description: "Share final draft with legal team. Check subcontracting rules under ESFA funding rules.",
      dueDate: addDays(today, 10),
      priority: "high",
      status: "in_progress",
    },
    {
      organisationId: techcorp.id,
      engagementId: guestLecture.id,
      assignedUserId: sarah.id,
      title: "Confirm guest lecture schedule with Marcus Webb",
      description: "Agree dates for all 4 Q1 sessions and share with the timetabling team.",
      dueDate: addDays(today, -40),
      priority: "medium",
      status: "completed",
    },
    {
      organisationId: mta.id,
      engagementId: tLevelSub.id,
      assignedUserId: priya.id,
      title: "Quality assurance visit — MTA delivery site",
      description: "Observe session delivery and review learner portfolios. Complete QA report by end of week.",
      dueDate: addDays(today, 30),
      priority: "low",
      status: "open",
    },
  ]);

  console.log(`✓ 9 tasks`);
  console.log("\n✅ Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
