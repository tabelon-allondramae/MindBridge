// Run with: node prisma/seed.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  await prisma.assessmentTemplate.create({
    data: {
      name: "Weekly Wellbeing Check-in",
      version: 1,
      instrumentType: "WHO-5", // Confirm official item wording/licensing before production use
      questions: [
        { key: "q1", text: "I have felt calm and relaxed" },
        { key: "q2", text: "I have felt active and full of energy" },
        { key: "q3", text: "I have felt cheerful and in good spirits" },
        { key: "q4", text: "I woke up feeling fresh and rested" },
        { key: "q5", text: "My day has been filled with things that interest me" },
      ],
      // Raw sum (0-25) x 4 = percentage; thresholds are score CUTOFFS,
      // i.e. below `high` -> high risk, below `moderate` -> moderate risk.
      scoringRules: { multiplier: 4, thresholds: { high: 28, moderate: 50 } },
      isActive: true,
    },
  });
  console.log("Seeded default assessment template.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
