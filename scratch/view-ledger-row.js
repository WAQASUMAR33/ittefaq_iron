const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const row = await prisma.ledger.findUnique({
      where: { l_id: 2502 }
    });
    console.log(row);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
