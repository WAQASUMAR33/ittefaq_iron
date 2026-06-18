const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const accountIds = [197, 148, 157, 161];
  for (const id of accountIds) {
    const subsequentEntries = await prisma.ledger.findMany({
      where: {
        cus_id: id,
        l_id: { gt: 1265 }
      },
      orderBy: { l_id: 'asc' }
    });
    console.log(`Subsequent entries for account ${id}: ${subsequentEntries.length}`);
    if (subsequentEntries.length > 0) {
      console.log(subsequentEntries.map(e => ({
        l_id: e.l_id,
        bill_no: e.bill_no,
        trnx_type: e.trnx_type,
        opening: e.opening_balance,
        closing: e.closing_balance
      })));
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
