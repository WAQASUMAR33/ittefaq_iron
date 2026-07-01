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
    const entries = await prisma.ledger.findMany({
      where: {
        OR: [
          { details: { startsWith: 'Payment ' } },
          { details: { startsWith: 'payment ' } }
        ]
      }
    });

    console.log(`Total entries starting with "Payment ": ${entries.length}`);
    const targets = entries.filter(e => e.ledger_type === 'Sale');
    console.log(`Entries starting with "Payment " and ledger_type is "Sale": ${targets.length}`);
    
    for (const entry of targets.slice(0, 15)) {
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
