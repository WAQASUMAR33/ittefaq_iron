const { PrismaClient } = require('@prisma/client');

// We URL-encode the '@' symbols in the password as '%40' to prevent parsing errors
const dbLive = new PrismaClient({
  datasources: {
    db: {
      url: "mysql://u889453186_parianwali:DildilPakistan786%40786%40parianwali@195.35.59.84:3306/u889453186_parianwali"
    }
  }
});

async function main() {
  try {
    console.log('Testing connection to Live DB with encoded URL...');
    const count = await dbLive.ledger.count();
    console.log(`Connection successful! Total ledger entries: ${count}`);
  } catch (err) {
    console.error('Connection failed:', err.message);
  } finally {
    await dbLive.$disconnect();
  }
}

main();
