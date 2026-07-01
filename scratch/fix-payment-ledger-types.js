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

async function fixLedgerTypes(prisma, label) {
  console.log(`\n==================================================`);
  console.log(`Updating ledger types in bulk on ${label}`);
  console.log(`==================================================`);
  try {
    const result = await prisma.ledger.updateMany({
      where: {
        ledger_type: 'Sale',
        OR: [
          { details: { startsWith: 'Payment ' } },
          { details: { startsWith: 'payment ' } }
        ]
      },
      data: {
        ledger_type: 'Payment'
      }
    });

    console.log(`✅ Success: Updated ${result.count} entries in bulk on ${label}.`);
  } catch (err) {
    console.error(`Error on ${label}:`, err.message);
  }
}

async function main() {
  await fixLedgerTypes(dbLocal, 'Office DB (72.60.76.68)');
  await fixLedgerTypes(dbLive, 'Live DB (195.35.59.84)');
  await dbLocal.$disconnect();
  await dbLive.$disconnect();
}

main();
