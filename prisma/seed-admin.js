const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting admin user seeding...');

  // Admin users to create
  const adminUsers = [
    {
      full_name: 'Super Admin',
      email: 'superadmin@itefaqbuilders.com',
      password: 'Admin@123',
      role: 'SUPER_ADMIN',
      is_verified: true,
      status: 'ACTIVE'
    },
    {
      full_name: 'Admin User',
      email: 'admin@itefaqbuilders.com',
      password: 'Admin@123',
      role: 'ADMIN',
      is_verified: true,
      status: 'ACTIVE'
    },
    {
      full_name: 'Sales Manager',
      email: 'sales@itefaqbuilders.com',
      password: 'Sales@123',
      role: 'SALESMAN',
      is_verified: true,
      status: 'ACTIVE'
    }
  ];

  for (const userData of adminUsers) {
    try {
      // Check if user already exists
      const existingUser = await prisma.users.findUnique({
        where: { email: userData.email }
      });

      if (existingUser) {
        console.log(`⚠️  User ${userData.email} already exists, skipping...`);
        continue;
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Create the user
      const user = await prisma.users.create({
        data: {
          full_name: userData.full_name,
          email: userData.email,
          password: hashedPassword,
          role: userData.role,
          is_verified: userData.is_verified,
          status: userData.status
        }
      });

      console.log(`✅ Created ${userData.role}: ${userData.email}`);
      console.log(`   Password: ${userData.password}`);
    } catch (error) {
      console.error(`❌ Error creating user ${userData.email}:`, error.message);
    }
  }

  console.log('\n🎉 Admin user seeding completed!');
  console.log('\n📋 Login Credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('SUPER ADMIN:');
  console.log('  Email: superadmin@itefaqbuilders.com');
  console.log('  Password: Admin@123');
  console.log('');
  console.log('ADMIN:');
  console.log('  Email: admin@itefaqbuilders.com');
  console.log('  Password: Admin@123');
  console.log('');
  console.log('SALESMAN:');
  console.log('  Email: sales@itefaqbuilders.com');
  console.log('  Password: Sales@123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
