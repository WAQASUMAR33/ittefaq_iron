const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const count = await prisma.saleReturn.count();
    console.log(`Total SaleReturn count in DB: ${count}`);

    const returns = await prisma.saleReturn.findMany({
      include: {
        sale: true,
        customer: {
          include: {
            customer_category: true
          }
        },
        return_details: {
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
            loader_phone: true,
            loader_balance: true
          }
        },
        updated_by_user: {
          select: {
            full_name: true,
            role: true
          }
        }
      },
      take: 5
    });

    console.log('Sample SaleReturn records:', JSON.stringify(returns, null, 2));

  } catch (e) {
    console.error('CRITICAL ERROR:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
