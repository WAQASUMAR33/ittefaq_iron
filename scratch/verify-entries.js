const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();

async function main() {
  console.log('DATABASE_URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@'));
  console.log('');

  // Direct raw SQL query - bypasses any Prisma caching
  const result = await p.$queryRawUnsafe(
    'SELECT l_id, debit_amount, credit_amount, opening_balance, closing_balance FROM ledger WHERE l_id IN (236, 2502, 2428, 1838, 1830, 1960, 1891) ORDER BY l_id'
  );

  console.log('Direct SQL query results:');
  console.log('┌──────┬──────────────┬──────────────┬──────────────┬──────────────┐');
  console.log('│ l_id │    Debit     │    Credit    │  Opening Bal │  Closing Bal │');
  console.log('├──────┼──────────────┼──────────────┼──────────────┼──────────────┤');
  for (const r of result) {
    console.log(
      `│ ${String(r.l_id).padStart(4)} │ ${String(r.debit_amount).padStart(12)} │ ${String(r.credit_amount).padStart(12)} │ ${String(r.opening_balance).padStart(12)} │ ${String(r.closing_balance).padStart(12)} │`
    );
  }
  console.log('└──────┴──────────────┴──────────────┴──────────────┴──────────────┘');
}

main().finally(() => p.$disconnect());
