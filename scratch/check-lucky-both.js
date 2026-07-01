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

async function check(prisma, label) {
  console.log(`\n=== Checking ${label} ===`);
  try {
    const account = await prisma.customer.findFirst({
      where: { cus_name: { contains: 'lucky' } }
    });

    if (!account) {
      console.log('lucky cement limited not found');
      return;
    }

    console.log(`Account ID: ${account.cus_id}, Name: ${account.cus_name}, Balance: ${account.cus_balance}`);

    const entries = await prisma.ledger.findMany({
      where: { cus_id: account.cus_id },
      orderBy: [
        { created_at: 'asc' },
        { l_id: 'asc' }
      ]
    });

    console.log(`Entries count: ${entries.length}`);
    for (const entry of entries.slice(0, 10)) {
      console.log(`  L_ID: ${entry.l_id}, Opening: ${entry.opening_balance}, Debit: ${entry.debit_amount}, Credit: ${entry.credit_amount}, Closing: ${entry.closing_balance}`);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

async function main() {
  await check(dbLocal, 'Office DB (72.60.76.68)');
  await check(dbLive, 'Live DB (195.35.59.84)');
  await dbLocal.$disconnect();
  await dbLive.$disconnect();
}

main();
