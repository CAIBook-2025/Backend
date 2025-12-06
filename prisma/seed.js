const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const startDate = new Date('2025-12-08T00:00:00-03:00');
  const days = 5; // 8 -> 12
  const srIds = [1, 2, 3];
  const modules = [1, 2, 3, 4];

  const records = [];

  for (let i = 0; i < days; i++) {
    const day = new Date(startDate);
    day.setDate(startDate.getDate() + i);

    for (const sr_id of srIds) {
      for (const moduleNum of modules) {
        records.push({
          sr_id,
          user_id: null,
          day,
          module: moduleNum,
        });
      }
    }
  }

  await prisma.sRScheduling.createMany({
    data: records,
    skipDuplicates: true,
  });

  console.log('Schedules creados correctamente.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
