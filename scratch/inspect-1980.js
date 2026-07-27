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
    const entry = await prisma.ledger.findUnique({
      where: { l_id: 1980 }
    });

    if (entry) {
      console.log(`Entry 1980:`);
      console.log(`  l_id: ${entry.l_id}`);
      console.log(`  cus_id: ${entry.cus_id}`);
      console.log(`  debit_amount: ${entry.debit_amount}`);
      console.log(`  credit_amount: ${entry.credit_amount}`);
      console.log(`  trnx_type: ${entry.trnx_type}`);
      console.log(`  ledger_type: ${entry.ledger_type}`);
      console.log(`  details: ${entry.details}`);
    } else {
      console.log(`  Entry 1980 not found!`);
    }
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
