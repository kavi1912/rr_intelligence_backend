import TelegramBot from 'node-telegram-bot-api';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '../db/prisma';
import { aiConversationService } from './aiConversationService';

interface TelegramBotService {
  bot: TelegramBot | null;
  startBot(): void;
  stopBot(): void;
  sendMessage(chatId: number, text: string): Promise<void>;
}

class TelegramBotServiceImpl implements TelegramBotService {
  public bot: TelegramBot | null = null;
  private model: any;

  constructor() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      console.warn('TELEGRAM_BOT_TOKEN not found, Telegram bot will be disabled');
      return;
    }

    this.bot = new TelegramBot(token, { polling: false });
    
    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    this.model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    this.setupHandlers();
  }

  private setupHandlers() {
    // Handle /start command
    this.bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      const telegramUserId = String(msg.from?.id || '');
      const firstName = msg.from?.first_name || '';
      const lastName = msg.from?.last_name || '';
      const username = msg.from?.username || '';
      
      // Capture user details and create/update lead
      await this.captureUserDetails(telegramUserId, firstName, lastName, username);
      
      // Use AI conversation service to handle start message
      const response = await aiConversationService.processMessage(telegramUserId, '/start');
      await this.sendMessage(chatId, response);
    });

    // Handle /properties command
    this.bot.onText(/\/properties/, async (msg) => {
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

      await this.sendMessage(chatId, message);
      await this.logChatHistory(telegramUserId, '/properties', message);
    });

    // Handle /help command
    this.bot.onText(/\/help/, async (msg) => {
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

      await this.sendMessage(chatId, helpMessage);
      await this.logChatHistory(telegramUserId, '/help', helpMessage);
    });

    // Handle all text messages
    this.bot.on('message', async (msg) => {
      if (msg.text?.startsWith('/')) return; // Skip commands
      
      const chatId = msg.chat.id;
      const telegramUserId = String(msg.from?.id || '');
      const userMessage = msg.text || '';
      
      try {
        // Use AI conversation service for all messages
        const response = await aiConversationService.processMessage(telegramUserId, userMessage);
        
        // Check if response indicates images should be sent
        if (response.includes('[Images will be sent separately]')) {
          // Extract property number if specified, otherwise send first property
          const propertyMatch = userMessage.match(/property\s*(\d+)/i);
          if (propertyMatch) {
            const propertyNumber = parseInt(propertyMatch[1]);
            await this.sendPropertyImages(chatId, telegramUserId, propertyNumber);
          } else {
            // No specific property number, send images of first available property
            await this.sendPropertyImages(chatId, telegramUserId, 1);
          }
        }
        
        await this.sendMessage(chatId, response);
        
      } catch (error) {
        console.error('Error handling message:', error);
        await this.sendMessage(chatId, 'Sorry, I encountered an error. Please try again later.');
      }
    });

    // Handle callback queries (inline buttons)
    this.bot.on('callback_query', async (callbackQuery) => {
      const chatId = callbackQuery.message?.chat.id;
      const telegramUserId = String(callbackQuery.from.id);
      const data = callbackQuery.data;
      
      if (!chatId || !data) return;
      
      try {
        if (data.startsWith('property_')) {
          const propertyId = data.replace('property_', '');
          await this.showPropertyDetails(chatId, telegramUserId, propertyId);
        } else if (data.startsWith('images_')) {
          const propertyId = data.replace('images_', '');
          await this.showPropertyImages(chatId, telegramUserId, propertyId);
        }
        
        // Answer the callback query
        await this.bot.answerCallbackQuery(callbackQuery.id);
        
      } catch (error) {
        console.error('Error handling callback query:', error);
        await this.bot.answerCallbackQuery(callbackQuery.id, { text: 'Error occurred' });
      }
    });

    // Handle errors
    this.bot.on('error', (error) => {
      console.error('Telegram bot error:', error);
    });
  }

  private async generateAIResponse(userMessage: string, telegramUserId: string): Promise<string> {
    try {
      // Get user's chat history for context
      const recentHistory = await prisma.chatHistory.findMany({
        where: { telegramUserId },
        orderBy: { timestamp: 'desc' },
        take: 5
      });

      // Check if we have properties in database
      const propertyCount = await prisma.property.count({ where: { isActive: true } });
      
      // Build context for AI
      const context = `You are RRintelligence CRM's AI assistant for real estate. 
IMPORTANT: Use web search to get current market data, property prices, and real estate trends when relevant.      
User's recent conversation:
${recentHistory.map(h => `User: ${h.message}\nBot: ${h.response || 'No response'}`).join('\n')}

Current database status: ${propertyCount > 0 ? `${propertyCount} active properties available` : 'No properties currently in database'}

Guidelines:
- Be helpful and professional
- Ask qualifying questions (budget, location, property type, size)
- For property searches: ${propertyCount > 0 ? 'offer to show available properties' : 'say "We are updating our property database. Our team will contact you soon with available options."'}
- Always try to collect contact info (WhatsApp/email) for high-intent users
- Classify user intent: HIGH (ready to buy/visit), MEDIUM (researching), LOW (just browsing)
- For property valuations, ask for location and property details
- For investment queries, ask about budget and preferred areas
- Keep responses concise but informative

Current user message: "${userMessage}"

Respond naturally and helpfully:`;

      const result = await this.model.generateContent(context);
      const response = result.response;
      return response.text() || 'I apologize, but I couldn\'t generate a proper response. Please try again.';
      
    } catch (error) {
      console.error('Error generating AI response:', error);
      return 'I apologize for the technical difficulty. Please try again or contact our support team.';
    }
  }

  private async logChatHistory(telegramUserId: string, message: string, response?: string): Promise<void> {
    try {
      await prisma.chatHistory.create({
        data: {
          telegramUserId,
          message,
          response: response || null,
          messageType: 'text',
          language: 'en'
        }
      });
    } catch (error) {
      console.error('Error logging chat history:', error);
    }
  }

  private async updateLead(telegramUserId: string, userMessage: string, botResponse: string): Promise<void> {
    try {
      // Analyze message for lead qualification
      const intent = this.analyzeIntent(userMessage, botResponse);
      
      if (intent.status === 'NOT_QUALIFIED') return;

      // Find or create lead
      let lead = await prisma.lead.findFirst({ where: { telegramUserId } });
      
      if (lead) {
        // Update existing lead
        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            status: intent.status,
            phoneNumber: intent.phoneNumber || lead.phoneNumber,
            budget: intent.budget || lead.budget,
            expectations: intent.expectations || lead.expectations
          }
        });
      } else {
        // Create new lead
        lead = await prisma.lead.create({
          data: {
            telegramUserId,
            status: intent.status,
            phoneNumber: intent.phoneNumber,
            budget: intent.budget,
            expectations: intent.expectations
          }
        });
      }

      // Create follow-up if needed
      if (intent.followUpActivity) {
        await prisma.followUp.create({
          data: {
            leadId: lead.id,
            activity: intent.followUpActivity,
            status: 'PENDING'
          }
        });
      }
    } catch (error) {
      console.error('Error updating lead:', error);
    }
  }

  // New method to capture user details
  private async captureUserDetails(telegramUserId: string, firstName: string, lastName: string, username: string): Promise<void> {
    try {
      const fullName = `${firstName} ${lastName}`.trim();
      
      // Find or create lead with telegram details
      let lead = await prisma.lead.findFirst({ where: { telegramUserId } });
      
      if (lead) {
        // Update existing lead with telegram details
        await prisma.lead.update({
          where: { id: lead.id },
          data: {
            name: lead.name || fullName || username || `User_${telegramUserId}`,
          }
        });
      } else {
        // Create new lead with telegram details
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
  private async handlePropertyQuery(chatId: number, telegramUserId: string, userMessage: string): Promise<void> {
    const msg = userMessage.toLowerCase();
    
    // Extract location from message
    const location = this.extractLocation(userMessage);
    
    if (location) {
      // Search for properties in the specified location
      await this.searchPropertiesByLocation(chatId, telegramUserId, location, userMessage);
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

      await this.sendMessage(chatId, response);
      await this.logChatHistory(telegramUserId, userMessage, response);
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
  private async searchPropertiesByLocation(chatId: number, telegramUserId: string, location: string, originalMessage: string): Promise<void> {
    try {
      // Search for properties matching the location
      const properties = await prisma.property.findMany({
        where: {
          location: {
            contains: location,
            mode: 'insensitive'
          },
          isActive: true
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

        await this.sendMessage(chatId, response);
        await this.logChatHistory(telegramUserId, originalMessage, response);
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

      // Create inline keyboard for quick actions
      const keyboard = [];
      for (let i = 0; i < Math.min(properties.length, 3); i++) {
        const property = properties[i];
        keyboard.push([
          {
            text: `📋 Details ${i + 1}`,
            callback_data: `property_${property.id}`
          },
          {
            text: `📸 Images ${i + 1}`,
            callback_data: `images_${property.id}`
          }
        ]);
      }

      await this.bot.sendMessage(chatId, response, {
        reply_markup: {
          inline_keyboard: keyboard
        },
        parse_mode: 'Markdown'
      });

      await this.logChatHistory(telegramUserId, originalMessage, response);
      
      // Update lead status to MEDIUM (showing interest in properties)
      await this.updateLead(telegramUserId, originalMessage, response);
      
    } catch (error) {
      console.error('Error searching properties:', error);
      await this.sendMessage(chatId, 'Sorry, I encountered an error while searching for properties. Please try again.');
    }
  }

  // Show detailed property information
  private async showPropertyDetails(chatId: number, telegramUserId: string, propertyId: string): Promise<void> {
    try {
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        include: { user: true }
      });

      if (!property) {
        await this.sendMessage(chatId, 'Property not found.');
        return;
      }

      const imagesCount = Array.isArray(property.images) ? property.images.length : 0;
      
      const details = `🏠 **Property Details**

📍 **Location:** ${property.location}
💰 **Price:** ₹${property.pricePerSqft}/sqft
🏢 **Type:** ${property.propertyType || 'Not specified'}
📏 **Area:** ${property.area || 'Not specified'} sqft
🛏️ **Bedrooms:** ${property.bedrooms || 'Not specified'}
🚿 **Bathrooms:** ${property.bathrooms || 'Not specified'}
📸 **Images:** ${imagesCount} available

📝 **Description:**
${property.description}

📞 **Contact Information:**
${property.contactInfo}

💡 Reply "images" to see property photos!`;

      const keyboard = [[
        {
          text: '📸 View Images',
          callback_data: `images_${property.id}`
        }
      ]];

      await this.bot.sendMessage(chatId, details, {
        reply_markup: {
          inline_keyboard: keyboard
        },
        parse_mode: 'Markdown'
      });

      await this.logChatHistory(telegramUserId, `View details: ${propertyId}`, details);
      
    } catch (error) {
      console.error('Error showing property details:', error);
      await this.sendMessage(chatId, 'Error retrieving property details.');
    }
  }

  // Show property images
  private async showPropertyImages(chatId: number, telegramUserId: string, propertyId: string): Promise<void> {
    try {
      const property = await prisma.property.findUnique({
        where: { id: propertyId }
      });

      if (!property) {
        await this.sendMessage(chatId, 'Property not found.');
        return;
      }

      const images = Array.isArray(property.images) ? property.images : [];
      
      if (images.length === 0) {
        await this.sendMessage(chatId, 'No images available for this property.');
        return;
      }

      await this.sendMessage(chatId, `📸 Sending ${images.length} images for this property...`);

      // Send each image
      for (let i = 0; i < images.length; i++) {
        try {
          const imageData = images[i];
          
          // Convert base64 to buffer if needed
          let imageBuffer;
          if (typeof imageData === 'string' && imageData.startsWith('data:image/')) {
            // Remove data URL prefix
            const base64Data = imageData.split(',')[1];
            imageBuffer = Buffer.from(base64Data, 'base64');
          } else if (typeof imageData === 'string') {
            imageBuffer = Buffer.from(imageData, 'base64');
          } else {
            continue; // Skip invalid image data
          }

          await this.bot.sendPhoto(chatId, imageBuffer, {
            caption: `🏠 Property Image ${i + 1}/${images.length}\n📍 ${property.location}`
          });
          
          // Small delay between images
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (imageError) {
          console.error(`Error sending image ${i + 1}:`, imageError);
          await this.sendMessage(chatId, `❌ Could not load image ${i + 1}`);
        }
      }

      const response = `✅ Sent ${images.length} images for the property in ${property.location}.

Interested in this property? 
Reply with your contact number for quick follow-up!`;

      await this.sendMessage(chatId, response);
      await this.logChatHistory(telegramUserId, `View images: ${propertyId}`, response);

      // Mark as high intent if viewing images
      await this.updateLeadStatus(telegramUserId, 'HIGH', 'Viewed property images - High interest');
      
    } catch (error) {
      console.error('Error showing property images:', error);
      await this.sendMessage(chatId, 'Error retrieving property images.');
    }
  }

  // Update lead status
  private async updateLeadStatus(telegramUserId: string, status: 'HIGH' | 'MEDIUM' | 'NOT_QUALIFIED', activity?: string): Promise<void> {
    try {
      await prisma.lead.updateMany({
        where: { telegramUserId },
        data: { status }
      });

      if (activity) {
        const lead = await prisma.lead.findFirst({ where: { telegramUserId } });
        if (lead) {
          await prisma.followUp.create({
            data: {
              leadId: lead.id,
              activity,
              status: 'PENDING'
            }
          });
        }
      }
    } catch (error) {
      console.error('Error updating lead status:', error);
    }
  }

  private analyzeIntent(userMessage: string, botResponse: string) {
    const msg = userMessage.toLowerCase();
    
    // Extract phone number if present
    const phoneMatch = userMessage.match(/\+?[\d\s\-\(\)]{8,}/);
    const phoneNumber = phoneMatch ? phoneMatch[0].replace(/\s/g, '') : undefined;
    
    // Extract budget if present
    const budgetMatch = userMessage.match(/\$[\d,]+|\d+\s*(?:usd|dollar|k)|₹[\d,]+/i);
    const budget = budgetMatch ? budgetMatch[0] : undefined;
    
    // High intent indicators
    if (/visit|schedule|appointment|meet|see property|buy now|ready to buy|images|photos|contact|interested in this|want this property/i.test(msg) || phoneNumber) {
      return {
        status: 'HIGH' as const,
        phoneNumber,
        budget,
        expectations: userMessage,
        followUpActivity: /visit|schedule|appointment/.test(msg) ? 'Property Visit Requested' : 
                         /images|photos/.test(msg) ? 'Viewed Property Images' : 'High Intent Lead'
      };
    }
    
    // Medium intent indicators
    if (/budget|price|cost|looking for|interested|want to|need|invest|properties|property|location|area|search/i.test(msg)) {
      return {
        status: 'MEDIUM' as const,
        phoneNumber,
        budget,
        expectations: userMessage,
        followUpActivity: undefined
      };
    }
    
    // Low/No qualification
    return {
      status: 'NOT_QUALIFIED' as const,
      phoneNumber: undefined,
      budget: undefined,
      expectations: undefined,
      followUpActivity: undefined
    };
  }

  public async sendMessage(chatId: number, text: string): Promise<void> {
    if (!this.bot) {
      console.warn('Cannot send message: Telegram bot not initialized');
      return;
    }
    
    try {
      await this.bot.sendMessage(chatId, text);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }

  public startBot(): void {
    if (!this.bot) {
      console.log('🤖 Telegram bot disabled (no token provided)');
      return;
    }
    
    try {
      this.bot.startPolling();
      console.log('🤖 Telegram bot started successfully');
    } catch (error) {
      console.error('Failed to start Telegram bot:', error);
    }
  }

  // Send property images by property number
  private async sendPropertyImages(chatId: number, telegramUserId: string, propertyNumber: number): Promise<void> {
    try {
      // Get all active properties (in the order they would be shown)
      const properties = await prisma.property.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      if (properties.length === 0) {
        await this.sendMessage(chatId, 'No properties available to show images for.');
        return;
      }

      if (propertyNumber > properties.length || propertyNumber < 1) {
        await this.sendMessage(chatId, `Property ${propertyNumber} not found. Please choose a number between 1 and ${properties.length}.`);
        return;
      }

      const property = properties[propertyNumber - 1];
      
      // Log what we're about to send
      console.log(`Sending images for property ${property.id}, Location: ${property.location}`);
      
      await this.showPropertyImages(chatId, telegramUserId, property.id);

    } catch (error) {
      console.error('Error sending property images:', error);
      await this.sendMessage(chatId, 'Error retrieving property images.');
    }
  }

  public stopBot(): void {
    this.bot.stopPolling();
    console.log('🤖 Telegram bot stopped');
  }
}

export const telegramService = new TelegramBotServiceImpl();
