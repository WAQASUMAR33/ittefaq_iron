const { PrismaClient } = require('@prisma/client');

const dbLocal = new PrismaClient({
  datasources: {
    db: {
      url: "mysql://Ittefaqiron:DildilPakistan786-786_waqas@72.60.76.68:3306/Ittefaqiron"
    }
  }
});

const dbLive = new PrismaClient({
  datasources: {
    db: {
      url: "mysql://u889453186_parianwali:DildilPakistan786@786@parianwali@195.35.59.84:3306/u889453186_parianwali"
    }
  }
});

async function inspect(prisma, label) {
  console.log(`\n=== Inspecting ${label} ===`);
  try {
    const startTime = new Date('2026-07-01T08:24:00Z');
    const updatedCount = await prisma.ledger.count({
      where: {
        cus_id: 2551,
        updated_at: { gte: startTime }
      }
    });

    const totalCount = await prisma.ledger.count({
      where: { cus_id: 2551 }
    });

    console.log(`Cash Account (ID: 2551):`);
    console.log(`  Total entries: ${totalCount}`);
    console.log(`  Updated since task start: ${updatedCount}`);
  } catch (err) {
    console.error('Error:', err.message);
  }
}

async function main() {
  await inspect(dbLocal, 'Office DB');
  await inspect(dbLive, 'Live DB');
  await dbLocal.$disconnect();
  await dbLive.$disconnect();
}

main();
