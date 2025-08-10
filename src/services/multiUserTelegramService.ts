import TelegramBot from 'node-telegram-bot-api';
import { prisma } from '../db/prisma';
import { aiConversationService, shouldSendImages } from './aiConversationService';

interface UserBotInstance {
  bot: TelegramBot;
  userId: string;
  isActive: boolean;
}

class MultiUserTelegramService {
  private botInstances: Map<string, UserBotInstance> = new Map();

  // Start bot for a specific user with their token
  public async startUserBot(userId: string, token: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Stop existing bot if it exists
      await this.stopUserBot(userId);

      // Create new bot instance
      const bot = new TelegramBot(token, { polling: true });
      
      // Test the bot token first
      try {
        const botInfo = await bot.getMe();
        console.log(`✅ Bot token validated for user ${userId}: @${botInfo.username}`);
      } catch (error) {
        console.error(`❌ Invalid bot token for user ${userId}:`, error);
        return { success: false, error: 'Invalid bot token' };
      }

      // Set up handlers for this bot
      this.setupBotHandlers(bot, userId);

      // Store bot instance
      this.botInstances.set(userId, {
        bot,
        userId,
        isActive: true
      });

      console.log(`🤖 Started Telegram bot for user ${userId}`);
      return { success: true };

    } catch (error) {
      console.error(`Failed to start bot for user ${userId}:`, error);
      return { success: false, error: 'Failed to start bot' };
    }
  }

  // Stop bot for a specific user
  public async stopUserBot(userId: string): Promise<void> {
    const instance = this.botInstances.get(userId);
    if (instance) {
      try {
        await instance.bot.stopPolling();
        this.botInstances.delete(userId);
        console.log(`🤖 Stopped Telegram bot for user ${userId}`);
      } catch (error) {
        console.error(`Error stopping bot for user ${userId}:`, error);
      }
    }
  }

  // Get bot instance for a user
  public getUserBot(userId: string): TelegramBot | null {
    const instance = this.botInstances.get(userId);
    return instance?.isActive ? instance.bot : null;
  }

  // Set up handlers for a bot instance
  private setupBotHandlers(bot: TelegramBot, userId: string): void {
    // Handle /start command
    bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      const telegramUserId = String(msg.from?.id || '');
      const firstName = msg.from?.first_name || '';
      const lastName = msg.from?.last_name || '';
      const username = msg.from?.username || '';
      
      // Capture user details
      await this.captureUserDetails(telegramUserId, firstName, lastName, username, userId);
      
      // Use AI conversation service
      const response = await aiConversationService.processMessage(telegramUserId, '/start');
      await this.sendMessage(bot, chatId, response);
    });

    // Handle /properties command
    bot.onText(/\/properties/, async (msg) => {
      const chatId = msg.chat.id;
      const telegramUserId = String(msg.from?.id || '');
      
      const message = `🏘️ Property Search

Please specify the location where you're looking for properties:

🌍 Format: "State, City" or just "State"
📍 Examples:
• "Maharashtra, Mumbai"
• "Karnataka, Bangalore" 
• "Delhi"
• "Tamil Nadu, Chennai"

Type your preferred location:`;

      await this.sendMessage(bot, chatId, message);
      await this.logChatHistory(telegramUserId, '/properties', message, userId);
    });

    // Handle /help command
    bot.onText(/\/help/, async (msg) => {
      const chatId = msg.chat.id;
      const telegramUserId = String(msg.from?.id || '');
      
      const helpMessage = `🤖 How to use RRintelligence Bot:

📋 Commands:
• /start - Welcome message and introduction
• /properties - Browse properties by location
• /help - Show this help message

🏘️ Property Search:
1. Use /properties or say "show properties in [location]"
2. Specify state and city (e.g., "Maharashtra, Mumbai")
3. Browse property listings with details
4. Ask for images of specific properties
5. Get contact information for interested properties

💡 Tips:
• Be specific with locations for better results
• Ask for "images" to see property photos
• Provide your contact info for quick follow-ups
• Ask about budget, financing, or investment advice

Need help? Just ask me anything!`;

      await this.sendMessage(bot, chatId, helpMessage);
      await this.logChatHistory(telegramUserId, '/help', helpMessage, userId);
    });

    // Handle all text messages
    bot.on('message', async (msg) => {
      if (msg.text?.startsWith('/')) return; // Skip commands
      
      const chatId = msg.chat.id;
      const telegramUserId = String(msg.from?.id || '');
      const userMessage = msg.text || '';
      
      try {
        // Check if user is asking for property-related queries
        if (await this.isPropertyQuery(userMessage)) {
          await this.handlePropertyQuery(bot, chatId, telegramUserId, userMessage, userId);
          return;
        }

        // Use AI conversation service for general queries
        const response = await aiConversationService.processMessage(telegramUserId, userMessage);
        
        // Check if response indicates images should be sent
        const imageInstruction = shouldSendImages(response);
        if (imageInstruction.shouldSend) {
          // Send the text response first (without the image instruction)
          const cleanResponse = response.replace(/\[SEND_IMAGES:\d+\]/, '');
          await this.sendMessage(bot, chatId, cleanResponse);
          
          // Then send the actual images
          await this.sendActualPropertyImages(bot, chatId, telegramUserId, imageInstruction.propertyIndex, userId);
        } else {
          await this.sendMessage(bot, chatId, response);
        }
        
      } catch (error) {
        console.error('Error handling message:', error);
        await this.sendMessage(bot, chatId, 'Sorry, I encountered an error. Please try again later.');
      }
    });

    // Handle errors
    bot.on('error', (error) => {
      console.error(`Telegram bot error for user ${userId}:`, error);
    });

    // Handle polling errors
    bot.on('polling_error', (error) => {
      console.error(`Telegram polling error for user ${userId}:`, error);
      // If token becomes invalid, stop the bot
      if (error.code === 'ETELEGRAM' && error.response?.statusCode === 401) {
        console.log(`🤖 Stopping bot for user ${userId} due to invalid token`);
        this.stopUserBot(userId);
      }
    });
  }

  // Send message helper
  private async sendMessage(bot: TelegramBot, chatId: number, text: string): Promise<void> {
    try {
      await bot.sendMessage(chatId, text);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }

  // Capture user details and associate with bot owner
  private async captureUserDetails(telegramUserId: string, firstName: string, lastName: string, username: string, botOwnerId: string): Promise<void> {
    try {
      const fullName = `${firstName} ${lastName}`.trim();
      
      // Find or create lead
      let lead = await prisma.lead.findFirst({ where: { telegramUserId } });
      
      if (lead) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            name: lead.name || fullName || username || `User_${telegramUserId}`,
          }
        });
      } else {
        await prisma.lead.create({
          data: {
            telegramUserId,
            name: fullName || username || `User_${telegramUserId}`,
            status: 'NOT_QUALIFIED'
          }
        });
      }
    } catch (error) {
      console.error('Error capturing user details:', error);
    }
  }

  // Log chat history with bot owner info
  private async logChatHistory(telegramUserId: string, message: string, response: string, botOwnerId: string): Promise<void> {
    try {
      await prisma.chatHistory.create({
        data: {
          telegramUserId,
          message,
          response,
          messageType: 'text',
          language: 'en'
        }
      });
    } catch (error) {
      console.error('Error logging chat history:', error);
    }
  }

  // Send property images
  private async sendPropertyImages(bot: TelegramBot, chatId: number, telegramUserId: string, propertyNumber: number, botOwnerId: string): Promise<void> {
    try {
      // Get properties owned by the bot owner
      const properties = await prisma.property.findMany({
        where: { 
          isActive: true,
          userId: botOwnerId  // Only show properties owned by the bot owner
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      if (properties.length === 0) {
        await this.sendMessage(bot, chatId, 'No properties available to show images for.');
        return;
      }

      if (propertyNumber > properties.length || propertyNumber < 1) {
        await this.sendMessage(bot, chatId, `Property ${propertyNumber} not found. Please choose a number between 1 and ${properties.length}.`);
        return;
      }

      const property = properties[propertyNumber - 1];
      await this.showPropertyImages(bot, chatId, telegramUserId, property.id, botOwnerId);

    } catch (error) {
      console.error('Error sending property images:', error);
      await this.sendMessage(bot, chatId, 'Error retrieving property images.');
    }
  }

  // Show property images
  private async showPropertyImages(bot: TelegramBot, chatId: number, telegramUserId: string, propertyId: string, botOwnerId: string): Promise<void> {
    try {
      const property = await prisma.property.findFirst({
        where: { 
          id: propertyId,
          userId: botOwnerId  // Ensure property belongs to bot owner
        }
      });

      if (!property) {
        await this.sendMessage(bot, chatId, 'Property not found.');
        return;
      }

      const images = Array.isArray(property.images) ? property.images : [];
      
      if (images.length === 0) {
        await this.sendMessage(bot, chatId, 'No images available for this property.');
        return;
      }

      await this.sendMessage(bot, chatId, `📸 Sending ${images.length} images for this property...`);

      // Send each image
      for (let i = 0; i < images.length; i++) {
        try {
          const imageData = images[i];
          
          let imageBuffer;
          if (typeof imageData === 'string' && imageData.startsWith('data:image/')) {
            const base64Data = imageData.split(',')[1];
            imageBuffer = Buffer.from(base64Data, 'base64');
          } else if (typeof imageData === 'string') {
            imageBuffer = Buffer.from(imageData, 'base64');
          } else {
            continue;
          }

          await bot.sendPhoto(chatId, imageBuffer, {
            caption: `🏠 Property Image ${i + 1}/${images.length}\n📍 ${property.location}`
          });
          
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (imageError) {
          console.error(`Error sending image ${i + 1}:`, imageError);
          await this.sendMessage(bot, chatId, `❌ Could not load image ${i + 1}`);
        }
      }

      const response = `✅ Sent ${images.length} images for the property in ${property.location}.

Interested in this property? 
Reply with your contact number for quick follow-up!`;

      await this.sendMessage(bot, chatId, response);
      await this.logChatHistory(telegramUserId, `View images: ${propertyId}`, response, botOwnerId);
      
    } catch (error) {
      console.error('Error showing property images:', error);
      await this.sendMessage(bot, chatId, 'Error retrieving property images.');
    }
  }

  // Initialize bots for all active users
  public async initializeAllUserBots(): Promise<void> {
    try {
      const users = await prisma.user.findMany({
        where: {
          telegramBotActive: true,
          telegramBotToken: { not: null }
        },
        select: {
          id: true,
          telegramBotToken: true,
          username: true
        }
      });

      console.log(`🤖 Initializing bots for ${users.length} users`);

      for (const user of users) {
        if (user.telegramBotToken) {
          const result = await this.startUserBot(user.id, user.telegramBotToken);
          if (result.success) {
            console.log(`✅ Bot started for user ${user.username}`);
          } else {
            console.log(`❌ Failed to start bot for user ${user.username}: ${result.error}`);
          }
        }
      }
    } catch (error) {
      console.error('Error initializing user bots:', error);
    }
  }

  // Stop all bots
  public async stopAllBots(): Promise<void> {
    console.log('🤖 Stopping all user bots...');
    const userIds = Array.from(this.botInstances.keys());
    for (const userId of userIds) {
      await this.stopUserBot(userId);
    }
  }

  // Get active bot count
  public getActiveBotCount(): number {
    return this.botInstances.size;
  }

  // Get active bots info
  public getActiveBotsInfo(): Array<{ userId: string; isActive: boolean }> {
    return Array.from(this.botInstances.values()).map(instance => ({
      userId: instance.userId,
      isActive: instance.isActive
    }));
  }

  // Check if message is property-related
  private async isPropertyQuery(message: string): Promise<boolean> {
    const msg = message.toLowerCase();
    const propertyKeywords = [
      'properties', 'property', 'houses', 'house', 'apartments', 'apartment',
      'flat', 'flats', 'real estate', 'buy', 'rent', 'location', 'area',
      'price', 'show', 'list', 'available', 'images', 'photos', 'pictures',
      'mumbai', 'delhi', 'bangalore', 'chennai', 'kolkata', 'pune', 'hyderabad',
      'maharashtra', 'karnataka', 'tamil nadu', 'west bengal', 'rajasthan',
      'gujarat', 'uttar pradesh', 'madhya pradesh', 'bihar', 'odisha'
    ];
    
    return propertyKeywords.some(keyword => msg.includes(keyword));
  }

  // Handle property-specific queries
  private async handlePropertyQuery(bot: TelegramBot, chatId: number, telegramUserId: string, userMessage: string, botOwnerId: string): Promise<void> {
    const msg = userMessage.toLowerCase();
    
    // Extract location from message
    const location = this.extractLocation(userMessage);
    
    if (location) {
      // Search for properties in the specified location
      await this.searchPropertiesByLocation(bot, chatId, telegramUserId, location, userMessage, botOwnerId);
    } else {
      // Ask for location specification
      const response = `🏘️ I'd love to help you find properties!

Please specify the location you're interested in:

🌍 Format: "State, City" or just "State"
📍 Examples:
• "Properties in Maharashtra, Mumbai"
• "Show houses in Bangalore"
• "Apartments in Delhi"

Type your preferred location:`;

      await this.sendMessage(bot, chatId, response);
      await this.logChatHistory(telegramUserId, userMessage, response, botOwnerId);
    }
  }

  // Extract location from user message
  private extractLocation(message: string): string | null {
    const msg = message.toLowerCase();
    
    // Indian states and major cities
    const locations = [
      'mumbai', 'delhi', 'bangalore', 'bengaluru', 'chennai', 'kolkata', 'pune', 
      'hyderabad', 'ahmedabad', 'surat', 'jaipur', 'lucknow', 'kanpur', 'nagpur',
      'maharashtra', 'karnataka', 'tamil nadu', 'west bengal', 'rajasthan',
      'gujarat', 'uttar pradesh', 'madhya pradesh', 'bihar', 'odisha', 'kerala',
      'punjab', 'haryana', 'jharkhand', 'assam', 'uttarakhand', 'himachal pradesh'
    ];
    
    for (const location of locations) {
      if (msg.includes(location)) {
        return location;
      }
    }
    
    // Try to extract "in [location]" pattern
    const locationMatch = msg.match(/in\s+([a-z\s,]+)/i);
    if (locationMatch) {
      return locationMatch[1].trim();
    }
    
    return null;
  }

  // Search properties by location
  private async searchPropertiesByLocation(bot: TelegramBot, chatId: number, telegramUserId: string, location: string, originalMessage: string, botOwnerId: string): Promise<void> {
    try {
      // Search for properties matching the location (owned by the bot owner)
      const properties = await prisma.property.findMany({
        where: {
          location: {
            contains: location,
            mode: 'insensitive'
          },
          isActive: true,
          userId: botOwnerId  // Only show properties owned by this user
        },
        include: {
          user: true
        },
        take: 10 // Limit to 10 properties
      });

      if (properties.length === 0) {
        const response = `🔍 No properties found in "${location}".

Try searching for:
• Nearby cities or areas
• Different spellings
• Broader location (e.g., just state name)

Or type /properties to start a new search.`;

        await this.sendMessage(bot, chatId, response);
        await this.logChatHistory(telegramUserId, originalMessage, response, botOwnerId);
        return;
      }

      // Display properties list
      let response = `🏘️ Found ${properties.length} properties in "${location}":

`;

      for (let i = 0; i < Math.min(properties.length, 5); i++) {
        const property = properties[i];
        const imagesCount = Array.isArray(property.images) ? property.images.length : 0;
        
        response += `${i + 1}. 🏠 **Property ${property.id.slice(-8)}**
📍 Location: ${property.location}
💰 Price: ₹${property.pricePerSqft}/sqft
🏢 Type: ${property.propertyType || 'Not specified'}
📏 Area: ${property.area || 'Not specified'} sqft
🛏️ Bedrooms: ${property.bedrooms || 'Not specified'}
🚿 Bathrooms: ${property.bathrooms || 'Not specified'}
📸 Images: ${imagesCount} available
📞 Contact: ${property.contactInfo}

`;
      }

      if (properties.length > 5) {
        response += `... and ${properties.length - 5} more properties.

`;
      }

      response += `💡 To see more details or images of any property, reply with:
• "Show details of property [number]"
• "Images of property [number]"
• "Contact details for property [number]"`;

      await this.sendMessage(bot, chatId, response);
      await this.logChatHistory(telegramUserId, originalMessage, response, botOwnerId);
      
    } catch (error) {
      console.error('Error searching properties:', error);
      await this.sendMessage(bot, chatId, 'Sorry, I encountered an error while searching for properties. Please try again.');
    }
  }

  // New method to send actual property images from database
  private async sendActualPropertyImages(bot: TelegramBot, chatId: number, telegramUserId: string, propertyIndex: number, userId: string): Promise<void> {
    try {
      // Get images using the AI service method
      const images = await aiConversationService.getPropertyImages(propertyIndex);
      
      if (images.length === 0) {
        await this.sendMessage(bot, chatId, '📸 No images available for this property.');
        return;
      }

      // Send each image
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        
        try {
          if (image.base64) {
            // Send base64 image
            const buffer = Buffer.from(image.base64.split(',')[1], 'base64');
            await bot.sendPhoto(chatId, buffer, {
              caption: image.description || `Property Image ${i + 1}`
            });
          } else if (image.url) {
            // Send image URL
            await bot.sendPhoto(chatId, image.url, {
              caption: image.description || `Property Image ${i + 1}`
            });
          }
          
          // Small delay between images
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (imageError) {
          console.error(`Error sending image ${i + 1}:`, imageError);
          await this.sendMessage(bot, chatId, `📸 Image ${i + 1}: ${image.description || 'Property photo'} (failed to load)`);
        }
      }
      
      await this.sendMessage(bot, chatId, `📸 Sent ${images.length} images!`);
      
      // Log this interaction
      await this.logChatHistory(telegramUserId, `Images for property ${propertyIndex + 1}`, `${images.length} property images sent`, userId);
      
    } catch (error) {
      console.error('Error sending property images:', error);
      await this.sendMessage(bot, chatId, '📸 Sorry, could not send images right now.');
    }
  }
}

export const multiUserTelegramService = new MultiUserTelegramService();
