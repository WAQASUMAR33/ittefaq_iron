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

async function checkReferencesForId(prisma, label, id) {
  console.log(`\n--- Checking references for ID ${id} in ${label} ---`);
  
  const tablesToCheck = [
    { name: 'ledger', field: 'cus_id' },
    { name: 'sale', field: 'cus_id' },
    { name: 'sale', field: 'credit_account_id' },
    { name: 'sale', field: 'debit_account_id' },
    { name: 'sale_details', field: 'cus_id' },
    { name: 'purchase', field: 'cus_id' },
    { name: 'purchase', field: 'credit_account_id' },
    { name: 'purchase', field: 'debit_account_id' },
    { name: 'purchase', field: 'cargo_account_id' },
    { name: 'purchase_details', field: 'cus_id' },
    { name: 'expense', field: 'paid_from_account_id' },
    { name: 'expense', field: 'bank_account_id' },
    { name: 'sale_return', field: 'cus_id' },
    { name: 'sale_return', field: 'credit_account_id' },
    { name: 'sale_return', field: 'debit_account_id' },
    { name: 'sale_return_details', field: 'cus_id' },
    { name: 'payments', field: 'account_id' },
    { name: 'payments', field: 'cash_account_id' },
    { name: 'payments', field: 'bank_account_id' },
    { name: 'split_payments', field: 'debit_account_id' },
    { name: 'split_payments', field: 'credit_account_id' }
  ];

  let hasRef = false;
  for (const t of tablesToCheck) {
    try {
      // We can use queryRaw to dynamic-check tables
      const query = `SELECT COUNT(*) as count FROM \`${t.name}\` WHERE \`${t.field}\` = ${id}`;
      const res = await prisma.$queryRawUnsafe(query);
      const count = Number(res[0]?.count || 0);
      if (count > 0) {
        console.log(`  Found ${count} rows in table "${t.name}" column "${t.field}"`);
        hasRef = true;
      }
    } catch (e) {
      // Table might not exist or field name might be slightly different in DB
      // console.log(`  Failed checking table ${t.name}: ${e.message}`);
    }
  }

  if (!hasRef) {
    console.log(`  No references found for ID ${id} in checked tables.`);
  }
}

async function main() {
  await checkReferencesForId(dbLocal, 'Office DB', 2729);
  await checkReferencesForId(dbLocal, 'Office DB', 2730);
  
  await checkReferencesForId(dbLive, 'Live DB', 2729);
  await checkReferencesForId(dbLive, 'Live DB', 2730);

  await dbLocal.$disconnect();
  await dbLive.$disconnect();
}

main();
