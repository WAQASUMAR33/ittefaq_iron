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

const ids = [
  1062, 1092, 1790, 1835, 1833, 1844, 1882, 1872, 1878, 1895, 1898, 1904, 1908, 1911,
  1930, 1934, 1938, 1941, 1948, 1953, 1957, 1980, 1974, 1983, 1986, 1989, 1992, 1999,
  2012, 2020, 2035, 2049, 2088, 2133, 2137, 4143, 2146, 2156, 2162, 2169, 2174, 2181,
  2187, 2190, 2193, 2197, 2200, 2203, 2206, 2213, 2220, 2223, 2226, 2239, 2242, 2257,
  2263, 2266, 2274, 2279, 2304, 2286, 2300, 2308, 2319, 2322, 2334, 2340, 2342, 2355,
  2388, 236
];

async function inspect(prisma, label) {
  console.log(`\n=== Inspecting ${label} ===`);
  try {
    const entries = await prisma.ledger.findMany({
      where: { l_id: { in: ids } },
      orderBy: { l_id: 'asc' }
    });
    console.log(`Found ${entries.length} entries of ${ids.length} requested.`);
    for (const e of entries) {
      console.log(`  L_ID: ${e.l_id}, Cus_ID: ${e.cus_id}, Debit: ${e.debit_amount}, Credit: ${e.credit_amount}, Trnx Type: ${e.trnx_type}, Ledger Type: ${e.ledger_type}, Details: "${e.details}"`);
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
