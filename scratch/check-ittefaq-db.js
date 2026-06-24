const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Checking ittefaq builders database columns for primary keys...");
    
    const tables = [
      { name: 'customer_categories', pk: 'cus_cat_id' },
      { name: 'customer_types', pk: 'cus_type_id' },
      { name: 'cities', pk: 'city_id' },
      { name: 'customers', pk: 'cus_id' },
      { name: 'categories', pk: 'cat_id' },
      { name: 'sub_categories', pk: 'sub_cat_id' },
      { name: 'products', pk: 'pro_id' },
      { name: 'ledger', pk: 'l_id' },
      { name: 'expense_titles', pk: 'id' },
      { name: 'expenses', pk: 'exp_id' }
    ];

    for (const table of tables) {
      try {
        const columns = await prisma.$queryRawUnsafe(`SHOW COLUMNS FROM \`${table.name}\` WHERE Field = '${table.pk}'`);
        if (columns.length > 0) {
          const isAutoincrement = columns[0].Extra && columns[0].Extra.includes('auto_increment');
          console.log(`Table ${table.name} (${table.pk}) auto_increment:`, isAutoincrement ? "YES" : "NO", `(Extra: ${columns[0].Extra})`);
        } else {
          console.log(`Table ${table.name}: ${table.pk} field not found`);
        }
      } catch (err) {
        console.log(`Error checking table ${table.name}:`, err.message);
      }
    }
  } catch (err) {
    console.error("Error connecting to database:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
