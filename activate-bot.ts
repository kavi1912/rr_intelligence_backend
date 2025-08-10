// Quick script to activate kaviraj's bot
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function activateBot() {
  try {
    // Find kaviraj user
    const user = await prisma.user.findFirst({
      where: {
        username: 'kaviraj'
      }
    });

    if (!user) {
      console.log('❌ User kaviraj not found');
      return;
    }

    console.log('🔍 Found user:', {
      id: user.id,
      username: user.username,
      hasToken: !!user.telegramBotToken,
      isActive: user.telegramBotActive
    });

    if (!user.telegramBotToken) {
      console.log('❌ No bot token found for user');
      return;
    }

    // Activate the bot
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        telegramBotActive: true
      }
    });

    console.log('✅ Bot activated for user kaviraj');
    console.log('🚀 Now restart your backend server to start the bot!');
    console.log('💡 Or go to your profile page and toggle the bot active switch');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

activateBot();
