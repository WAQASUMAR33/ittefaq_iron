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

async function checkDb(prisma, label) {
  console.log(`\n=== Checking ${label} ===`);
  try {
    // We fetch entries where details starts with 'Purchase' or 'purchase'
    const entries = await prisma.ledger.findMany({
      where: {
        OR: [
          { details: { startsWith: 'Purchase' } },
          { details: { startsWith: 'purchase' } }
        ]
      }
    });

    console.log(`Total entries starting with "Purchase": ${entries.length}`);
    const nonPurchaseType = entries.filter(e => e.ledger_type !== 'Purchase');
    console.log(`Entries starting with "Purchase" but ledger_type is NOT "Purchase": ${nonPurchaseType.length}`);
    
    // Print a few examples
    for (const entry of nonPurchaseType.slice(0, 15)) {
      console.log(`  L_ID: ${entry.l_id}, Cus_ID: ${entry.cus_id}, Type: ${entry.ledger_type}, Details: "${entry.details}"`);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

async function main() {
  await checkDb(dbLocal, 'Office DB (72.60.76.68)');
  await checkDb(dbLive, 'Live DB (195.35.59.84)');
  await dbLocal.$disconnect();
  await dbLive.$disconnect();
}

main();
