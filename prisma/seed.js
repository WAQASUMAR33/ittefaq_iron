const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // 1. Create Admin User
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.users.create({
    data: {
      role: 'SUPER_ADMIN',
      full_name: 'Admin User',
      email: 'admin@itefaqbuilders.com',
      password: hashedPassword,
      is_verified: true,
      status: 'ACTIVE'
    }
  });
  console.log('✅ Admin user created:', adminUser.email);

  // 2. Create Customer Categories
  const customerCategories = await Promise.all([
    prisma.customerCategory.create({ data: { cus_cat_title: 'Regular', updated_by: adminUser.user_id } }),
    prisma.customerCategory.create({ data: { cus_cat_title: 'VIP', updated_by: adminUser.user_id } }),
    prisma.customerCategory.create({ data: { cus_cat_title: 'Wholesale', updated_by: adminUser.user_id } })
  ]);
  console.log('✅ Customer categories created:', customerCategories.length);

  // 3. Create Customer Types
  const customerTypes = await Promise.all([
    prisma.customerType.create({ data: { cus_type_title: 'Customer', updated_by: adminUser.user_id } }),
    prisma.customerType.create({ data: { cus_type_title: 'Cash Account', updated_by: adminUser.user_id } }),
    prisma.customerType.create({ data: { cus_type_title: 'Supplier', updated_by: adminUser.user_id } })
  ]);
  console.log('✅ Customer types created:', customerTypes.length);

  // 4. Create Cities
  const cities = await Promise.all([
    prisma.city.create({ data: { city_name: 'Parianwali', updated_by: adminUser.user_id } }),
    prisma.city.create({ data: { city_name: 'Lahore', updated_by: adminUser.user_id } }),
    prisma.city.create({ data: { city_name: 'Karachi', updated_by: adminUser.user_id } }),
    prisma.city.create({ data: { city_name: 'Islamabad', updated_by: adminUser.user_id } })
  ]);
  console.log('✅ Cities created:', cities.length);

  // 5. Create Sample Cash Account
  const cashAccount = await prisma.customer.create({
    data: {
      cus_category: customerCategories[0].cus_cat_id,
      cus_type: customerTypes[1].cus_type_id, // Cash Account
      cus_name: 'Cash Account',
      cus_phone_no: '0000000000',
      cus_address: 'Main Office',
      cus_balance: 0,
      city_id: cities[0].city_id,
      updated_by: adminUser.user_id
    }
  });
  console.log('✅ Cash account created');

  // 6. Create Expense Titles
  const expenseTitles = await Promise.all([
    prisma.expenseTitle.create({ data: { title: 'Salary' } }),
    prisma.expenseTitle.create({ data: { title: 'Rent' } }),
    prisma.expenseTitle.create({ data: { title: 'Utilities' } }),
    prisma.expenseTitle.create({ data: { title: 'Transportation' } }),
    prisma.expenseTitle.create({ data: { title: 'Maintenance' } }),
    prisma.expenseTitle.create({ data: { title: 'Office Supplies' } }),
    prisma.expenseTitle.create({ data: { title: 'Other' } })
  ]);
  console.log('✅ Expense titles created:', expenseTitles.length);

  // 7. Create Sample Categories
  const categories = await Promise.all([
    prisma.categories.create({ 
      data: { 
        cat_name: 'Building Materials', 
        cat_code: 'BM001',
        updated_by: adminUser.user_id 
      } 
    }),
    prisma.categories.create({ 
      data: { 
        cat_name: 'Tools & Equipment', 
        cat_code: 'TE001',
        updated_by: adminUser.user_id 
      } 
    })
  ]);
  console.log('✅ Categories created:', categories.length);

  // 8. Create Sample Sub Categories
  const subCategories = await Promise.all([
    prisma.subCategory.create({ 
      data: { 
        cat_id: categories[0].cat_id,
        sub_cat_name: 'Cement', 
        sub_cat_code: 'BM-CEM',
        updated_by: adminUser.user_id 
      } 
    }),
    prisma.subCategory.create({ 
      data: { 
        cat_id: categories[0].cat_id,
        sub_cat_name: 'Bricks', 
        sub_cat_code: 'BM-BRK',
        updated_by: adminUser.user_id 
      } 
    })
  ]);
  console.log('✅ Sub categories created:', subCategories.length);

  console.log('🎉 Seed completed successfully!');
  console.log('');
  console.log('📝 Login Credentials:');
  console.log('   Email: admin@itefaqbuilders.com');
  console.log('   Password: admin123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });



