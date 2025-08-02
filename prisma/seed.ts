import { PrismaClient, LeadStatus, FollowUpStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

async function main() {
  console.log('🌱 Starting to seed database...');

  // Hash password for demo account
  const saltRounds = 12;
  const adminPassword = await bcrypt.hash('admin123', saltRounds);
  const userPassword = await bcrypt.hash('user123', saltRounds);

  // Create sample admin user
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@rrcrm.com' },
    update: {},
    create: {
      username: 'admin',
      companyName: 'RR Intelligence',
      phoneNumber: '+1234567890',
      email: 'admin@rrcrm.com',
      password: adminPassword,
    },
  });

  console.log('✅ Created admin user:', adminUser.email);

  // Create sample regular user
  const regularUser = await prisma.user.upsert({
    where: { email: 'demo@rrcrm.com' },
    update: {},
    create: {
      username: 'demo_user',
      companyName: 'Demo Real Estate',
      phoneNumber: '+9876543210',
      email: 'demo@rrcrm.com',
      password: userPassword,
    },
  });

  console.log('✅ Created demo user:', regularUser.email);

  // Create sample properties
  const properties = [
    {
      userId: adminUser.id,
      images: [
        'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
        'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
        'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='
      ],
      description: 'Beautiful 3-bedroom apartment in downtown with modern amenities and city views.',
      pricePerSqft: 250.00,
      location: 'Downtown Mumbai',
      contactInfo: 'admin@rrcrm.com | +1234567890',
      propertyType: 'Apartment',
      area: 1200.00,
      bedrooms: 3,
      bathrooms: 2,
      isActive: true,
    },
    {
      userId: adminUser.id,
      images: [
        'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
        'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
        'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
        'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='
      ],
      description: 'Spacious 4-bedroom villa with garden and swimming pool in premium location.',
      pricePerSqft: 180.00,
      location: 'Bandra West, Mumbai',
      contactInfo: 'admin@rrcrm.com | +1234567890',
      propertyType: 'Villa',
      area: 2500.00,
      bedrooms: 4,
      bathrooms: 3,
      isActive: true,
    },
    {
      userId: regularUser.id,
      images: [
        'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
        'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
        'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k='
      ],
      description: 'Cozy 2-bedroom apartment perfect for young professionals.',
      pricePerSqft: 200.00,
      location: 'Andheri East, Mumbai',
      contactInfo: 'demo@rrcrm.com | +9876543210',
      propertyType: 'Apartment',
      area: 800.00,
      bedrooms: 2,
      bathrooms: 1,
      isActive: true,
    },
  ];

  for (const propertyData of properties) {
    const property = await prisma.property.create({
      data: propertyData,
    });
    console.log('✅ Created property:', property.location);
  }

  // Create sample leads
  const leads = [
    {
      telegramUserId: '123456789',
      name: 'Rajesh Kumar',
      phoneNumber: '+919876543210',
      budget: 5000000.00, // 50 lakhs
      expectations: 'Looking for a 3BHK apartment in Mumbai with good connectivity',
      status: LeadStatus.HIGH,
      language: 'en',
    },
    {
      telegramUserId: '987654321',
      name: 'Priya Sharma',
      phoneNumber: '+918765432109',
      budget: 2500000.00, // 25 lakhs
      expectations: 'Need a 2BHK flat for investment purpose',
      status: LeadStatus.MEDIUM,
      language: 'en',
    },
    {
      telegramUserId: '456789123',
      name: 'Mohammed Ali',
      phoneNumber: '+917654321098',
      budget: 1000000.00, // 10 lakhs
      expectations: 'Just looking around, not sure about budget',
      status: LeadStatus.NOT_QUALIFIED,
      language: 'en',
    },
    {
      telegramUserId: '789123456',
      name: 'Sunita Devi',
      phoneNumber: '+916543210987',
      budget: 7500000.00, // 75 lakhs
      expectations: 'Want to buy a villa with swimming pool and garden',
      status: LeadStatus.HIGH,
      language: 'hi',
    },
  ];

  for (const leadData of leads) {
    const lead = await prisma.lead.create({
      data: leadData,
    });
    console.log('✅ Created lead:', lead.name);

    // Create sample chat history for each lead
    await prisma.chatHistory.create({
      data: {
        telegramUserId: lead.telegramUserId,
        leadId: lead.id,
        message: 'Hi, I am looking for a property in Mumbai',
        response: 'Hello! I\'d be happy to help you find the perfect property. What type of property are you looking for?',
        messageType: 'text',
        language: lead.language,
      },
    });

    // Create sample follow-up for high-value leads
    if (lead.status === 'HIGH') {
      await prisma.followUp.create({
        data: {
          leadId: lead.id,
          activity: 'Schedule property viewing',
          status: FollowUpStatus.PENDING,
          notes: 'Lead is interested in premium properties, schedule site visit',
        },
      });
    }
  }

  console.log('🎉 Database seeding completed!');
  console.log('\n📋 Sample Accounts Created:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👑 ADMIN ACCOUNT:');
  console.log('   Email: admin@rrcrm.com');
  console.log('   Password: admin123');
  console.log('   Company: RR Intelligence');
  console.log('');
  console.log('👤 DEMO ACCOUNT:');
  console.log('   Email: demo@rrcrm.com');
  console.log('   Password: user123');
  console.log('   Company: Demo Real Estate');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 SAMPLE DATA CREATED:');
  console.log('   • 3 Properties (2 admin, 1 demo user)');
  console.log('   • 4 Leads (various qualification levels)');
  console.log('   • Chat history for each lead');
  console.log('   • Follow-up tasks for high-value leads');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
