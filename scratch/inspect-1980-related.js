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

async function inspectRelated(prisma, label) {
  console.log(`\n=== Inspecting Related Entries in ${label} ===`);
  try {
    const entry = await prisma.ledger.findUnique({
      where: { l_id: 1980 }
    });

    if (!entry) {
      console.log(`  Entry 1980 not found!`);
      return;
    }

    console.log(`Found Entry 1980:`);
    console.log(`  l_id: ${entry.l_id}, created_at: ${entry.created_at}, details: "${entry.details}"`);

    // Search for entries with similar created_at (within 1 minute) or similar details
    const related = await prisma.ledger.findMany({
      where: {
        created_at: {
          gte: new Date(new Date(entry.created_at).getTime() - 60000),
          lte: new Date(new Date(entry.created_at).getTime() + 60000)
        },
        l_id: { not: 1980 }
      }
    });

    console.log(`Related entries (within 1 min of created_at):`);
    for (const r of related) {
      console.log(`  l_id: ${r.l_id}, cus_id: ${r.cus_id}, debit: ${r.debit_amount}, credit: ${r.credit_amount}, details: "${r.details}"`);
    }

  } catch (err) {
    console.error('Error:', err.message);
  }
}

async function main() {
  await inspectRelated(dbLocal, 'Office DB');
  await inspectRelated(dbLive, 'Live DB');
  await dbLocal.$disconnect();
  await dbLive.$disconnect();
}

main();
