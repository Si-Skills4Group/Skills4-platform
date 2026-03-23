import { db } from "@workspace/db";
import {
  organisationsTable,
  contactsTable,
  engagementsTable,
  tasksTable,
} from "@workspace/db/schema";

async function seed() {
  console.log("Seeding database...");

  const orgs = await db
    .insert(organisationsTable)
    .values([
      {
        name: "TechCorp Solutions",
        industry: "Technology",
        website: "https://techcorp.example.com",
        phone: "0121 456 7890",
        email: "info@techcorp.example.com",
        city: "Birmingham",
        country: "UK",
        status: "active",
        employeeCount: 450,
        ownerName: "Sarah Mitchell",
        notes: "Long-standing partner. Annual apprenticeship sponsor.",
      },
      {
        name: "Midlands Manufacturing Ltd",
        industry: "Manufacturing",
        phone: "0161 234 5678",
        email: "hr@midmfg.example.com",
        city: "Coventry",
        country: "UK",
        status: "active",
        employeeCount: 1200,
        ownerName: "James Okafor",
        notes: "Key employer for engineering placements.",
      },
      {
        name: "Green Energy Partners",
        industry: "Energy",
        website: "https://greenenergy.example.com",
        email: "partnerships@greenenergy.example.com",
        city: "Nottingham",
        country: "UK",
        status: "prospect",
        employeeCount: 85,
        ownerName: "Sarah Mitchell",
        notes: "New prospect. Interested in sustainability apprenticeships.",
      },
      {
        name: "Retail Horizons Group",
        industry: "Retail",
        phone: "0115 345 6789",
        city: "Leicester",
        country: "UK",
        status: "active",
        employeeCount: 3400,
        ownerName: "James Okafor",
      },
      {
        name: "HealthFirst NHS Trust",
        industry: "Healthcare",
        email: "workforce@healthfirst.nhs.example.com",
        city: "Derby",
        country: "UK",
        status: "active",
        employeeCount: 6500,
        ownerName: "Priya Sharma",
        notes: "NHS trust looking for healthcare apprenticeship partnerships.",
      },
      {
        name: "Startup Collective",
        industry: "Technology",
        city: "Birmingham",
        country: "UK",
        status: "inactive",
        employeeCount: 12,
        notes: "Contact went cold. Follow up in Q3.",
      },
    ])
    .returning();

  console.log(`Inserted ${orgs.length} organisations`);

  const contacts = await db
    .insert(contactsTable)
    .values([
      {
        firstName: "Angela",
        lastName: "Thompson",
        email: "angela.thompson@techcorp.example.com",
        phone: "07700 900001",
        jobTitle: "Head of HR",
        department: "Human Resources",
        organisationId: orgs[0].id,
        status: "active",
        ownerName: "Sarah Mitchell",
      },
      {
        firstName: "Marcus",
        lastName: "Webb",
        email: "marcus.webb@techcorp.example.com",
        phone: "07700 900002",
        jobTitle: "Early Careers Manager",
        department: "Human Resources",
        organisationId: orgs[0].id,
        status: "active",
        ownerName: "Sarah Mitchell",
      },
      {
        firstName: "Diane",
        lastName: "Patel",
        email: "dpatel@midmfg.example.com",
        phone: "07700 900003",
        jobTitle: "Workforce Development Director",
        department: "Operations",
        organisationId: orgs[1].id,
        status: "active",
        ownerName: "James Okafor",
      },
      {
        firstName: "Tom",
        lastName: "Ashby",
        email: "tom.ashby@greenenergy.example.com",
        jobTitle: "CEO",
        organisationId: orgs[2].id,
        status: "active",
        ownerName: "Sarah Mitchell",
        notes: "Initial contact made at industry event.",
      },
      {
        firstName: "Claire",
        lastName: "Jennings",
        email: "claire.jennings@retail.example.com",
        phone: "07700 900005",
        jobTitle: "Talent Acquisition Lead",
        department: "HR",
        organisationId: orgs[3].id,
        status: "active",
        ownerName: "James Okafor",
      },
      {
        firstName: "Dr. Hamid",
        lastName: "Raza",
        email: "h.raza@healthfirst.nhs.example.com",
        phone: "07700 900006",
        jobTitle: "Director of Workforce Planning",
        department: "Workforce",
        organisationId: orgs[4].id,
        status: "active",
        ownerName: "Priya Sharma",
      },
    ])
    .returning();

  console.log(`Inserted ${contacts.length} contacts`);

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
        title: "Digital Apprenticeship Programme 2026",
        organisationId: orgs[0].id,
        contactId: contacts[0].id,
        stage: "negotiation",
        type: "apprenticeship",
        value: "25000",
        probability: 80,
        expectedCloseDate: addDays(today, 30),
        description: "Annual apprenticeship programme for 10 digital apprentices",
        ownerName: "Sarah Mitchell",
      },
      {
        title: "Engineering Work Placement Partnership",
        organisationId: orgs[1].id,
        contactId: contacts[2].id,
        stage: "proposal_sent",
        type: "work_placement",
        value: "12000",
        probability: 60,
        expectedCloseDate: addDays(today, 45),
        description: "8-week placements for HNC Engineering students",
        ownerName: "James Okafor",
      },
      {
        title: "Sustainability Careers Fair Sponsorship",
        organisationId: orgs[2].id,
        contactId: contacts[3].id,
        stage: "initial_contact",
        type: "careers_fair",
        value: "5000",
        probability: 30,
        expectedCloseDate: addDays(today, 90),
        description: "Sponsorship for annual sustainability careers fair",
        ownerName: "Sarah Mitchell",
      },
      {
        title: "Retail Management Mentoring Scheme",
        organisationId: orgs[3].id,
        contactId: contacts[4].id,
        stage: "meeting_scheduled",
        type: "mentoring",
        value: "8000",
        probability: 50,
        expectedCloseDate: addDays(today, 60),
        ownerName: "James Okafor",
      },
      {
        title: "Healthcare Apprenticeship Framework",
        organisationId: orgs[4].id,
        contactId: contacts[5].id,
        stage: "prospect",
        type: "apprenticeship",
        value: "40000",
        probability: 20,
        expectedCloseDate: addDays(today, 120),
        description: "Nursing and allied health apprenticeship framework",
        ownerName: "Priya Sharma",
      },
      {
        title: "TechCorp Guest Lecture Series",
        organisationId: orgs[0].id,
        contactId: contacts[1].id,
        stage: "closed_won",
        type: "guest_lecture",
        value: "3000",
        probability: 100,
        expectedCloseDate: addDays(today, -30),
        actualCloseDate: addDays(today, -35),
        description: "Quarterly guest lecture series for computing students",
        ownerName: "Sarah Mitchell",
      },
    ])
    .returning();

  console.log(`Inserted ${engagements.length} engagements`);

  await db.insert(tasksTable).values([
    {
      title: "Send apprenticeship proposal to Angela Thompson",
      type: "email",
      status: "completed",
      priority: "high",
      dueDate: addDays(today, -5),
      completedDate: addDays(today, -6),
      organisationId: orgs[0].id,
      engagementId: engagements[0].id,
      contactId: contacts[0].id,
      ownerName: "Sarah Mitchell",
    },
    {
      title: "Follow up on engineering placement contract",
      type: "call",
      status: "open",
      priority: "urgent",
      dueDate: addDays(today, 2),
      organisationId: orgs[1].id,
      engagementId: engagements[1].id,
      contactId: contacts[2].id,
      ownerName: "James Okafor",
      notes: "Diane needs the contract terms clarified before sign-off",
    },
    {
      title: "Schedule intro meeting with Tom Ashby at Green Energy",
      type: "meeting",
      status: "open",
      priority: "medium",
      dueDate: addDays(today, 7),
      organisationId: orgs[2].id,
      engagementId: engagements[2].id,
      contactId: contacts[3].id,
      ownerName: "Sarah Mitchell",
    },
    {
      title: "Prepare mentoring scheme overview document",
      type: "other",
      status: "in_progress",
      priority: "medium",
      dueDate: addDays(today, 10),
      organisationId: orgs[3].id,
      engagementId: engagements[3].id,
      ownerName: "James Okafor",
    },
    {
      title: "Research NHS apprenticeship levy requirements",
      type: "other",
      status: "open",
      priority: "low",
      dueDate: addDays(today, 21),
      organisationId: orgs[4].id,
      engagementId: engagements[4].id,
      ownerName: "Priya Sharma",
      notes: "Check Ofsted requirements for healthcare provision",
    },
    {
      title: "Chase Midlands Mfg for signed contract - OVERDUE",
      type: "follow_up",
      status: "open",
      priority: "urgent",
      dueDate: addDays(today, -3),
      organisationId: orgs[1].id,
      engagementId: engagements[1].id,
      contactId: contacts[2].id,
      ownerName: "James Okafor",
    },
    {
      title: "Send Retail Horizons meeting invite",
      type: "email",
      status: "open",
      priority: "high",
      dueDate: addDays(today, 3),
      organisationId: orgs[3].id,
      contactId: contacts[4].id,
      ownerName: "James Okafor",
    },
    {
      title: "Confirm guest lecture dates with Marcus Webb",
      type: "call",
      status: "completed",
      priority: "medium",
      dueDate: addDays(today, -40),
      completedDate: addDays(today, -42),
      organisationId: orgs[0].id,
      engagementId: engagements[5].id,
      contactId: contacts[1].id,
      ownerName: "Sarah Mitchell",
    },
  ]);

  console.log("Inserted tasks");
  console.log("Seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
