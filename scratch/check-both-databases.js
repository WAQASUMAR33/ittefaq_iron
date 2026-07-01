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
      where: { l_id: { in: [1118, 1187] } }
    });
    console.log(`Found ${entries.length} entries:`);
    for (const entry of entries) {
      console.log(`  L_ID: ${entry.l_id}, Debit: ${entry.debit_amount}, Credit: ${entry.credit_amount}, Trnx Type: ${entry.trnx_type}, Ledger Type: ${entry.ledger_type}`);
    }
  } catch (err) {
    console.error(`Error on ${label}:`, err.message);
  }
}

async function main() {
  await checkDb(dbLocal, '72.60.76.68 (Local/Office DB)');
  await checkDb(dbLive, '195.35.59.84 (Hostinger/Live DB)');
  await dbLocal.$disconnect();
  await dbLive.$disconnect();
}

main();
