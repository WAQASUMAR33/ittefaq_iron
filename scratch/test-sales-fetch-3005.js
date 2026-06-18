const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('--- Fetching from port 3005 ---');
  try {
    const sale = await prisma.sale.findFirst({
      orderBy: { created_at: 'desc' }
    });

    if (!sale) {
      console.log('No sales found.');
      return;
    }

    const url = `http://localhost:3005/api/sales?id=${sale.sale_id}`;
    console.log(`📡 Sending request to: ${url}`);
    
    const res = await fetch(url);
    console.log(`Response status: ${res.status} ${res.statusText}`);
    
    if (res.ok) {
      const data = await res.json();
      console.log('✅ Success! Data returned:', JSON.stringify(data, null, 2));
    } else {
      const text = await res.text();
      console.log(`❌ Error: ${text}`);
    }
  } catch (err) {
    console.error('❌ Fetch failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
