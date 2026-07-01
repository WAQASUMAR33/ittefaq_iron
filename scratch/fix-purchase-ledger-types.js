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
  console.log(`Updating ledger types on ${label}`);
  console.log(`==================================================`);
  try {
    // Find all entries where details starts with "Purchase" or "purchase"
    const entries = await prisma.ledger.findMany({
      where: {
        OR: [
          { details: { startsWith: 'Purchase' } },
          { details: { startsWith: 'purchase' } }
        ]
      }
    });

    console.log(`Found ${entries.length} entries starting with "Purchase".`);
    const targets = entries.filter(e => e.ledger_type !== 'Purchase');
    console.log(`Need to update ${targets.length} entries whose type is not currently "Purchase".`);

    let updatedCount = 0;
    for (const entry of targets) {
      await prisma.ledger.update({
        where: { l_id: entry.l_id },
        data: { ledger_type: 'Purchase' }
      });
      console.log(`  Updated L_ID: ${entry.l_id} (Cus_ID: ${entry.cus_id}) | Was: "${entry.ledger_type}" -> Now: "Purchase" | Details: "${entry.details}"`);
      updatedCount++;
    }

    console.log(`✅ Success: Updated ${updatedCount} entries on ${label}.`);
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
