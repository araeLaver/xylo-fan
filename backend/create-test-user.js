const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createTestUser() {
  try {
    console.log('Creating test user...');

    const testUserId = '00000000-0000-0000-0000-000000000000';

    // Check if test user exists
    const existingUser = await prisma.users.findUnique({
      where: { id: testUserId },
    });

    if (existingUser) {
      console.log('✓ Test user already exists');
      return;
    }

    // Create test user
    const user = await prisma.users.create({
      data: {
        id: testUserId,
        referral_code: 'TEST0000',
        primary_platform: 'X',
        x_id: 'test_user_000',
        x_handle: 'test_user',
        x_display_name: 'Test User',
      },
    });

    console.log('✓ Test user created successfully:', user.id);

  } catch (error) {
    console.error('❌ Error creating test user:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
