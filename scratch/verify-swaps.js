const { PrismaClient } = require('@prisma/client');

const dbLocal = new PrismaClient({
  datasources: {
    db: {
      url: "mysql://Ittefaqiron:DildilPakistan786-786_waqas@72.60.76.68:3306/Ittefaqiron"
    }
  }
});

async function main() {
  const targetLIds = [2502, 2428, 1960, 1891, 1868, 1865, 1862, 1859, 1853, 1850, 1847, 1838, 1841, 1830, 236];
  try {
    const entries = await dbLocal.ledger.findMany({
      where: { l_id: { in: targetLIds } }
    });

    console.log('Current state of entries in Office DB:');
    for (const e of entries) {
      console.log(`  l_id: ${e.l_id}, debit: ${e.debit_amount}, credit: ${e.credit_amount}, type: ${e.ledger_type}`);
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await dbLocal.$disconnect();
  }
}

main();
