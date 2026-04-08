/**
 * Seed script — populates the Employer Engagement CRM with demo data for stakeholder presentations.
 * Run: pnpm --filter @workspace/scripts run seed
 *
 * Demo login accounts:
 *   admin@company.com    / Admin123!     (admin)
 *   manager@company.com  / Manager123!   (crm_manager)
 *   user@company.com     / User123!      (engagement_user)
 *   readonly@company.com / ReadOnly123!  (read_only)
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

async function hash(plain: string) {
  return bcrypt.hash(plain, 10);
}

const addDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
};

async function seed() {
  console.log("Seeding CRM database...\n");

  await db.execute(sql`TRUNCATE tasks, engagements, contacts, organisations, users RESTART IDENTITY CASCADE`);
  console.log("✓ Tables cleared");

  // ─── Users (D365: SystemUser) ─────────────────────────────────────────────
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
  console.log(`✓ ${users.length} users`);

  // ─── Organisations (D365: Account) ───────────────────────────────────────
  const orgs = await db
    .insert(organisationsTable)
    .values([
      // 1
      {
        name: "TechCorp Solutions",
        type: "employer",
        sector: "Technology & Digital",
        region: "West Midlands",
        status: "active",
        ownerUserId: sarah.id,
        website: "https://techcorp.example.com",
        phone: "0121 456 7890",
        notes: "Long-standing partner. Annual apprenticeship sponsor. Key contact is Head of HR. Levy-paying with £45k annual spend.",
      },
      // 2
      {
        name: "Midlands Manufacturing Ltd",
        type: "employer",
        sector: "Manufacturing",
        region: "West Midlands",
        status: "active",
        ownerUserId: james.id,
        phone: "0121 234 5678",
        website: "https://midmfg.example.com",
        notes: "Key employer for engineering placements. Levy-paying, eager to maximise spend. 3 apprentices currently on programme.",
      },
      // 3
      {
        name: "Green Energy Partners",
        type: "employer",
        sector: "Energy & Utilities",
        region: "East Midlands",
        status: "prospect",
        ownerUserId: sarah.id,
        website: "https://greenenergy.example.com",
        phone: "0115 567 8901",
        notes: "New prospect met at the Clean Energy Conference, March 2026. Interested in sustainability-focused apprenticeships and green skills.",
      },
      // 4
      {
        name: "Retail Horizons Group",
        type: "employer",
        sector: "Retail & Hospitality",
        region: "East Midlands",
        status: "active",
        ownerUserId: james.id,
        phone: "0116 345 6789",
        website: "https://retailhorizons.example.com",
        notes: "National retail chain with HQ in Leicester. HR team highly engaged. Mentoring scheme now closed-won.",
      },
      // 5
      {
        name: "HealthFirst NHS Trust",
        type: "employer",
        sector: "Health & Social Care",
        region: "Derby & Derbyshire",
        status: "active",
        ownerUserId: priya.id,
        phone: "01332 987 6543",
        notes: "NHS Trust looking for healthcare apprenticeship partnerships. Must align with CQC frameworks and NHS England standards.",
      },
      // 6
      {
        name: "Midlands Training Alliance",
        type: "training_provider",
        sector: "Education & Training",
        region: "West Midlands",
        status: "active",
        ownerUserId: sarah.id,
        website: "https://mta.example.com",
        phone: "0121 999 0011",
        notes: "Strategic training provider partner for subcontracting T-Level Engineering and Health delivery. OFSTED Good rating.",
      },
      // 7
      {
        name: "West Midlands Combined Authority",
        type: "partner",
        sector: "Public Sector & Charity",
        region: "West Midlands",
        status: "active",
        ownerUserId: james.id,
        website: "https://wmca.example.gov.uk",
        phone: "0121 200 2787",
        notes: "Strategic regional partner. Involved in the West Midlands Skills Taskforce. Funding opportunity via UKSPF.",
      },
      // 8
      {
        name: "Apex Financial Services",
        type: "employer",
        sector: "Finance & Professional Services",
        region: "West Midlands",
        status: "active",
        ownerUserId: sarah.id,
        website: "https://apexfinancial.example.com",
        phone: "0121 600 1234",
        notes: "Mid-size accountancy and financial planning firm. First contact via LinkedIn. Richard Blackwell is driving the conversation.",
      },
      // 9
      {
        name: "CloudNative Labs",
        type: "employer",
        sector: "Technology & Digital",
        region: "West Midlands",
        status: "prospect",
        ownerUserId: priya.id,
        website: "https://cloudnative.example.com",
        notes: "Fast-growing cloud consultancy. 80 staff, no formal training programme yet. Interested in digital bootcamp sponsorship.",
      },
      // 10
      {
        name: "Birmingham Construction Group",
        type: "employer",
        sector: "Construction & Infrastructure",
        region: "West Midlands",
        status: "prospect",
        ownerUserId: james.id,
        phone: "0121 777 3456",
        notes: "Regional construction firm. Met Neil Barker at Build UK Skills Summit. Exploring T-Level industry placements.",
      },
      // 11
      {
        name: "Oakwood Care Group",
        type: "employer",
        sector: "Health & Social Care",
        region: "East Midlands",
        status: "active",
        ownerUserId: priya.id,
        phone: "0116 456 7000",
        website: "https://oakwoodcare.example.com",
        notes: "Independent care home group (12 sites). Actively investing in staff development. CQC Outstanding rating.",
      },
      // 12
      {
        name: "Startup Collective",
        type: "employer",
        sector: "Technology & Digital",
        region: "West Midlands",
        status: "dormant",
        ownerUserId: james.id,
        notes: "Early-stage startup hub. Initial contact went cold after funding round fell through. Review in Q4 2026.",
      },
    ])
    .returning();

  const [
    techcorp,
    midlandsMfg,
    greenEnergy,
    retailHorizons,
    healthFirst,
    mta,
    wmca,
    apexFinancial,
    cloudNative,
    birminghamConstr,
    oakwoodCare,
    startupCollective,
  ] = orgs;
  console.log(`✓ ${orgs.length} organisations`);

  // ─── Contacts (D365: Contact) ─────────────────────────────────────────────
  const contacts = await db
    .insert(contactsTable)
    .values([
      // TechCorp (3)
      {
        organisationId: techcorp.id,
        firstName: "Angela",
        lastName: "Thompson",
        jobTitle: "Head of HR",
        email: "angela.thompson@techcorp.example.com",
        phone: "07700 900001",
        preferredContactMethod: "email",
        notes: "Main decision-maker for apprenticeship programmes. Prefers email. Has final sign-off on all training agreements.",
      },
      {
        organisationId: techcorp.id,
        firstName: "Marcus",
        lastName: "Webb",
        jobTitle: "Early Careers Manager",
        email: "marcus.webb@techcorp.example.com",
        phone: "07700 900002",
        preferredContactMethod: "email",
        notes: "Day-to-day operational contact. Manages the apprenticeship cohort directly. Very responsive.",
      },
      {
        organisationId: techcorp.id,
        firstName: "Lucy",
        lastName: "Park",
        jobTitle: "Apprenticeship Coordinator",
        email: "l.park@techcorp.example.com",
        phone: "07700 900003",
        preferredContactMethod: "email",
        notes: "Supports Marcus on day-to-day programme admin. Good for progress updates and pastoral queries.",
      },
      // Midlands Manufacturing (2)
      {
        organisationId: midlandsMfg.id,
        firstName: "Diane",
        lastName: "Patel",
        jobTitle: "Workforce Development Director",
        email: "dpatel@midmfg.example.com",
        phone: "07700 900004",
        preferredContactMethod: "phone",
        notes: "Senior stakeholder with sign-off authority. Prefers phone calls. Very commercially minded.",
      },
      {
        organisationId: midlandsMfg.id,
        firstName: "Chris",
        lastName: "Hartley",
        jobTitle: "Training & Quality Manager",
        email: "c.hartley@midmfg.example.com",
        phone: "07700 900005",
        preferredContactMethod: "email",
        notes: "Handles day-to-day training coordination. Key contact for T-Level placement logistics.",
      },
      // Green Energy (1)
      {
        organisationId: greenEnergy.id,
        firstName: "Tom",
        lastName: "Ashby",
        jobTitle: "Chief Executive Officer",
        email: "tom.ashby@greenenergy.example.com",
        phone: "07700 900006",
        preferredContactMethod: "email",
        notes: "Initial contact made at West Midlands Energy Conference. Keen on sustainability angle. Needs board sign-off.",
      },
      // Retail Horizons (2)
      {
        organisationId: retailHorizons.id,
        firstName: "Claire",
        lastName: "Jennings",
        jobTitle: "Talent Acquisition Lead",
        email: "claire.jennings@retailhorizons.example.com",
        phone: "07700 900007",
        preferredContactMethod: "email",
        notes: "Main contact for recruitment and early careers. Very organised. Champions apprenticeships internally.",
      },
      {
        organisationId: retailHorizons.id,
        firstName: "Peter",
        lastName: "Liang",
        jobTitle: "Head of Learning & Development",
        email: "p.liang@retailhorizons.example.com",
        phone: "07700 900008",
        preferredContactMethod: "email",
        notes: "Involved in the management mentoring scheme design. Academic background — prefers evidence-based approaches.",
      },
      // HealthFirst (2)
      {
        organisationId: healthFirst.id,
        firstName: "Dr. Hamid",
        lastName: "Raza",
        jobTitle: "Director of Workforce Planning",
        email: "h.raza@healthfirst.nhs.example.com",
        phone: "07700 900009",
        preferredContactMethod: "no_preference",
        notes: "Senior NHS stakeholder. Met Priya at NHS Employers Conference. Long decision cycles but high-value opportunity.",
      },
      {
        organisationId: healthFirst.id,
        firstName: "Wendy",
        lastName: "Collins",
        jobTitle: "HR Business Partner",
        email: "w.collins@healthfirst.nhs.example.com",
        phone: "07700 900010",
        preferredContactMethod: "email",
        notes: "Operational contact for the nursing associate pathway. More accessible than Dr. Raza for day-to-day queries.",
      },
      // MTA (1)
      {
        organisationId: mta.id,
        firstName: "Leanne",
        lastName: "Crossley",
        jobTitle: "Partnerships Director",
        email: "l.crossley@mta.example.com",
        phone: "07700 900011",
        preferredContactMethod: "phone",
        notes: "Primary contact for subcontracting arrangement. Very experienced in ESFA funding rules. Trusted partner.",
      },
      // WMCA (1)
      {
        organisationId: wmca.id,
        firstName: "Janet",
        lastName: "Osei",
        jobTitle: "Head of People & Skills",
        email: "j.osei@wmca.example.gov.uk",
        phone: "07700 900012",
        preferredContactMethod: "email",
        notes: "Regional skills policy lead. Connected us to the UKSPF funding stream. Highly influential in the region.",
      },
      // Apex Financial (2)
      {
        organisationId: apexFinancial.id,
        firstName: "Richard",
        lastName: "Blackwell",
        jobTitle: "Chief Executive Officer",
        email: "r.blackwell@apexfinancial.example.com",
        phone: "07700 900013",
        preferredContactMethod: "phone",
        notes: "Champion for the apprenticeship programme internally. Has set an ambitious target of 5 apprentices by Sept 2026.",
      },
      {
        organisationId: apexFinancial.id,
        firstName: "Sophie",
        lastName: "Marshall",
        jobTitle: "Early Careers Lead",
        email: "s.marshall@apexfinancial.example.com",
        phone: "07700 900014",
        preferredContactMethod: "email",
        notes: "New appointment — Richard hired her specifically to lead the apprenticeship initiative. Very enthusiastic.",
      },
      // CloudNative (1)
      {
        organisationId: cloudNative.id,
        firstName: "Dev",
        lastName: "Chatterjee",
        jobTitle: "Chief Technology Officer",
        email: "dev@cloudnative.example.com",
        phone: "07700 900015",
        preferredContactMethod: "email",
        notes: "Technical founder. Interested in bootcamp model to upskill existing staff, not traditional apprenticeships.",
      },
      // Birmingham Construction (1)
      {
        organisationId: birminghamConstr.id,
        firstName: "Neil",
        lastName: "Barker",
        jobTitle: "Managing Director",
        email: "n.barker@bcgroup.example.com",
        phone: "07700 900016",
        preferredContactMethod: "phone",
        notes: "Met at Build UK Skills Summit. Keen but busy. Best to call rather than email.",
      },
      // Oakwood Care (2)
      {
        organisationId: oakwoodCare.id,
        firstName: "Maria",
        lastName: "da Silva",
        jobTitle: "HR Director",
        email: "m.dasilva@oakwoodcare.example.com",
        phone: "07700 900017",
        preferredContactMethod: "email",
        notes: "Group HR lead across all 12 sites. Strong advocate for workforce development. Wants to see evidence of impact.",
      },
      {
        organisationId: oakwoodCare.id,
        firstName: "Fiona",
        lastName: "Graves",
        jobTitle: "Learning & Development Manager",
        email: "f.graves@oakwoodcare.example.com",
        phone: "07700 900018",
        preferredContactMethod: "email",
        notes: "Runs internal training team. Day-to-day contact for the care leadership pathway. Very organised.",
      },
      // Startup Collective (1)
      {
        organisationId: startupCollective.id,
        firstName: "Zain",
        lastName: "Khan",
        jobTitle: "Co-Founder",
        email: "zain@startupcollective.example.com",
        preferredContactMethod: "email",
        notes: "Initial contact. Business went into holding pattern after seed funding fell through. Re-engage Q4.",
      },
      // Extra: HealthFirst (to reach 20)
      {
        organisationId: healthFirst.id,
        firstName: "Olu",
        lastName: "Adeyemi",
        jobTitle: "Apprenticeship Programme Manager",
        email: "o.adeyemi@healthfirst.nhs.example.com",
        phone: "07700 900020",
        preferredContactMethod: "email",
        notes: "New hire at HealthFirst. Responsible for coordinating all apprenticeship activity. Very receptive.",
      },
    ])
    .returning();

  const [
    angela, marcus, lucy,
    diane, chris,
    tom,
    claire, peter,
    hamid, wendy,
    leanne,
    janet,
    richard, sophie,
    dev,
    neil,
    maria, fiona,
    zain,
    olu,
  ] = contacts;
  console.log(`✓ ${contacts.length} contacts`);

  // ─── Engagements (D365: Opportunity) ─────────────────────────────────────
  const engagements = await db
    .insert(engagementsTable)
    .values([
      // 1 — TechCorp Digital Apprenticeship (proposal, 80%)
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
        nextActionNote: "Angela to confirm headcount with finance. Send revised funding breakdown and delivery schedule.",
        notes: "Annual apprenticeship programme for 10 digital apprentices (L4 Data Analyst, L3 Software Dev). Proposal submitted. Awaiting finance sign-off.",
      },
      // 2 — Midlands Manufacturing T-Level Placements (meeting_booked, 60%)
      {
        organisationId: midlandsMfg.id,
        primaryContactId: diane.id,
        ownerUserId: james.id,
        title: "Engineering T-Level Industry Placements",
        stage: "meeting_booked",
        status: "open",
        expectedLearnerVolume: 8,
        expectedValue: "12000",
        probability: 60,
        lastContactDate: addDays(-7),
        nextActionDate: addDays(2),
        nextActionNote: "Teams call with Diane to walk through placement framework and risk assessment requirements. Ensure Diane has the handbook.",
        notes: "8-week industry placements for T-Level Engineering students. Linked to our T-Level provider contract. Health & safety induction required on site.",
      },
      // 3 — Green Energy Careers Fair (contacted, 25%)
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
        nextActionNote: "Follow-up call with Tom to explore wider levy-funded apprenticeship options beyond the one-off fair sponsorship.",
        notes: "Sponsorship of our annual sustainability careers fair. Could open door to larger apprenticeship conversation.",
      },
      // 4 — Retail Horizons Management Apprenticeship (proposal, 65%)
      {
        organisationId: retailHorizons.id,
        primaryContactId: claire.id,
        ownerUserId: james.id,
        title: "Retail Management Apprenticeship Cohort",
        stage: "proposal",
        status: "open",
        expectedLearnerVolume: 12,
        expectedValue: "18000",
        probability: 65,
        lastContactDate: addDays(-5),
        nextActionDate: addDays(9),
        nextActionNote: "Send revised proposal incorporating Peter Liang's feedback on the EPA component. Claire to present to board next Thursday.",
        notes: "L3 Retail Manager apprenticeship programme across 3 store clusters. Peter Liang has requested EPA provider details.",
      },
      // 5 — HealthFirst NHS Framework (lead, 15%)
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
        nextActionNote: "Research NHS apprenticeship levy requirements and Ofsted healthcare frameworks before next contact with Dr. Raza.",
        notes: "High-value opportunity — 25 nursing and allied health apprentices. Long decision cycle expected. Olu Adeyemi is new internal champion.",
      },
      // 6 — TechCorp Guest Lectures (won, closed_won)
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
        notes: "Quarterly guest lecture series for computing students. 4 sessions delivered in Q1 2026. Relationship building exercise — great success.",
      },
      // 7 — MTA Subcontracting (active, 90%)
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
        nextActionNote: "Final contract review with legal team. Leanne to countersign by end of month. QA visit to MTA site to be scheduled.",
        notes: "Strategic subcontracting arrangement for T-Level Engineering and Health delivery. ESFA approved. High priority for this financial year.",
      },
      // 8 — WMCA Public Sector Leadership (active, 85%)
      {
        organisationId: wmca.id,
        primaryContactId: janet.id,
        ownerUserId: james.id,
        title: "Public Sector Leadership Programme",
        stage: "active",
        status: "open",
        expectedLearnerVolume: 18,
        expectedValue: "22000",
        probability: 85,
        lastContactDate: addDays(-4),
        nextActionDate: addDays(11),
        nextActionNote: "Contract sign-off overdue — chase Janet for final approval. Internal sign-off received on our side.",
        notes: "L5 Operations/Departmental Manager apprenticeship for WMCA staff. UKSPF co-funded. Janet championing internally but procurement is slow.",
      },
      // 9 — Apex Financial Apprenticeship (proposal, 70%)
      {
        organisationId: apexFinancial.id,
        primaryContactId: sophie.id,
        ownerUserId: sarah.id,
        title: "Finance & Accounting Apprenticeship Cohort",
        stage: "proposal",
        status: "open",
        expectedLearnerVolume: 5,
        expectedValue: "15000",
        probability: 70,
        lastContactDate: addDays(-2),
        nextActionDate: addDays(3),
        nextActionNote: "Send Sophie the finalised programme overview and welcome pack. Richard wants to see the EPA pass rate data.",
        notes: "L3 AAT/Accounts Assistant apprenticeship. Richard Blackwell is very committed. Sophie Marshall is the new early careers lead driving this.",
      },
      // 10 — CloudNative Digital Bootcamp (lead, 20%)
      {
        organisationId: cloudNative.id,
        primaryContactId: dev.id,
        ownerUserId: priya.id,
        title: "Digital Bootcamp Sponsorship",
        stage: "lead",
        status: "open",
        expectedLearnerVolume: 0,
        expectedValue: "8000",
        probability: 20,
        lastContactDate: addDays(-21),
        nextActionDate: addDays(10),
        nextActionNote: "Ring Dev Chatterjee to discuss hybrid bootcamp model — they want upskilling not traditional apprenticeships.",
        notes: "Not a traditional apprenticeship play. Dev wants sponsored bootcamp places for existing staff. Need to assess feasibility.",
      },
      // 11 — Birmingham Construction T-Level (contacted, 35%)
      {
        organisationId: birminghamConstr.id,
        primaryContactId: neil.id,
        ownerUserId: james.id,
        title: "Construction T-Level Industry Placements",
        stage: "contacted",
        status: "open",
        expectedLearnerVolume: 6,
        expectedValue: "9000",
        probability: 35,
        lastContactDate: addDays(-10),
        nextActionDate: addDays(14),
        nextActionNote: "Book site visit to Birmingham Construction Group's main yard to assess placement suitability and H&S compliance.",
        notes: "6 T-Level Construction student placements. Neil Barker keen but needs to involve site safety team before committing.",
      },
      // 12 — Oakwood Care Leadership (active, 75%)
      {
        organisationId: oakwoodCare.id,
        primaryContactId: maria.id,
        ownerUserId: priya.id,
        title: "Care Leadership Pathway",
        stage: "active",
        status: "open",
        expectedLearnerVolume: 15,
        expectedValue: "28000",
        probability: 75,
        lastContactDate: addDays(-2),
        nextActionDate: addDays(6),
        nextActionNote: "Deliver completed training needs analysis report to Maria and Fiona. Confirm first cohort start date.",
        notes: "L4 Lead Practitioner in Adult Care apprenticeship. Cohort spread across 4 Oakwood sites. Maria keen to start by Sept 2026.",
      },
      // 13 — Midlands Manufacturing Engineering Apprenticeship (proposal, 65%)
      {
        organisationId: midlandsMfg.id,
        primaryContactId: chris.id,
        ownerUserId: james.id,
        title: "Engineering Apprenticeship Programme",
        stage: "proposal",
        status: "open",
        expectedLearnerVolume: 8,
        expectedValue: "32000",
        probability: 65,
        lastContactDate: addDays(-6),
        nextActionDate: addDays(7),
        nextActionNote: "Review ESFA audit report findings with Chris before final proposal submission. Confirm levy balance availability.",
        notes: "L3 Engineering Technician apprenticeship. Separate from the T-Level placement deal. Chris Hartley is the day-to-day lead.",
      },
      // 14 — HealthFirst Nursing Associate (meeting_booked, 45%)
      {
        organisationId: healthFirst.id,
        primaryContactId: wendy.id,
        ownerUserId: priya.id,
        title: "Nursing Associate Pathway",
        stage: "meeting_booked",
        status: "open",
        expectedLearnerVolume: 12,
        expectedValue: "35000",
        probability: 45,
        lastContactDate: addDays(-8),
        nextActionDate: addDays(4),
        nextActionNote: "Send Wendy the sector guide and NHS-specific apprenticeship standards overview before Thursday's meeting.",
        notes: "L5 Nursing Associate (Foundation Degree) apprenticeship. Wendy Collins is the operational lead — more responsive than Dr. Raza.",
      },
      // 15 — Retail Horizons Mentoring Scheme (won, closed_won)
      {
        organisationId: retailHorizons.id,
        primaryContactId: peter.id,
        ownerUserId: james.id,
        title: "Store Manager Mentoring Scheme",
        stage: "won",
        status: "closed_won",
        expectedLearnerVolume: 20,
        expectedValue: "4000",
        probability: 100,
        lastContactDate: addDays(-30),
        notes: "Mentoring scheme for 20 retail store managers. Delivered by our CPD team. Sign-off paperwork completed. First cohort starts April 2026.",
      },
    ])
    .returning();

  const [
    digitalApprentice, engTLevel, greenFair, retailApprentice, nhsFramework,
    guestLecture, tLevelSub, wmcaLeadership, apexCohort, cloudBootcamp,
    bhamConstrPlacement, oakwoodCare_, mfgEngineering, nursingAssociate, retailMentor,
  ] = engagements;
  console.log(`✓ ${engagements.length} engagements`);

  // ─── SDR Engagements ──────────────────────────────────────────────────────
  const sdrEngagements = await db
    .insert(engagementsTable)
    .values([
      // SDR 1 — CloudNative Labs: Researching (LinkedIn, 2 touches)
      {
        organisationId: cloudNative.id,
        primaryContactId: dev.id,
        ownerUserId: priya.id,
        title: "CloudNative Labs — SDR Outreach",
        stage: "lead",
        status: "open",
        engagementType: "sdr",
        sdrStage: "researching",
        leadSource: "linkedin",
        sdrOwnerUserId: priya.id,
        outreachChannel: "linkedin",
        touchCount: 2,
        meetingBooked: false,
        lastOutreachDate: addDays(-5),
        nextOutreachDate: addDays(3),
        notes: "Identified via LinkedIn. Dev Chatterjee is active on skills content. Researching their hiring plans and tech stack before first outreach message.",
      },
      // SDR 2 — Birmingham Construction: Outreach Started (event follow-up, 4 touches)
      {
        organisationId: birminghamConstr.id,
        primaryContactId: neil.id,
        ownerUserId: james.id,
        title: "Birmingham Construction Group — SDR Outreach",
        stage: "lead",
        status: "open",
        engagementType: "sdr",
        sdrStage: "outreach_started",
        leadSource: "event",
        sdrOwnerUserId: james.id,
        outreachChannel: "email",
        touchCount: 4,
        meetingBooked: false,
        lastOutreachDate: addDays(-3),
        nextOutreachDate: addDays(4),
        notes: "Met Neil Barker at Build UK Skills Summit. Follow-up sequence started. 2 emails sent, 1 LinkedIn message, 1 phone attempt. No response yet — try calling again.",
      },
      // SDR 3 — Green Energy Partners: Qualified, meeting booked, handover pending
      {
        organisationId: greenEnergy.id,
        primaryContactId: tom.id,
        ownerUserId: sarah.id,
        title: "Green Energy Partners — SDR Qualified Lead",
        stage: "lead",
        status: "open",
        engagementType: "sdr",
        sdrStage: "qualified",
        qualificationStatus: "qualified",
        leadSource: "event",
        sdrOwnerUserId: sarah.id,
        outreachChannel: "phone",
        touchCount: 6,
        meetingBooked: true,
        meetingDate: addDays(-3),
        handoverStatus: "pending",
        handoverOwnerUserId: james.id,
        handoverNotes: "Qualified via 3-touch email + 2 phone calls + 1 in-person intro at West Midlands Energy Conference. Tom Ashby confirmed budget authority and appetite for L3 apprenticeships. Ready for senior engagement team to take over. Budget: ~£40k levy spend. Decision timeline: Q3 2026.",
        lastOutreachDate: addDays(-3),
        notes: "Strong SDR qualification. Tom confirmed: 35 employees, levy-paying, interested in green skills and sustainability apprenticeships. Pain point is skills gap in renewable engineering.",
      },
      // SDR 4 — Startup Collective: Nurture (funding fell through, low priority)
      {
        organisationId: startupCollective.id,
        primaryContactId: zain.id,
        ownerUserId: james.id,
        title: "Startup Collective — SDR Nurture",
        stage: "dormant",
        status: "on_hold",
        engagementType: "sdr",
        sdrStage: "nurture",
        leadSource: "referral",
        sdrOwnerUserId: james.id,
        outreachChannel: "email",
        touchCount: 3,
        meetingBooked: false,
        lastOutreachDate: addDays(-45),
        nextOutreachDate: addDays(75),
        notes: "Seed funding fell through in Jan 2026. Zain responsive but business paused. Moved to nurture — check in quarterly. Potential when they raise Series A.",
      },
    ])
    .returning();

  const [sdrCloudNative, sdrBirmingham, sdrGreenEnergy, sdrStartup] = sdrEngagements;
  console.log(`✓ ${sdrEngagements.length} SDR engagements`);

  // ─── Tasks (D365: Task / Activity) ───────────────────────────────────────
  await db.insert(tasksTable).values([
    // 1 — TechCorp: Send updated proposal (open, high, due +5)
    {
      organisationId: techcorp.id,
      engagementId: digitalApprentice.id,
      assignedUserId: sarah.id,
      title: "Send revised apprenticeship proposal to Angela Thompson",
      description: "Attach revised funding breakdown, updated delivery timeline and T&Cs. Include EPA provider details.",
      dueDate: addDays(5),
      priority: "high",
      status: "open",
    },
    // 2 — TechCorp: Prepare finance presentation (open, high, due +4)
    {
      organisationId: techcorp.id,
      engagementId: digitalApprentice.id,
      assignedUserId: sarah.id,
      title: "Prepare programme overview for TechCorp finance team",
      description: "Angela's finance team want a one-pager on levy spend, ROI estimates and payment schedule before sign-off.",
      dueDate: addDays(4),
      priority: "high",
      status: "open",
    },
    // 3 — Midlands Mfg: Teams call (open, high, due +2)
    {
      organisationId: midlandsMfg.id,
      engagementId: engTLevel.id,
      assignedUserId: james.id,
      title: "Teams call — T-Level placement framework walkthrough with Diane",
      description: "Dial-in link sent. Ensure Diane has the placement handbook and risk assessment template beforehand.",
      dueDate: addDays(2),
      priority: "high",
      status: "open",
    },
    // 4 — Midlands Mfg: Chase signed agreement (OVERDUE, high, -4)
    {
      organisationId: midlandsMfg.id,
      engagementId: engTLevel.id,
      assignedUserId: james.id,
      title: "Chase signed T-Level placement agreement from Diane Patel",
      description: "Agreement sent 3 weeks ago. Diane has not responded to two follow-up emails. Try calling direct line.",
      dueDate: addDays(-4),
      priority: "high",
      status: "overdue",
    },
    // 5 — Green Energy: Schedule follow-up call (open, medium, +7)
    {
      organisationId: greenEnergy.id,
      engagementId: greenFair.id,
      assignedUserId: sarah.id,
      title: "Schedule follow-up call with Tom Ashby re: apprenticeship options",
      description: "Explore whether Green Energy has levy funds available and appetite for a full apprenticeship cohort.",
      dueDate: addDays(7),
      priority: "medium",
      status: "open",
    },
    // 6 — Retail Horizons: Revised proposal (in_progress, medium, +8)
    {
      organisationId: retailHorizons.id,
      engagementId: retailApprentice.id,
      assignedUserId: james.id,
      title: "Revise Retail Management proposal incorporating Peter Liang's feedback",
      description: "Include EPA provider details, end-point assessment process overview, and updated cost breakdown.",
      dueDate: addDays(8),
      priority: "medium",
      status: "in_progress",
    },
    // 7 — HealthFirst: Research levy (open, medium, +20)
    {
      organisationId: healthFirst.id,
      engagementId: nhsFramework.id,
      assignedUserId: priya.id,
      title: "Research NHS apprenticeship levy and Ofsted healthcare frameworks",
      description: "Check healthcare apprenticeship standards on IfATE. Review NHS England guidance on levy use for integrated care boards.",
      dueDate: addDays(20),
      priority: "medium",
      status: "open",
    },
    // 8 — MTA: Legal review (in_progress, high, +10)
    {
      organisationId: mta.id,
      engagementId: tLevelSub.id,
      assignedUserId: sarah.id,
      title: "Legal review of T-Level subcontracting agreement",
      description: "Share final draft with legal team. Check subcontracting rules against current ESFA funding rules.",
      dueDate: addDays(10),
      priority: "high",
      status: "in_progress",
    },
    // 9 — WMCA: Chase contract sign-off (OVERDUE, high, -2)
    {
      organisationId: wmca.id,
      engagementId: wmcaLeadership.id,
      assignedUserId: james.id,
      title: "Chase Janet Osei for final contract sign-off",
      description: "Contract overdue. Janet's procurement team flagged a clause on TUPE — our legal team confirmed it doesn't apply. Resend with cover note.",
      dueDate: addDays(-2),
      priority: "high",
      status: "overdue",
    },
    // 10 — Apex Financial: Send welcome pack (open, medium, +3)
    {
      organisationId: apexFinancial.id,
      engagementId: apexCohort.id,
      assignedUserId: sarah.id,
      title: "Send Sophie Marshall the finalised programme overview and welcome pack",
      description: "Include EPA pass rate data for L3 AAT, employer testimonials, and onboarding timeline for Sept 2026 start.",
      dueDate: addDays(3),
      priority: "medium",
      status: "open",
    },
    // 11 — CloudNative: Ring Dev Chatterjee (open, low, +10)
    {
      organisationId: cloudNative.id,
      engagementId: cloudBootcamp.id,
      assignedUserId: priya.id,
      title: "Ring Dev Chatterjee to discuss hybrid bootcamp model",
      description: "They want upskilling, not traditional apprenticeships. Assess whether our CPD offer fits or if we refer out.",
      dueDate: addDays(10),
      priority: "low",
      status: "open",
    },
    // 12 — Birmingham Construction: Book site visit (open, medium, +14)
    {
      organisationId: birminghamConstr.id,
      engagementId: bhamConstrPlacement.id,
      assignedUserId: james.id,
      title: "Book site visit to Birmingham Construction Group main yard",
      description: "Assess placement suitability and H&S compliance. Bring T-Level placement framework document for Neil.",
      dueDate: addDays(14),
      priority: "medium",
      status: "open",
    },
    // 13 — Oakwood Care: Training needs analysis (in_progress, high, +6)
    {
      organisationId: oakwoodCare.id,
      engagementId: oakwoodCare_.id,
      assignedUserId: priya.id,
      title: "Complete and deliver Care Leadership training needs analysis to Oakwood",
      description: "Draft is 80% complete. Need to incorporate site visits to 2 remaining care homes. Deadline is end of week.",
      dueDate: addDays(6),
      priority: "high",
      status: "in_progress",
    },
    // 14 — HealthFirst: Send sector guide (OVERDUE, medium, -7)
    {
      organisationId: healthFirst.id,
      engagementId: nursingAssociate.id,
      assignedUserId: priya.id,
      title: "Send Wendy Collins the NHS apprenticeship standards sector guide",
      description: "Wendy requested this before Thursday's meeting. Must include Nursing Associate standard (ST0500/AP02).",
      dueDate: addDays(-7),
      priority: "medium",
      status: "overdue",
    },
    // 15 — Midlands Mfg: Review ESFA audit report (open, medium, +7)
    {
      organisationId: midlandsMfg.id,
      engagementId: mfgEngineering.id,
      assignedUserId: james.id,
      title: "Review ESFA audit report with Chris Hartley before proposal submission",
      description: "Confirm levy balance availability and eligibility for L3 Engineering Technician. Check for any compliance flags.",
      dueDate: addDays(7),
      priority: "medium",
      status: "open",
    },
    // 16 — MTA: Quality assurance visit (open, low, +30)
    {
      organisationId: mta.id,
      engagementId: tLevelSub.id,
      assignedUserId: priya.id,
      title: "Quality assurance visit — MTA delivery site observation",
      description: "Observe session delivery and review learner portfolios. Complete QA report template by end of following week.",
      dueDate: addDays(30),
      priority: "low",
      status: "open",
    },
    // 17 — TechCorp: Confirm guest lecture schedule (completed)
    {
      organisationId: techcorp.id,
      engagementId: guestLecture.id,
      assignedUserId: sarah.id,
      title: "Confirm Q1 2026 guest lecture schedule with Marcus Webb",
      description: "Agreed dates for all 4 sessions. Shared with timetabling team. All sessions confirmed and delivered.",
      dueDate: addDays(-40),
      priority: "medium",
      status: "completed",
    },
    // 18 — Retail Horizons: Deliver sign-off paperwork (completed)
    {
      organisationId: retailHorizons.id,
      engagementId: retailMentor.id,
      assignedUserId: james.id,
      title: "Deliver Store Manager Mentoring Scheme sign-off paperwork to Claire",
      description: "Contracts signed by both parties. Paperwork filed with compliance team. Closed successfully.",
      dueDate: addDays(-30),
      priority: "medium",
      status: "completed",
    },
    // 19 — SDR: CloudNative — Send LinkedIn connection request (open, medium, +3)
    {
      organisationId: cloudNative.id,
      engagementId: sdrCloudNative.id,
      assignedUserId: priya.id,
      title: "Send personalised LinkedIn message to Dev Chatterjee",
      description: "Reference the skills gap article he shared last week. Keep it short — no pitch in first message. Goal: connection and brief reply.",
      dueDate: addDays(3),
      priority: "medium",
      status: "open",
    },
    // 20 — SDR: Birmingham Construction — Phone follow-up (open, high, +4)
    {
      organisationId: birminghamConstr.id,
      engagementId: sdrBirmingham.id,
      assignedUserId: james.id,
      title: "Phone follow-up with Neil Barker — 4th touch",
      description: "4 emails/messages sent with no reply. Try direct dial. Reference Build UK Summit and T-Level Construction placement opportunity. Target: 15-min discovery call.",
      dueDate: addDays(4),
      priority: "high",
      status: "open",
    },
    // 21 — SDR: Green Energy — Handover briefing with James Okafor (open, high, +2)
    {
      organisationId: greenEnergy.id,
      engagementId: sdrGreenEnergy.id,
      assignedUserId: sarah.id,
      title: "SDR handover briefing — hand Green Energy Partners to James Okafor",
      description: "Walk James through the qualification notes and Tom Ashby's confirmed interests before he picks up the engagement. Share discovery call recording.",
      dueDate: addDays(2),
      priority: "high",
      status: "open",
    },
  ]);

  console.log("✓ 21 tasks");
  console.log("\n✅ Seed complete! Demo dataset loaded.");
  console.log("\nDemo login accounts:");
  console.log("  admin@company.com    / Admin123!     (Admin — Sarah Mitchell)");
  console.log("  manager@company.com  / Manager123!   (CRM Manager — James Okafor)");
  console.log("  user@company.com     / User123!      (Engagement User — Priya Sharma)");
  console.log("  readonly@company.com / ReadOnly123!  (Read Only — Thomas Reid)");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
