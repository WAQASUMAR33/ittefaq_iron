const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  console.log('--- Direct GET Route Query Simulation ---');
  try {
    const sale = await prisma.sale.findFirst({
      orderBy: { created_at: 'desc' }
    });

    if (!sale) {
      console.log('No sales found.');
      return;
    }

    const API_BASE_URL = 'http://localhost:3005';
    const url = `${API_BASE_URL}/api/sales?id=${sale.sale_id}`;

    const id = sale.sale_id;
    console.log(`Simulating GET with sale ID: ${id}`);

    const fullSale = await prisma.sale.findUnique({
      where: { sale_id: id },
      include: {
        customer: {
          include: {
            customer_category: true
          }
        },
        sale_details: {
          include: {
            product: {
              include: {
                category: true,
                sub_category: true
              }
            }
          }
        },
        debit_account: {
          select: {
            cus_id: true,
            cus_name: true,
            cus_phone_no: true
          }
        },
        credit_account: {
          select: {
            cus_id: true,
            cus_name: true,
            cus_phone_no: true
          }
        },
        loader: {
          select: {
            loader_id: true,
            loader_name: true,
            loader_number: true,
            loader_phone: true
          }
        },
        split_payments: {
          include: {
            debit_account: true,
            credit_account: true
          }
        },
        updated_by_user: {
          select: {
            full_name: true,
            role: true
          }
        }
      }
    });

    console.log('✅ Exact API query succeeded!');
  } catch (err) {
    console.error('❌ Exact API query failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

run();
