const { PrismaClient } = require('@prisma/client');

const dbLocal = new PrismaClient({
  datasources: {
    db: {
      url: "mysql://Ittefaqiron:DildilPakistan786-786_waqas@72.60.76.68:3306/Ittefaqiron"
    }
  }
});

async function main() {
  try {
    console.log('Querying databases on 72.60.76.68...');
    const res = await dbLocal.$queryRawUnsafe('SHOW DATABASES');
    console.log('Available databases:');
    console.log(res);
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await dbLocal.$disconnect();
  }
}

main();
